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

function groupFilesByCheckedItems(
    allFilesInFolder: FileTree[],
    checkedItems: string[]
): Map<string, string[]> {
    const batchMap = new Map<string, string[]>();
    let objectId: string = '';

    for (const file of allFilesInFolder) {
        if (!file) continue;
        if (checkedItems.includes(file.path)) {
            objectId = uuidv7().toString();
            batchMap.set(
                objectId,
                [file.path]
            )
        } else {
            if (batchMap.get(objectId) !== undefined) batchMap.get(objectId)!.push(file.path);
        }
    }
    return batchMap;
}

async function handleApiResponse(
    response: Response,
    clearError: () => void,
    displaySuccessMessage: (item: TextItemResponse) => void,
    handleError: (message: string) => void,
    pushedDir: string,
    deleteDirFromProgress: () => void,
    removePath: (path: string) => void,
) {
    if (response.status >= 200 && response.status < 300) {
        clearError();
        console.debug('Deleting directory:', pushedDir);
        await remove(pushedDir, {recursive: true});
        removePath(pushedDir);
        deleteDirFromProgress();
        const items: TextItemResponse[] = await response.json();
        items.forEach(displaySuccessMessage);
    } else {
        const messages: Record<number, string> = {
            401: 'Not logged in or token expired',
            403: 'No access to register this object',
            409: 'Object already exists',
            500: 'Server error while saving object'
        };
        handleError(messages[response.status] || 'Unknown error: ' + response.status);
    }
}

export function usePostRegistration() {
    const {state, dispatch} = useTrokkFiles();
    const {secrets} = useSecrets();
    const {uploadVersionBlocking} = useVersion();
    const auth = useAuth();
    const {handleError, clearError, displaySuccessMessage} = useMessage();
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
        if (!authResp || loggedOut) return Promise.reject('Not logged in');

        const batchMap = groupFilesByCheckedItems(
            state.current?.children ?? [],
            checkedItems
        );

        const accessToken = await invoke('get_papi_access_token').catch(error => {
            handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.', undefined, error);
            return Promise.reject(error);
        });

        await uploadToS3(registration, batchMap);
        const itemIdToCountOfItems = new Map<string, number>();
        for (const [batchId, pages] of batchMap.entries()) {
            itemIdToCountOfItems.set(batchId, pages.length);
        }

        const body = new BatchTextInputDto(
            checkedItems.length > 1 ? uuidv7().toString() : null, //Adding batchId only for multiple objects
            Object.fromEntries(itemIdToCountOfItems),
            registration.materialType,
            authResp.userInfo.name,
            registration.font,
            registration.language,
            machineName,
            registration.workingTitle
        );
        await body.setVersion();

        try {
            const response = await tauriFetch(`${papiPath}/v2/item/batch`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const deleteDirFromProgress = () => setAllUploadProgress(progress => {
                delete progress.dir[pushedDir];
                return progress;
            });

            const removePath = (path: string) => {
                dispatch({ type: 'REMOVE_FOLDER_PATH', payload: path });
            };

            await handleApiResponse(response, clearError, displaySuccessMessage, handleError, pushedDir, deleteDirFromProgress, removePath);

        } catch (error) {
            handleError('Nettverksfeil ved lagring av objektet');
            console.error(error);
        }
    }

    return {postRegistration};
}
