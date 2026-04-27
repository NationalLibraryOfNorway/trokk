// usePostRegistration.ts
import {useTrokkFiles} from './trokk-files-context.tsx';
import {invoke} from '@tauri-apps/api/core';
import {RegistrationFormProps} from '../features/registration/registration-form-props.tsx';
import {settings} from '../tauri-store/setting-store.ts';
import {useMessage} from './message-context.tsx';
import {useUploadProgress} from './upload-progress-context.tsx';
import {useAuth} from './auth-context.tsx';
import {uploadToS3} from '../features/registration/upload-to-s3.tsx';
import {useSecrets} from './secret-context.tsx';
import {useVersion} from './version-context.tsx';
import {useSelection} from '../context/selection-context.tsx';
import {uuidv7} from 'uuidv7';
import {FileTree} from '@/model/file-tree.ts';
import {fetch as tauriFetch} from '@tauri-apps/plugin-http';
import {BatchTextInputDto} from '../model/batch-text-input-dto.ts';
import {TextItemResponse} from '../model/text-input-response.ts';
import {remove} from '@tauri-apps/plugin-fs';
import {AllTransferProgress} from '@/model/transfer-progress.ts';
import * as Sentry from '@sentry/react';
import {getErrorDiagnostics, getErrorMessage, type ErrorDiagnostics} from '@/lib/utils.ts';

export function deleteDirFromProgressState(
    progress: AllTransferProgress,
    pushedDir: string
): AllTransferProgress {
    const newDir = { ...progress.dir };

    delete newDir[pushedDir];

    if (pushedDir.endsWith('/merge')) {
        const parentDir = pushedDir.replace(/\/merge$/, '');
        delete newDir[parentDir];
    }

    return {
        ...progress,
        dir: newDir
    };
}

export function groupFilesByCheckedItems(
    allFilesInFolder: FileTree[],
    checkedItems: string[]
): Map<string, {
    primary: string[],
    access: string[]
}> {
    const batchMap = new Map<string, {
        primary: string[],
        access: string[]
    }>();
    let objectId: string | null = null;
    for (const file of allFilesInFolder) {
        if (!file) continue;
        if (checkedItems.includes(file.path)) {
            objectId = uuidv7().toString();
            batchMap.set(
                objectId, {
                    primary: [],
                    access: []
                });
        }

        if (!objectId) continue;
        const batch = batchMap.get(objectId);
        if (!batch) continue;

        const isMergeFile = file.path.includes('/merge/')

        if(isMergeFile){
            //Merge files goes into access
            const primaryPath = file.path.replace('/merge/', '/');
            batch.access.push(file.path);
            batch.primary.push(primaryPath);
        } else {
            //Regular files goes into primary
            batch.primary.push(file.path)
        }
    }
    return batchMap;
}

const API_ERROR_MESSAGES: Record<number, string> = {
    401: 'Kunne ikke lagre objektet fordi innloggingen ikke lenger er gyldig.',
    403: 'Kunne ikke lagre objektet fordi du ikke har tilgang.',
    409: 'Kunne ikke lagre objektet fordi objektet allerede finnes.',
    500: 'Kunne ikke lagre objektet på grunn av en serverfeil.',
};

const stringifyDiagnostic = (value: unknown): string | undefined => {
    if (value == null) {
        return undefined;
    }

    if (typeof value === 'string') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return getErrorMessage(value);
    }
};

const getApiErrorDiagnostics = async (response: Response): Promise<ErrorDiagnostics> => {
    const logs: string[] = [];

    if (response.statusText) {
        logs.push(`statusText=${response.statusText}`);
    }

    try {
        const payload = await response.json();
        const payloadText = stringifyDiagnostic(payload);
        if (payloadText) {
            logs.push(payloadText);
            return {
                detail: payloadText,
                logs,
            };
        }
    } catch {
        // Ignore parse failures and fall back to status text.
    }

    return {
        detail: response.statusText || `HTTP ${response.status}`,
        logs,
    };
};

