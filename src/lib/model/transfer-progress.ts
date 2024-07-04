export interface AllTransferProgress {
    dir: Record<string, TransferProgress>;
}

export interface TransferProgress {
    directory: string;
    pageNr: number;
    totalPages: number;
}

export const calculateProgress = (progress: TransferProgress): string => {
    return ((progress.pageNr / progress.totalPages) * 100).toFixed(0) + '%';
};
