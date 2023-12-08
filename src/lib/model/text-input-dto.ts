export class TextInputDto {
    id?: string;
    materialType?: string;
    font?: string;
    language?: string;
    createdBy?: string;
    scanner?: string;
    fileSize?: BigInt;
    workingTitle?: string;

    constructor(
        materialType: string,
        font: string,
        language: string,
        createdBy: string,
        scanner: string,
        fileSize: BigInt,
        workingTitle?: string,
        id?: string
    ) {
        this.id = id;
        this.materialType = materialType;
        this.font = font;
        this.language = language;
        this.createdBy = createdBy;
        this.scanner = scanner;
        this.fileSize = fileSize;
        this.workingTitle = workingTitle;
    }
}
