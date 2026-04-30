import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { settings } from '../tauri-store/setting-store.ts';
import { getVersion } from '@tauri-apps/api/app';
import {invoke} from '@tauri-apps/api/core';
import {
    defaultWorkspacePaneSizes,
    normalizeWorkspacePaneSizes,
    type WorkspacePaneSizes,
} from '@/util/workspace-pane-layout.ts';

interface SettingContextType {
    scannerPath: string;
    version: React.MutableRefObject<string>;
    textSize: number;
    thumbnailSizeFraction: number;
    previewSizeFraction: number;
    workspacePaneSizes: WorkspacePaneSizes;
    setScannerPathSetting: (path: string) => void;
    setTextSize: (size: number) => void;
    setThumbnailSizeFraction: (fraction: number) => void;
    setPreviewSizeFraction: (fraction: number) => void;
    setWorkspacePaneSizes: (sizes: WorkspacePaneSizes) => void;
    theme: 'dark' | 'light' | 'system';
    setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

const SettingContext = createContext<SettingContextType | null>(null);

export const SettingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [scannerPath, setScannerPath] = useState<string>('');
    const [textSize, setTextSizeState] = useState<number>(100);
    const [thumbnailSizeFraction, setThumbnailSizeFractionState] = useState<number>(8);
    const [previewSizeFraction, setPreviewSizeFractionState] = useState<number>(4);
    const [workspacePaneSizes, setWorkspacePaneSizesState] = useState<WorkspacePaneSizes>(defaultWorkspacePaneSizes);
    const [theme, setThemeState] = useState<'dark' | 'light' | 'system'>('dark');
    const systemThemeListenerRef = useRef<(() => void) | null>(null);
    const version = useRef<string>('');
    const initialized = useRef<boolean>(false);

    const applyTheme = (t: 'dark' | 'light' | 'system') => {
        // Clean up any existing system theme listener
        if (systemThemeListenerRef.current) {
            systemThemeListenerRef.current();
            systemThemeListenerRef.current = null;
        }

        if (t === 'system') {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const apply = (dark: boolean) => {
                document.documentElement.classList.toggle('dark', dark);
            };
            apply(mq.matches);
            const handler = (e: MediaQueryListEvent) => apply(e.matches);
            mq.addEventListener('change', handler);
            systemThemeListenerRef.current = () => mq.removeEventListener('change', handler);
        } else {
            document.documentElement.classList.toggle('dark', t === 'dark');
        }
    };

    useEffect(() => {
        const initialize = async () => {
            await settings.init();
            setScannerPath(await settings.getScannerPath());
            const storedTextSize = await settings.getTextSize();
            setTextSizeState(storedTextSize);
            const storedThumbnailFraction = await settings.getThumbnailSizeFraction();
            const storedPreviewFraction = await settings.getPreviewSizeFraction();
            const storedWorkspacePaneSizes = await settings.getWorkspacePaneSizes();
            setThumbnailSizeFractionState(storedThumbnailFraction);
            setPreviewSizeFractionState(storedPreviewFraction);
            setWorkspacePaneSizesState(storedWorkspacePaneSizes);
            const storedTheme = await settings.getTheme();
            setThemeState(storedTheme);
            applyTheme(storedTheme);
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

    function setTheme(t: 'dark' | 'light' | 'system') {
        void settings.setTheme(t).then(() => {
            setThemeState(t);
            applyTheme(t);
        });
    }

    function setWorkspacePaneSizes(sizes: WorkspacePaneSizes) {
        const normalizedSizes = normalizeWorkspacePaneSizes(sizes);
        void settings.setWorkspacePaneSizes(normalizedSizes).then(() => {
            setWorkspacePaneSizesState(normalizedSizes);
        });
    }

    useEffect(() => {
        return () => {
            if (systemThemeListenerRef.current) {
                systemThemeListenerRef.current();
            }
        };
    }, []);

    return (
        <SettingContext.Provider value={{
            scannerPath,
            version,
            textSize,
            thumbnailSizeFraction,
            previewSizeFraction,
            workspacePaneSizes,
            setScannerPathSetting,
            setTextSize,
            setThumbnailSizeFraction,
            setPreviewSizeFraction,
            setWorkspacePaneSizes,
            theme,
            setTheme,
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
