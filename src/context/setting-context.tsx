import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { settings } from '../tauri-store/setting-store.ts';
import { getVersion } from '@tauri-apps/api/app';

interface SettingContextType {
    scannerPath: string;
    version: React.MutableRefObject<string>;
    textSize: number;
    setScannerPathSetting: (path: string) => void;
    setTextSize: (size: number) => void;
}

const SettingContext = createContext<SettingContextType | null>(null);

export const SettingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scannerPath, setScannerPath] = useState<string>('');
    const [textSize, setTextSizeState] = useState<number>(100);
    const version = useRef<string>('');

    useEffect(() => {
        const initialize = async () => {
            await settings.init();
            setScannerPath(await settings.getScannerPath());
            const storedTextSize = await settings.getTextSize();
            setTextSizeState(storedTextSize);
            version.current = await getVersion();
        };
        void initialize();
    }, []);

    // Apply text size to document root whenever it changes
    useEffect(() => {
        document.documentElement.style.fontSize = `${textSize}%`;
    }, [textSize]);

    function setScannerPathSetting(path: string) {
        void settings.setScannerPath(path).then(() => {
            setScannerPath(path);
        });
    }

    function setTextSize(size: number) {
        // Clamp between 50% and 200%
        const clampedSize = Math.max(50, Math.min(200, size));
        void settings.setTextSize(clampedSize).then(() => {
            setTextSizeState(clampedSize);
        });
    }

    return (
        <SettingContext.Provider value={{ scannerPath, version, textSize, setScannerPathSetting, setTextSize }}>
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
