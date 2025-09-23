import {RegistrationFormProps} from './registration-form-props.tsx';
import {invoke} from '@tauri-apps/api/core';
import {getMaterialTypeAsKeyString} from '../../model/registration-enums.ts';

export async function uploadToS3(
    registration: RegistrationFormProps,
    batches: string[][],
    batchIds: string[]
): Promise<number[]> {
    const materialType = getMaterialTypeAsKeyString(registration.materialType);

    const uploadedCounts: number[] = await invoke('upload_batches_to_s3', {
        batches,
        batchIds,
        materialType,
    });

    return uploadedCounts;
}