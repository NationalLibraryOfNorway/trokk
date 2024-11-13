import React, { createContext, useContext, useState, useEffect } from 'react';
import { AllTransferProgress, TransferProgress } from '../model/transfer-progress';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { Event, UnlistenFn } from '@tauri-apps/api/event'

const appWindow = getCurrentWebviewWindow();

interface UploadProgressContextType {
    allUploadProgress: AllTransferProgress;
    setAllUploadProgress: React.Dispatch<React.SetStateAction<AllTransferProgress>>;
}

const UploadProgressContext = createContext<UploadProgressContextType | null>(null);

export const UploadProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [allUploadProgress, setAllUploadProgress] = useState<AllTransferProgress>({ dir: {} } as AllTransferProgress);

    useEffect(() => {
        const unlistenProgress: Promise<UnlistenFn> = appWindow.listen('transfer_progress', (event: Event<TransferProgress>) => {
            setAllUploadProgress(prevProgress => ({
                ...prevProgress,
                dir: {
                    ...prevProgress.dir,
                    [event.payload.directory]: event.payload
                }
            }));
        });

        return () => {
            unlistenProgress.then(unlisten => unlisten());
        };
    }, []);

    return (
        <UploadProgressContext.Provider value={{ allUploadProgress, setAllUploadProgress }}>
            {children}
        </UploadProgressContext.Provider>
    );
};

export const useUploadProgress = () => {
    const context = useContext(UploadProgressContext);
    if (!context) {
        throw new Error('useUploadProgress must be used within an UploadProgressProvider');
    }
    return context;
};