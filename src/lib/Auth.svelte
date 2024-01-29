<script lang="ts" context="module">
    import {invoke} from "@tauri-apps/api";
    import {appWindow, WebviewWindow} from "@tauri-apps/api/window";
    import {settings} from "./util/settings";

    export async function login(): Promise<string | void> {
        const envVars = await getEnvVariables()
        if (!envVars) throw new Error("Env variables not set")

        return invoke('log_in').then((port) => {
            const webview = new WebviewWindow('Login', {
                url: envVars.oidcBaseUrl + "/auth?scope=openid&response_type=code&client_id=" + envVars.oidcClientId + "&redirect_uri=http://localhost:" + port,
                title: "NBAuth innlogging"
            })
            appWindow.listen('token_exchanged', (event) => {
                settings.authResponse = event.payload as AuthenticationResponse
                setRefreshAccessTokenInterval()
                webview.close()
            });
        });
    }

    export async function refreshAccessToken(): Promise<AuthenticationResponse | void> {
        const authResponse = await settings.authResponse

        if (await canRefresh() && authResponse) {
            return invoke<AuthenticationResponse>("refresh_token", {refreshToken: authResponse.tokenResponse.refreshToken})
                .then((res) => {
                    settings.authResponse = res
                })
        } else {
            throw new Error("Refresh token expired")
        }
    }

    export async function setRefreshAccessTokenInterval(): Promise<void> {
        const authResponse = await settings.authResponse
        if (!authResponse) throw new Error("User not logged in")

        setInterval(async () => {
                await refreshAccessToken()
            },
            authResponse.tokenResponse.expiresIn * 1000 - 10000 // 10 seconds before token expires
        );
    }

    export async function canRefresh(): Promise<boolean> {
        const authResponse = await settings.authResponse
        if (!authResponse) return false
        return authResponse.expireInfo.refreshExpiresAt > new Date().getTime()
    }

    export async function isLoggedIn(): Promise<boolean> {
        const authResponse = await settings.authResponse
        if (!authResponse) return false
        return authResponse.expireInfo.expiresAt > new Date().getTime()
    }

    async function getEnvVariables(): Promise<RequiredEnvVariables | null> {
        return invoke("get_required_env_variables")
    }

</script>
