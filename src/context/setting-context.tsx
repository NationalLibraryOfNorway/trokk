import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { settings } from '../tauri-store/setting-store.ts';
import { getVersion } from '@tauri-apps/api/app';
import {invoke} from '@tauri-apps/api/core';

interface SettingContextType {
    scannerPath: string;
    version: React.MutableRefObject<string>;
    textSize: number;
    thumbnailSizeFraction: number;
    previewSizeFraction: number;
    setScannerPathSetting: (path: string) => void;
    setTextSize: (size: number) => void;
    setThumbnailSizeFraction: (fraction: number) => void;
    setPreviewSizeFraction: (fraction: number) => void;
}

const SettingContext = createContext<SettingContextType | null>(null);

export const SettingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scannerPath, setScannerPath] = useState<string>('');
    const [textSize, setTextSizeState] = useState<number>(100);
    const [thumbnailSizeFraction, setThumbnailSizeFractionState] = useState<number>(8);
    const [previewSizeFraction, setPreviewSizeFractionState] = useState<number>(4);
    const version = useRef<string>('');
    const initialized = useRef<boolean>(false);

    useEffect(() => {
        const initialize = async () => {
            await settings.init();
            setScannerPath(await settings.getScannerPath());
            const storedTextSize = await settings.getTextSize();
            setTextSizeState(storedTextSize);
            const storedThumbnailFraction = await settings.getThumbnailSizeFraction();
            const storedPreviewFraction = await settings.getPreviewSizeFraction();
            setThumbnailSizeFractionState(storedThumbnailFraction);
            setPreviewSizeFractionState(storedPreviewFraction);
            version.current = await getVersion();
            initialized.current = true;

            await invoke('set_image_size_fractions', {
                thumbnailFraction: storedThumbnailFraction,
                previewFraction: storedPreviewFraction
            }).catch((error) => {
                console.error('Error syncing image size fractions during init:', error);
            });
        };
        void initialize();
    }, []);

    // Apply text size to document root whenever it changes
    useEffect(() => {
        document.documentElement.style.fontSize = `${textSize}%`;
    }, [textSize]);

    useEffect(() => {
        if (!initialized.current) return;
        void invoke('set_image_size_fractions', {
            thumbnailFraction: thumbnailSizeFraction,
            previewFraction: previewSizeFraction
        }).catch((error) => {
            console.error('Error syncing image size fractions:', error);
        });
    }, [thumbnailSizeFraction, previewSizeFraction]);

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

    function setThumbnailSizeFraction(fraction: number) {
        const clampedFraction = Math.max(1, Math.min(16, fraction));
        void settings.setThumbnailSizeFraction(clampedFraction).then(() => {
            setThumbnailSizeFractionState(clampedFraction);
        });
    }

    function setPreviewSizeFraction(fraction: number) {
        const clampedFraction = Math.max(1, Math.min(16, fraction));
        void settings.setPreviewSizeFraction(clampedFraction).then(() => {
            setPreviewSizeFractionState(clampedFraction);
        });
    }

    return (
        <SettingContext.Provider value={{
            scannerPath,
            version,
            textSize,
            thumbnailSizeFraction,
            previewSizeFraction,
            setScannerPathSetting,
            setTextSize,
            setThumbnailSizeFraction,
            setPreviewSizeFraction
        }}>
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
