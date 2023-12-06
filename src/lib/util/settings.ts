import {Store} from "tauri-plugin-store-api";

class Settings {
    store: Store;

    constructor() {
        this.store = new Store(".settings.dat");
    }

    get scannerPath(): Promise<string | null> {
        return this.store.get<string>('scannerPath');
    }

    set scannerPath(path: string) {
        this.store.set('scannerPath', path).then(async () => {
            await this.store.save();
        })
    }

    get authResponse(): Promise<AuthenticationResponse | null> {
        return this.store.get<AuthenticationResponse>('authResponse');
    }

    set authResponse(authResponse: AuthenticationResponse) {
        this.store.set('authResponse', authResponse).then(async () => {
            await this.store.save();
        });
    }
}

export const settings = new Settings()