async function handleApiResponse(
    response: Response,
    clearError: () => void,
    displaySuccessMessage: (item: TextItemResponse) => void,
    handleBackendError: (input: {
        message?: string;
        fallbackMessage: string;
        code?: string | number;
        detail?: string;
        stackTrace?: string;
        logs?: string[];
    }) => void,
    pushedDir: string,
    deleteDirFromProgress: () => void,
    removePath: (path: string) => void
) {
    const isSuccessfulResponse = response.ok || (response.status >= 200 && response.status < 300);

    if (isSuccessfulResponse) {
        clearError();
        console.debug('Deleting directory:', pushedDir);
        await remove(pushedDir, {recursive: true});
        removePath(pushedDir);
        deleteDirFromProgress();

        if (pushedDir.endsWith('/merge')) {
            const parentDir = pushedDir.replace(/\/merge$/, '');
            console.debug('Deleting parent directory:', parentDir);
            await remove(parentDir, {recursive: true});
            removePath(parentDir);
        }

        const items: TextItemResponse[] = await response.json();
        items.forEach(displaySuccessMessage);
    } else {
        const diagnostics = await getApiErrorDiagnostics(response);
        handleBackendError({
            message: API_ERROR_MESSAGES[response.status] ?? 'Kunne ikke lagre objektet.',
            fallbackMessage: 'Kunne ikke lagre objektet.',
            code: response.status,
            detail: diagnostics.detail,
            stackTrace: diagnostics.stackTrace,
            logs: diagnostics.logs,
        });
    }
}

export function usePostRegistration() {
    const {state, dispatch} = useTrokkFiles();
    const {secrets} = useSecrets();
    const {uploadVersionBlocking} = useVersion();
    const auth = useAuth();
    const {handleError, handleBackendError, clearError, displaySuccessMessage} = useMessage();
    const {setAllUploadProgress} = useUploadProgress();
    const {checkedItems} = useSelection();

    async function postRegistration(
        machineName: string,
        registration: RegistrationFormProps
    ) {
        if (uploadVersionBlocking) {
            handleError('Ny versjon kreves før opplasting. Oppdater appen og prøv igjen.');
            return Promise.reject('Version blocked');
        }

        const papiPath = secrets?.papiPath;
        const loggedOut = auth?.loggedOut;

        if (!state.current?.path) {
            return;
        }
        const pushedDir = state.current.path;
        const authResp = await settings.getAuthResponse();
        if (!authResp || loggedOut) {
            handleError('Du må logge inn før du kan TRØKKE.');
            return Promise.reject('Not logged in');
        }

        const batchMap = groupFilesByCheckedItems(
            state.current?.children ?? [],
            checkedItems
        );

        await uploadToS3(registration, batchMap);
        const itemIdToCountOfItems = new Map<string, number>();
        for (const [itemId, pages] of batchMap.entries()) {
            const totalItems = pages.access.length;
            itemIdToCountOfItems.set(itemId, totalItems);
        }

        const itemsArray = Array.from(itemIdToCountOfItems.entries()).map(([itemId, pages]) => ({ itemId, pages }));

        const body = new BatchTextInputDto(
            checkedItems.length > 1 ? uuidv7().toString() : null, //Adding batchId only for multiple objects
            itemsArray,
            registration.materialType,
            authResp.userInfo.name,
            registration.font,
            registration.language,
            machineName,
            registration.workingTitle
        );
        await body.setVersion();

        try {
            Sentry.addBreadcrumb({
                category: 'papi',
                message: 'Creating batch of items in Papi',
                level: 'info',
            });
            const accessToken = await invoke('get_papi_access_token').catch(error => {
                const diagnostics = getErrorDiagnostics(error);
                handleBackendError({
                    message: 'Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.',
                    fallbackMessage: 'Kunne ikke lagre objektet i databasen.',
                    detail: diagnostics.detail,
                    stackTrace: diagnostics.stackTrace,
                    logs: diagnostics.logs,
                });
                return Promise.reject(error);
            });
            const response = await tauriFetch(`${papiPath}/v2/item/batch`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            Sentry.captureMessage('Successfully created batch of items in Papi')

            const deleteDirFromProgress = () =>
                setAllUploadProgress(progress =>
                    deleteDirFromProgressState(progress, pushedDir)
                );

            const removePath = (path: string) => {
                dispatch({type: 'REMOVE_FOLDER_PATH', payload: path});
            };

            await handleApiResponse(
                response,
                clearError,
                displaySuccessMessage,
                handleBackendError,
                pushedDir,
                deleteDirFromProgress,
                removePath
            );

        } catch (error) {
            const diagnostics = getErrorDiagnostics(error);
            handleBackendError({
                message: 'Nettverksfeil ved lagring av objektet.',
                fallbackMessage: 'Kunne ikke lagre objektet.',
                detail: diagnostics.detail,
                stackTrace: diagnostics.stackTrace,
                logs: diagnostics.logs,
            });
            console.error(error);
        }
    }

    return {postRegistration};
}
