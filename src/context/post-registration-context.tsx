// usePostRegistration.ts
import { useTrokkFiles } from './trokk-files-context.tsx';
import { invoke } from '@tauri-apps/api/core';
import { TextInputDto } from '../model/text-input-dto.ts';
import { RegistrationFormProps } from '../features/registration/registration-form-props.tsx';
import { TextItemResponse } from '../model/text-input-response.ts';
import { settings } from '../tauri-store/setting-store.ts';
import { useMessage } from './message-context.tsx';
import { useUploadProgress } from './upload-progress-context.tsx';
import { AuthContextType } from './auth-context.tsx';
import {uploadToS3} from '../features/registration/upload-to-s3.tsx';

export function usePostRegistration() {
    const { state } = useTrokkFiles();
    const { handleError, clearError, displaySuccessMessage } = useMessage();
    const { setAllUploadProgress } = useUploadProgress();

    const postRegistration = async (
        machineName: string,
        registration: RegistrationFormProps,
        papiPath: string,
        id: string,
        auth: AuthContextType
    ) => {
        const loggedOut = auth?.loggedOut;

        if (!state.current?.path) return;
        const pushedDir = state.current.path;
        const authResp = await settings.getAuthResponse();
        if (!authResp || loggedOut) return Promise.reject('Not logged in');

        const transfer = uploadToS3(id, registration, state).catch(error => {
            handleError('Fikk ikke lastet opp filene', undefined, error);
            return Promise.reject(error);
        });

        const numberOfPagesTransferred = await transfer;

        const accessToken = await invoke('get_papi_access_token').catch(error => {
            handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.', undefined, error);
            return Promise.reject(error);
        });

        const deleteDir = async (path: string): Promise<void> => {
            return invoke('delete_dir', { dir: path });
        };

        const body = new TextInputDto(
            id,
            registration.materialType,
            authResp.userInfo.name,
            registration.font,
            registration.language,
            machineName,
            registration.workingTitle,
            numberOfPagesTransferred
        );

        await body.setVersion();

        return await fetch(`${papiPath}/v2/item`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
            .then(async response => {
                if (response.ok) {
                    void deleteDir(pushedDir);
                    clearError();
                    displaySuccessMessage(await response.json() as TextItemResponse);
                } else {
                    const status = response.status;
                    const messages: Record<number, string> = {
                        401: 'Du er ikke logget inn eller tilgangstokenet er utløpt',
                        403: 'Du har ikke tilgang til å registrere dette objektet',
                        409: 'Objektet finnes allerede i databasen',
                        500: 'Serverfeil ved lagring av objektet'
                    };
                    handleError(messages[status] || 'Ukjent feil ved lagring av objektet', status);
                }

                setAllUploadProgress(progress => {
                    delete progress.dir[pushedDir];
                    return progress;
                });
            })
            .catch(error => {
                handleError('Nettverksfeil ved lagring av objektet');
                return Promise.reject(error);
            });
    };

    return { postRegistration };
}
