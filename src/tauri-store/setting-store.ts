import {load, Store} from '@tauri-apps/plugin-store';
import {AuthenticationResponse} from '../model/authentication-response.ts';
import {documentDir, sep} from '@tauri-apps/api/path';

const defaultScannerPath = await documentDir() + sep() + 'trokk' + sep() + 'files';
const defaultThumbnailSizeFraction = 8;
const defaultPreviewSizeFraction = 4;
const minSizeFraction = 1;
const maxSizeFraction = 16;

const clampSizeFraction = (fraction: number): number => {
    return Math.max(minSizeFraction, Math.min(maxSizeFraction, fraction));
};

class SettingStore {
    private static instance: SettingStore;
    store: Store | undefined;

    private constructor() {
    }

    static getInstance(): SettingStore {
        if (!SettingStore.instance) {
            SettingStore.instance = new SettingStore();
        }
        return SettingStore.instance;
    }

    async init(): Promise<void> {
        if (this.store == undefined) {
            return await load('.settings.json', {
                autoSave: true
            }).then(store => {
                this.store = store;
                this.store.get('scannerPath').then(path => {
                    if (path == undefined || path == '') {
                        this.setScannerPath(defaultScannerPath);
                    }
                });
            }).catch(error => {
                console.error('Error initializing store:', error);
            });
        } else {
            return;
        }
    }

    private async ensureStore() {
        if (this.store == undefined) {
            try {
                await this.init();
            } catch (error) {
                console.error('ensureStore() - error during initialization:', error);
                throw error; // Re-throw the error to ensure it is handled by the caller
            }
        }
    }

    async getScannerPath(): Promise<string> {
        await this.ensureStore();
        return await this.store!.get<string>('scannerPath')
            .catch(error => {
                console.error('Error getting scanner path from store:', error);
            }).then<string>(path => {
                let scannerPath: string;
                if (path == undefined || path == '') {
                    scannerPath = defaultScannerPath;
                    this.setScannerPath(scannerPath);
                } else {
                    scannerPath = path;
                }
                return scannerPath;
            });
    }

    async setScannerPath(path: string): Promise<void> {
        await this.ensureStore();
        try {
            this.store!.set('scannerPath', path).then(() => {
                return this.store!.save();
            }).catch(error => {
                console.error('Error setting scanner path:', error);
            });
        } catch (error) {
            console.error('Error setting scanner path:', error);
        }
    }

    async getAuthResponse(): Promise<AuthenticationResponse | null> {
        await this.ensureStore();

        return await this.store!.get<AuthenticationResponse>('authResponse')
            .catch(error => {
                console.error('Error getting auth response:', error);
            }) ?? null;
    }

    async setAuthResponse(authResponse: AuthenticationResponse | null): Promise<void> {
        await this.ensureStore();

        try {
            await this.store!.set('authResponse', authResponse).then(async () => {
                await this.store!.save();
            }).catch(error => {
                console.error('Error setting auth response:', error);
            });
        } catch (error) {
            console.error('Error setting auth response:', error);
        }
    }

    async getTextSize(): Promise<number> {
        await this.ensureStore();
        const size = await this.store!.get<number>('textSize')
            .catch(error => {
                console.error('Error getting text size:', error);
                return 100;
            });
        return size ?? 100; // Default to 100%
    }

    async setTextSize(size: number): Promise<void> {
        await this.ensureStore();
        try {
            await this.store!.set('textSize', size).then(async () => {
                await this.store!.save();
            }).catch(error => {
                console.error('Error setting text size:', error);
            });
        } catch (error) {
            console.error('Error setting text size:', error);
        }
    }

    async getThumbnailSizeFraction(): Promise<number> {
        await this.ensureStore();
        const fraction = await this.store!.get<number>('thumbnailSizeFraction')
            .catch(error => {
                console.error('Error getting thumbnail size fraction:', error);
                return defaultThumbnailSizeFraction;
            });
        const clampedFraction = clampSizeFraction(fraction ?? defaultThumbnailSizeFraction);
        if (fraction == undefined || clampedFraction !== fraction) {
            await this.setThumbnailSizeFraction(clampedFraction);
        }
        return clampedFraction;
    }

    async setThumbnailSizeFraction(fraction: number): Promise<void> {
        await this.ensureStore();
        const clampedFraction = clampSizeFraction(fraction);
        try {
            await this.store!.set('thumbnailSizeFraction', clampedFraction).then(async () => {
                await this.store!.save();
            }).catch(error => {
                console.error('Error setting thumbnail size fraction:', error);
            });
        } catch (error) {
            console.error('Error setting thumbnail size fraction:', error);
        }
    }

    async getPreviewSizeFraction(): Promise<number> {
        await this.ensureStore();
        const fraction = await this.store!.get<number>('previewSizeFraction')
            .catch(error => {
                console.error('Error getting preview size fraction:', error);
                return defaultPreviewSizeFraction;
            });
        const clampedFraction = clampSizeFraction(fraction ?? defaultPreviewSizeFraction);
        if (fraction == undefined || clampedFraction !== fraction) {
            await this.setPreviewSizeFraction(clampedFraction);
        }
        return clampedFraction;
    }

    async setPreviewSizeFraction(fraction: number): Promise<void> {
        await this.ensureStore();
        const clampedFraction = clampSizeFraction(fraction);
        try {
            await this.store!.set('previewSizeFraction', clampedFraction).then(async () => {
                await this.store!.save();
            }).catch(error => {
                console.error('Error setting preview size fraction:', error);
            });
        } catch (error) {
            console.error('Error setting preview size fraction:', error);
        }
    }
}

export const settings = SettingStore.getInstance();
