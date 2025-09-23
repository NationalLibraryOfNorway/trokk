import {getMaterialTypeAsKeyString, MaterialType, PublicationType} from './registration-enums.ts';
import {getVersion} from '@tauri-apps/api/app';

export class BatchTextInputDto {
    batchIds: string[];
    materialType: string;
    publicationType: PublicationType;
    username: string;
    digital: boolean;
    font: string;
    language: string;
    application: string;
    machineName: string;
    workName: string;
    transferPageArray: number[];

    constructor(
        batchIds: string[],
        materialType: MaterialType,
        username: string,
        font: string,
        language: string,
        machineName: string,
        workName: string,
        transferPageArray: number[]
    ) {
        this.batchIds = batchIds;
        this.materialType = getMaterialTypeAsKeyString(materialType);
        this.publicationType = this.publicationTypeFromMaterialType(materialType);
        this.username = username;
        this.digital = false;
        this.font = font;
        this.language = language;
        this.application = 'Trøkk';
        this.machineName = machineName;
        this.workName = workName;
        this.transferPageArray = transferPageArray;
    }

    publicationTypeFromMaterialType(materialType: MaterialType): PublicationType {
        switch (materialType) {
            case MaterialType.PERIODICAL:
            case MaterialType.NEWSPAPER:
                return PublicationType.PERIODICAL;
            default:
                return PublicationType.MONOGRAPHIC;
        }
    }

    async setVersion(): Promise<void> {
        try {
            this.application = 'Trøkk ' + await getVersion();
        } catch (error) {
            console.error('Failed to set version:', error);
        }
    }
}