import { createContext, useContext, useState, ReactNode } from 'react';
import { TextItemResponse } from '../model/text-input-response.ts';
import { useTransferLog } from './transfer-log-context.tsx';

type MessageContextType = {
    errorMessage: string | null;
    successMessage: string | null;
    handleError: (extra_text?: string, code?: string | number, error?: string) => void;
    removeMessages: () => void;
    clearError: () => void;
    handleSuccessMessage: (message: string) => void;
    displaySuccessMessage: (item: TextItemResponse) => void;
};

export const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { addLog } = useTransferLog();

    const handleError = (extra_text?: string, code?: string | number, error?: string | undefined) => {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.';
        if (extra_text) tmpErrorMessage += ` ${extra_text}`;
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer.';
        if (code) tmpErrorMessage += ` (Feilkode ${code})`;

        console.error(tmpErrorMessage, error);
        setErrorMessage(tmpErrorMessage);
        setSuccessMessage(null); // clear success message on error
    };

    const handleSuccessMessage = (message: string) => {
        setSuccessMessage(message);
        setErrorMessage(null); // clear error message on success
    };

    const displaySuccessMessage = (item: TextItemResponse) => {
        handleSuccessMessage(`Item "${item.scanInformation.tempName}" sendt til produksjonsløypen med id ${item.id}`);
        const parsedItem = new TextItemResponse(
            item.id,
            item.materialType,
            item.publicationType,
            item.scanInformation,
            item.statistics
        );
        addLog(parsedItem.toTransferLogItem());
    }

    const removeMessages = () => {
        setErrorMessage(null);
        setSuccessMessage(null);
    };
    const clearError = () => setErrorMessage(null);

    return (
        <MessageContext.Provider value={{ errorMessage, successMessage, handleError, handleSuccessMessage, displaySuccessMessage, removeMessages, clearError }}>
            {children}
        </MessageContext.Provider>
    );
};

export const useMessage = (): MessageContextType => {
    const context = useContext(MessageContext);
    if (!context) throw new Error('useMessage must be used within a MessageProvider');
    return context;
};
