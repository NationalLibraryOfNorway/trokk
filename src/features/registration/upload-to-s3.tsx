import {RegistrationFormProps} from './registration-form-props.tsx';
import {invoke} from '@tauri-apps/api/core';
import {getMaterialTypeAsKeyString} from '@/model/registration-enums.ts';

export async function uploadToS3(
    registration: RegistrationFormProps,
    batchMap: Map<string, {
        primary: string[],
        access: string[]
    }>
): Promise<number[]> {
    const materialType = getMaterialTypeAsKeyString(registration.materialType);

    return await invoke('upload_batch_to_s3', {
        batchMap,
        materialType,
    });
}
