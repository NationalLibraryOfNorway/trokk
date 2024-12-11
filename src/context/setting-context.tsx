import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { settings } from '../tauri-store/setting-store.ts';
import { getVersion } from '@tauri-apps/api/app';

interface SettingContextType {
    scannerPath: string;
    version: React.MutableRefObject<string>;
    setScannerPathSetting: (path: string) => void;
}

const SettingContext = createContext<SettingContextType | null>(null);

export const SettingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scannerPath, setScannerPath] = useState<string>('');
    const version = useRef<string>('');

    useEffect(() => {
        const initialize = async () => {
            await settings.init();
            setScannerPath(await settings.getScannerPath());
            version.current = await getVersion();
        };
        void initialize();
    }, []);

    function setScannerPathSetting(path: string) {
        void settings.setScannerPath(path).then(() => {
            setScannerPath(path);
        });
    }

    return (
        <SettingContext.Provider value={{ scannerPath, version, setScannerPathSetting }}>
            {children}
        </SettingContext.Provider>
    );
};

export const useSettings = (): SettingContextType => {
    const context = useContext(SettingContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingProvider');
    }
    return context;
};