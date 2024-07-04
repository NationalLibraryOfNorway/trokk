import { Store } from 'tauri-plugin-store-api';

class Settings {
    store: Store;

    constructor() {
        this.store = new Store('.settings.dat');
    }

    get scannerPath(): Promise<string | null> {
        return this.store.get<string>('scannerPath');
    }

    set scannerPath(path: string) {
        this.store.set('scannerPath', path).then(async () => {
            await this.store.save();
        });
    }

    get authResponse(): Promise<AuthenticationResponse | null> {
        return this.store.get<AuthenticationResponse>('authResponse');
    }

    set authResponse(authResponse: AuthenticationResponse | null) {
        this.store.set('authResponse', authResponse).then(async () => {
            await this.store.save();
        });
    }

    get donePath(): Promise<string | null> {
        return this.store.get<string>('donePath');
    }

    set donePath(path: string) {
        this.store.set('donePath', path).then(async () => {
            await this.store.save();
        });
    }

    get useS3(): Promise<boolean | null> {
        return this.store.get<boolean>('useS3');
    }

    set useS3(useS3: boolean) {
        this.store.set('useS3', useS3).then(async () => {
            await this.store.save();
        });
    }
}

export const settings = new Settings();
