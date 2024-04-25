export interface Thumbnail {
    path: string;
    name: string;
    imageSource: string;
}

export interface ConversionResult {
    converted: number;
    alreadyConverted: number;
}