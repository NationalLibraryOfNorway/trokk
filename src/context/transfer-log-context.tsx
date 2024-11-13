import React, { createContext, useContext, useState, ReactNode } from 'react';
import {TransferLogItem} from "../model/transfer-log-item.ts";

interface TransferLogContextType {
    logs: TransferLogItem[];
    addLog: (log: TransferLogItem) => void;
}

const TransferLogContext = createContext<TransferLogContextType | null>(null);

export const TransferLogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<TransferLogItem[]>([]);

    const addLog = (log: TransferLogItem) => {
        setLogs((prevLogs) => [...prevLogs, log]);
    };

    return (
        <TransferLogContext.Provider value={{ logs, addLog }}>
            {children}
        </TransferLogContext.Provider>
    );
};

export const useTransferLog = (): TransferLogContextType => {
    const context = useContext(TransferLogContext);
    if (!context) {
        throw new Error('useTransferLog must be used within a TransferLogProvider');
    }
    return context;
};