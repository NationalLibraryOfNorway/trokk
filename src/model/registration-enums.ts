// noinspection JSUnusedGlobalSymbols
export enum MaterialType {
    NEWSPAPER = 'Avis',
    MAP = 'Kart',
    MANUSCRIPT = 'Manuskript',
    MONOGRAPH = 'Monografi',
    PUBLIC_DOCUMENT = 'Offentlig dokument',
    EPHEMERA = 'Småtrykk',
    PERIODICAL = 'Tidsskrift',
}

export const getMaterialTypeAsKeyString = (materialType: MaterialType): string => {
    const materialString = Object.keys(MaterialType).find((key: string) => MaterialType[key as keyof typeof MaterialType] === materialType);
    if (materialString === undefined) {
        console.error('MaterialType not found');
        throw new Error('MaterialType not found');
    } else {
        return materialString;
    }
};

export enum PublicationType {
    PERIODICAL,
    MONOGRAPHIC
}