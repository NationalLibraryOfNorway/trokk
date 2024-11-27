import {MaterialType, PublicationType} from "./registration-enums.ts";
import {TransferLogItem} from "./transfer-log-item.ts";

export class TextItemResponse {
    id: string;
    materialType: MaterialType;
    publicationType: PublicationType;
    scanInformation: ScanInformation;
    statistics: Statistics;

    constructor(
        id: string,
        materialType: MaterialType,
        publicationType: PublicationType,
        scanInformation: ScanInformation,
        statistics: Statistics
    ) {
        this.id = id;
        this.materialType = materialType;
        this.publicationType = publicationType;
        this.scanInformation = scanInformation;
        this.statistics = statistics;
    }

    public toTransferLogItem(): TransferLogItem {
        return {
            timestamp: new Date(),
            workName: this.scanInformation.tempName,
            pages: parseInt(this.statistics.numberOfPages),
            uuid: this.id
        }
    }
}

interface ScanInformation {
    id: string,
    tempName: string
}

interface Statistics {
    id: string,
    numberOfPages: string
}