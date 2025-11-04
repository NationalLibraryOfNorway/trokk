import { MaterialType } from '@/model/registration-enums.ts';

export type RegistrationFormProps = {
    materialType: MaterialType,
    font: 'ANTIQUA' | 'FRAKTUR',
    language: 'NOB' | 'SME',
    workingTitle: string,
}
