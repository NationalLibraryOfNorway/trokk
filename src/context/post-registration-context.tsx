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
import {useSelection} from '../context/selection-context.tsx';
import {uuidv7} from 'uuidv7';
import {FileTree} from '@/model/file-tree.ts';
import {fetch} from '@tauri-apps/plugin-http';
import {BatchTextInputDto} from '../model/batch-text-input-dto.ts';
import {TextItemResponse} from '../model/text-input-response.ts';

function groupFilesByCheckedItems(
    allFilesInFolder: FileTree[],
    checkedItems: string[]
): [string[][], string[]] {
    const batches: string[][] = [];
    const batchIds: string[] = [];
    let fileBatch: string[] = [];

    for (const file of allFilesInFolder) {
        if (!file) continue;
        if (checkedItems.includes(file.path) && fileBatch.length > 0) {
            batches.push(fileBatch);
            batchIds.push(uuidv7().toString());
            fileBatch = [];
        }
        if (file.isFile) {
            fileBatch.push(file.path);
        }
    }
    if (fileBatch.length > 0) {
        batches.push(fileBatch);
        batchIds.push(uuidv7().toString());
    }
    return [batches, batchIds];
}

function handleApiResponse(
    response: Response,
    clearError: () => void,
    displaySuccessMessage: (item: TextItemResponse) => void,
    handleError: (message:string) => void
) {
    if (response.status >= 200 && response.status < 300) {
        clearError();
        return response.json().then(displaySuccessMessage);
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
    const {state} = useTrokkFiles();
    const {secrets} = useSecrets();
    const auth = useAuth();
    const {handleError, clearError, displaySuccessMessage} = useMessage();
    const {setAllUploadProgress} = useUploadProgress();
    const {checkedItems} = useSelection();

    async function postRegistration(
        machineName: string,
        registration: RegistrationFormProps
    ) {
        const papiPath = secrets?.papiPath;
        const loggedOut = auth?.loggedOut;

        if (!state.current?.path) return;
        const pushedDir = state.current.path;
        const authResp = await settings.getAuthResponse();
        if (!authResp || loggedOut) return Promise.reject('Not logged in');

        const [batches, batchIds] = groupFilesByCheckedItems(
            state.current?.children ?? [],
            checkedItems
        );

        const accessToken = await invoke('get_papi_access_token').catch(error => {
            handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.', undefined, error);
            return Promise.reject(error);
        });

        const deleteDir = async (path: string): Promise<void> => {
            return invoke('delete_dir', {dir: path});
        };

        const transferPageArray = await uploadToS3(registration, batches, batchIds);

        const body = new BatchTextInputDto(
            batchIds,
            registration.materialType,
            authResp.userInfo.name,
            registration.font,
            registration.language,
            machineName,
            registration.workingTitle,
            transferPageArray
        );

        await body.setVersion();

        try {
            const response = await fetch(`${papiPath}/v2/item/batch`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            await handleApiResponse(response, clearError, displaySuccessMessage, handleError);

            setAllUploadProgress(progress => {
                delete progress.dir[pushedDir];
                return progress;
            });
        } catch (error) {
            handleError('Nettverksfeil ved lagring av objektet');
            console.error(error);
        }
        await deleteDir(pushedDir);
    }

    return {postRegistration};
}
