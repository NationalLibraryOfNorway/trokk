import {RegistrationFormProps} from './registration-form-props.tsx';
import {TrokkFilesState} from '../../context/trokk-files-context.tsx';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import {settings} from '../../tauri-store/setting-store.ts';
import {invoke} from '@tauri-apps/api/core';
import {getMaterialTypeAsKeyString} from '../../model/registration-enums.ts';

export async function uploadToS3 (id: string, registration: RegistrationFormProps, state: TrokkFilesState): Promise<number> {
    const appWindow = getCurrentWebviewWindow();
    const filesPath = await settings.getScannerPath();
    if (filesPath === state.current?.path) {
        return Promise.reject('Cannot move files from scanner dir');
    }

    return invoke('upload_directory_to_s3', {
        directoryPath: state.current!.path,
        objectId: id,
        materialType: getMaterialTypeAsKeyString(registration.materialType),
        appWindow: appWindow
    });
}