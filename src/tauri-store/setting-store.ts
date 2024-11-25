import {load, Store} from "@tauri-apps/plugin-store";
import {AuthenticationResponse} from "../model/authentication-response.ts";
import { documentDir } from "@tauri-apps/api/path";
import {sep} from "@tauri-apps/api/path";

const defaultScannerPath = documentDir() + sep() + 'trokk' + sep() + 'files';

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
                })
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
                let scannerPath: string = '';
                if (path == undefined || path == '') {
                    scannerPath = defaultScannerPath;
                    this.setScannerPath(scannerPath);
                } else {
                    scannerPath = path;
                }
                return scannerPath;
            })
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
        let authResponse: AuthenticationResponse | null = null;

        authResponse = await this.store!.get<AuthenticationResponse>('authResponse')
            .catch(error => {
                console.error('Error getting auth response:', error);
            }) ?? null;
        return authResponse;
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
}

export const settings = SettingStore.getInstance();
