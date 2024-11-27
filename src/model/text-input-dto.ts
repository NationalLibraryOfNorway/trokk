import {getMaterialTypeAsKeyString, MaterialType, PublicationType} from "./registration-enums.ts";
import {getVersion} from "@tauri-apps/api/app";

export class TextInputDto {
    id: string;
    materialType: string;
    publicationType: PublicationType;
    username: string;
    digital: boolean;
    font: string;
    language: string;
    application: string;
    machineName: string;
    workName: string;
    numberOfPages: number;

    constructor(
        id: string,
        materialType: MaterialType,
        username: string,
        font: string,
        language: string,
        machineName: string,
        workName: string,
        numberOfPages: number
    ) {
        this.id = id;
        this.materialType = getMaterialTypeAsKeyString(materialType);
        this.publicationType = this.publicationTypeFromMaterialType(materialType);
        this.username = username;
        this.digital = false
        this.font = font;
        this.language = language;
        this.application = "Trøkk " + getVersion();
        this.machineName = machineName;
        this.workName = workName;
        this.numberOfPages = numberOfPages;
    }

    publicationTypeFromMaterialType(materialType: MaterialType): PublicationType {
        switch (materialType) {
            case MaterialType.PERIODICAL:
            case MaterialType.NEWSPAPER:
                return PublicationType.PERIODICAL
            default:
                return PublicationType.MONOGRAPHIC
        }
    }
}