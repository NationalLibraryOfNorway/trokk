export type ErrorSource = 'frontend' | 'backend';

export const MAX_ERROR_LOG_ENTRIES = 100;

export type StoredError = {
    id: string;
    occurredAt: string;
    userMessage: string;
    code?: string | number;
    detail?: string;
    stackTrace?: string;
    logs: string[];
    source: ErrorSource;
};

export const hasAdvancedErrorDetails = (error: Pick<StoredError, 'detail' | 'stackTrace' | 'logs'>): boolean => {
    return Boolean(error.detail || error.stackTrace || error.logs.length > 0);
};

export const truncateErrorLogEntries = (entries: StoredError[]): StoredError[] => {
    return entries.slice(0, MAX_ERROR_LOG_ENTRIES);
};

const createErrorId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createStoredError = (error: Omit<StoredError, 'id' | 'occurredAt'>): StoredError => {
    return {
        ...error,
        id: createErrorId(),
        occurredAt: new Date().toISOString(),
    };
};
