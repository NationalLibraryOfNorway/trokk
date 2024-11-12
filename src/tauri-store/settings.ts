import {load, Store} from "@tauri-apps/plugin-store";


class Settings {
    private static instance: Settings;
    store: Store | undefined;

    private constructor() {
    }

    static getInstance(): Settings {
        if (!Settings.instance) {
            Settings.instance = new Settings();
        }
        return Settings.instance;
    }

    async init(): Promise<void> {
        if (this.store == undefined) {
            return await load('.settings.json', {
                autoSave: true
            }).then(store => {
                this.store = store;
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

    async getScannerPath(): Promise<string | undefined> {
        await this.ensureStore();
        let scannerPath: string | undefined = undefined;
        this.store!.get<string>('scannerPath').then(path => {
            scannerPath = path;
        }).catch(error => {
            console.error('Error getting scanner path:', error);
        });
        return scannerPath;
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
        // @ts-ignore
        authResponse = await this.store!.get<AuthenticationResponse>('authResponse')
            .catch(error => {
                console.error('Error getting auth response:', error);
            });
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

export const settings = Settings.getInstance();
