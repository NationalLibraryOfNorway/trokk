import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TextItemResponse } from '../model/text-input-response.ts';
import { useTransferLog } from './transfer-log-context.tsx';
import {createStoredError, StoredError, truncateErrorLogEntries} from '@/model/error-log-entry.ts';
import {settings} from '@/tauri-store/setting-store.ts';

export type BackendErrorInput = {
    message?: string;
    fallbackMessage: string;
    code?: string | number;
    detail?: string;
    stackTrace?: string;
    logs?: string[];
};

export type FrontendErrorInput = {
    message?: string;
    fallbackMessage: string;
    code?: string | number;
    detail?: string;
    stackTrace?: string;
    logs?: string[];
};

type MessageContextType = {
    errorMessage: string | null;
    successMessage: string | null;
    currentError: StoredError | null;
    errorLogEntries: StoredError[];
    isErrorModalOpen: boolean;
    handleError: (extra_text?: string, code?: string | number, error?: string) => void;
    handleFrontendError: (input: FrontendErrorInput) => void;
    handleBackendError: (input: BackendErrorInput) => void;
    dismissErrorModal: () => void;
    removeMessages: () => void;
    clearError: () => void;
    handleSuccessMessage: (message: string) => void;
    displaySuccessMessage: (item: TextItemResponse) => void;
};

export const MessageContext = createContext<MessageContextType | undefined>(undefined);

const SENSITIVE_KEY_PATTERNS = [
    'authorization',
    'access[_ -]?token',
    'refresh[_ -]?token',
    'token',
    'secret',
    'password',
];

const sanitizeSensitiveText = (value: string): string => {
    let sanitizedValue = value;

    for (const keyPattern of SENSITIVE_KEY_PATTERNS) {
        sanitizedValue = sanitizedValue.replace(
            new RegExp(`(${keyPattern})\\s*[:=]\\s*([^\\s,;]+)`, 'gi'),
            '$1=[REDACTED]'
        );
        sanitizedValue = sanitizedValue.replace(
            new RegExp(`("${keyPattern}")\\s*:\\s*"[^"]*"`, 'gi'),
            '$1:"[REDACTED]"'
        );
    }

    return sanitizedValue;
};

const normalizeText = (value?: string): string | undefined => {
    if (!value) return undefined;

    const trimmedValue = sanitizeSensitiveText(value).trim();
    return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const normalizeLogs = (logs?: string[]): string[] => {
    if (!logs) return [];

    return logs
        .map((log) => normalizeText(log))
        .filter((log): log is string => Boolean(log));
};

const formatReadableMessage = (message: string, code?: string | number): string => {
    return code ? `${message} (Feilkode ${code})` : message;
};

const buildStructuredError = (
    input: FrontendErrorInput | BackendErrorInput,
    source: 'frontend' | 'backend'
): Omit<StoredError, 'id' | 'occurredAt'> => {
    const baseMessage = normalizeText(input.message) ?? normalizeText(input.fallbackMessage) ?? 'Ukjent feil';
    const readableMessage = formatReadableMessage(baseMessage, input.code);

    console.error(readableMessage, {
        detail: input.detail,
        stackTrace: input.stackTrace,
        logs: input.logs,
    });

    return {
        userMessage: readableMessage,
        code: input.code,
        detail: normalizeText(input.detail),
        stackTrace: normalizeText(input.stackTrace),
        logs: normalizeLogs(input.logs),
        source,
    };
};

export const MessageProvider = ({ children }: { children: ReactNode }) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [currentError, setCurrentError] = useState<StoredError | null>(null);
    const [errorLogEntries, setErrorLogEntries] = useState<StoredError[]>([]);
    const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
    const { addLog } = useTransferLog();

    useEffect(() => {
        let isMounted = true;

        void settings.getErrorLogEntries().then((entries) => {
            if (isMounted) {
                setErrorLogEntries((previousEntries) => previousEntries.length > 0 ? previousEntries : entries);
            }
        });

        return () => {
            isMounted = false;
        };
    }, []);

    const persistRetainedError = (error: StoredError) => {
        setErrorLogEntries((previousEntries) => {
            const nextEntries = truncateErrorLogEntries([error, ...previousEntries]);
            void settings.setErrorLogEntries(nextEntries);
            return nextEntries;
        });
    };

    const setActiveError = (error: Omit<StoredError, 'id' | 'occurredAt'>) => {
        const nextError = createStoredError(error);

        persistRetainedError(nextError);
        setIsErrorModalOpen(true);
        setCurrentError(nextError);
        setErrorMessage(nextError.userMessage);
        setSuccessMessage(null);
    };

    const dismissErrorModal = () => {
        setIsErrorModalOpen(false);
        setErrorMessage(null);
        setCurrentError(null);
    };

    const clearActiveError = () => {
        dismissErrorModal();
        setErrorMessage(null);
        setCurrentError(null);
    };

    const handleError = (extra_text?: string, code?: string | number, error?: string | undefined) => {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.\n';
        if (extra_text) tmpErrorMessage += `${extra_text} \n`;
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer. \n ';
        const readableMessage = formatReadableMessage(tmpErrorMessage, code);

        console.error(readableMessage, error);
        setActiveError({
            userMessage: readableMessage,
            code,
            detail: error == null ? undefined : normalizeText(String(error)),
            logs: [],
            source: 'frontend',
        });
    };

    const handleFrontendError = (input: FrontendErrorInput) => {
        setActiveError(buildStructuredError(input, 'frontend'));
    };

    const handleBackendError = (input: BackendErrorInput) => {
        setActiveError(buildStructuredError(input, 'backend'));
    };

    const handleSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        clearActiveError();
    };

    const displaySuccessMessage = (item: TextItemResponse) => {
        handleSuccessMessage('Suksess!');

        const parsedItem = new TextItemResponse(
            item.id,
            item.batchId,
            item.materialType,
            item.publicationType,
            item.scanInformation,
            item.statistics
        );
        addLog(parsedItem.toTransferLogItem());
    }

    const removeMessages = () => {
        clearActiveError();
        setSuccessMessage(null);
    };
    
    const clearError = () => {
        clearActiveError();
    };

    return (
        <MessageContext.Provider value={{
            errorMessage,
            successMessage,
            currentError,
            errorLogEntries,
            isErrorModalOpen,
            handleError,
            handleFrontendError,
            handleBackendError,
            dismissErrorModal,
            handleSuccessMessage,
            displaySuccessMessage,
            removeMessages,
            clearError
        }}>
            {children}
        </MessageContext.Provider>
    );
};

export const useMessage = (): MessageContextType => {
    const context = useContext(MessageContext);
    if (!context) throw new Error('useMessage must be used within a MessageProvider');
    return context;
};
