<script lang="ts">
    import { onMount } from 'svelte';
    import { type EventCallback } from '@tauri-apps/api/event';

    export let authResponse: AuthenticationResponse | null;
    export let loggedOut: Boolean = false;
    export let fetchSecretsError: string | null = null;
    let secrets: SecretVariables;
    let refreshIntervalId: number | undefined = undefined;

    onMount(async () => {
        await getSecrets().then(async res => {
            secrets = res;
            fetchSecretsError = null;
            if (await isLoggedIn() || await canRefresh()) {
                await refreshAccessToken();
                refreshIntervalId = await setRefreshAccessTokenInterval();
                authResponse = await settings.authResponse;
            } else {
                await login();
            }
        }).catch(err => {
            fetchSecretsError = err;
            throw new Error('Failed to fetch secrets');
        });
    });

    export async function login(): Promise<string | void> {
        if (!secrets.oidcClientSecret) {
            await getSecrets().then(res => {
                secrets = res;
            }).catch(err => {
                fetchSecretsError = err;
                throw new Error('Failed to fetch secrets');
            });
        }
        return invoke('log_in').then(async (port) => {
            loggedOut = false;
            let loginWebView = new WebviewWindow('Login', {
                url: secrets.oidcBaseUrl + '/auth?scope=openid&response_type=code&client_id=' + secrets.oidcClientId + '&redirect_uri=http://localhost:' + port,
                title: 'NBAuth innlogging',
                alwaysOnTop: true,
                closable: false,  // Prevent user from closing the window, this prevents complicated logic to handle the user closing the window
                focus: true,
                center: true
            });

            await appWindow.once('token_exchanged', handleTokenExchangedEvent(loginWebView));
        });
    }

    export function handleTokenExchangedEvent(loginWebView: WebviewWindow): EventCallback<unknown> {
        return async (event) => {
            authResponse = event.payload as AuthenticationResponse;
            settings.authResponse = authResponse;
            setRefreshAccessTokenInterval(authResponse)
                .then((id) => {
                    refreshIntervalId = id;
                });
            await loginWebView.close();
            // Show main window on screen after login
            if (await appWindow.isMinimized()) await appWindow.unminimize();
            if (!(await appWindow.isVisible())) await appWindow.show();
        };
    }

    export function logout(): void {
        settings.authResponse = null;
        authResponse = null;
        loggedOut = true;
        clearInterval(refreshIntervalId);
        refreshIntervalId = undefined;
    }
</script>

<script context="module" lang="ts">
    import { invoke } from '@tauri-apps/api';
    import { appWindow, WebviewWindow } from '@tauri-apps/api/window';
    import { settings } from './util/settings';

    export async function refreshAccessToken(): Promise<AuthenticationResponse | void> {
        const authResponse = await settings.authResponse;

        if (await canRefresh() && authResponse) {
            return invoke<AuthenticationResponse>('refresh_token', { refreshToken: authResponse.tokenResponse.refreshToken })
                .then((res) => {
                    settings.authResponse = res;
                });
        } else {
            throw new Error('Refresh token expired');
        }
    }

    export async function setRefreshAccessTokenInterval(authRes?: AuthenticationResponse): Promise<number> {
        // Sending auth response to this method is recommended.
        // Saving the response in store is async, can't be awaited and is slower than the regular login
        const authResponse = authRes ?? await settings.authResponse;
        if (!authResponse) throw new Error('Cannot set refresh token interval: User not logged in');

        return setInterval(async () => {
            await refreshAccessToken();
        }, authResponse.tokenResponse.expiresIn * 1000 - 10000); // 10 seconds before token expires
    }

    export async function canRefresh(): Promise<boolean> {
        const authResponse = await settings.authResponse;
        if (!authResponse) return false;
        return authResponse.expireInfo.refreshExpiresAt > new Date().getTime();
    }

    export async function isLoggedIn(): Promise<boolean> {
        const authResponse = await settings.authResponse;
        if (!authResponse) return false;
        return authResponse.expireInfo.expiresAt > new Date().getTime();
    }

    async function getSecrets(): Promise<SecretVariables> {
        return invoke('get_secret_variables');
    }

</script>
