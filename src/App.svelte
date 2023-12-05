<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import {onMount} from "svelte";
  import {documentDir} from "@tauri-apps/api/path";
  import {invoke} from "@tauri-apps/api";
  import {appWindow, WebviewWindow} from "@tauri-apps/api/window";
  import {settings} from "./lib/util/settings";


  let scannerPath: string;

  let openSettings = false;

  let authResponse: AuthenticationResponse | null;
  let envVariables: RequiredEnvVariables;

  onMount(async () => {
    settings.scannerPath.then(async (savedPath) => {
      if (savedPath) {
        scannerPath = savedPath;
      } else {
        let defaultPath = await documentDir() + "trokk/files"
        settings.scannerPath = defaultPath;
        scannerPath = defaultPath;
      }
    })

    invoke("get_required_env_variables").then((res) => {
      envVariables = res as RequiredEnvVariables;

      // Login after required env variables are fetched
      settings.authResponse.then(async (savedAuthResponse: AuthenticationResponse | null) => {
        // Always refresh token on startup, if it exists and is not expired
        const timeNow = new Date().getTime()
        if (savedAuthResponse &&
                (savedAuthResponse.expireInfo.expiresAt > timeNow || savedAuthResponse.expireInfo.refreshExpiresAt > timeNow)
        ) {
          authResponse = savedAuthResponse
          await refreshToken()
          setRefreshTokenInterval()
        } else {
          logIn()
        }
      })
    })
  })

  function setRefreshTokenInterval() {
    if (!authResponse) throw new Error("User not logged in")

    setInterval(async () => {
              await refreshToken()
            },
            authResponse.tokenResponse.expiresIn * 1000 - 10000 // 10 seconds before token expires
    );
  }

  async function refreshToken() {
    authResponse = await settings.authResponse

    if (authResponse && authResponse.expireInfo.refreshExpiresAt > new Date().getTime()) {
      await invoke<AuthenticationResponse>("refresh_token", {refreshToken: authResponse.tokenResponse.refreshToken}).then((res) => {
        authResponse = res
        settings.authResponse = res
      })
    } else {
      throw new Error("Refresh token expired")
    }
  }

  function logIn() {
    if (!envVariables) throw new Error("Env variables not set")
    invoke('log_in').then((port) => {
      const webview = new WebviewWindow('Login', {url: envVariables.oidcBaseUrl + "/auth?scope=openid&response_type=code&client_id=" + envVariables.oidcClientId + "&redirect_uri=http://localhost:" + port})
      appWindow.listen('token_exchanged', (event) => {
        authResponse = event.payload as AuthenticationResponse
        settings.authResponse = authResponse
        webview.close()
        setRefreshTokenInterval()
      });
    });
  }

  function handleNewPath(event: CustomEvent) {
    scannerPath = event.detail.newPath
    settings.scannerPath = scannerPath
  }

</script>

<main class="mainContainer">
  {#if authResponse}
    <div class="topBar">
      <h1>Trøkk</h1>
      <h2>Hei {authResponse.userInfo.givenName}!</h2>
      <button on:click={() => openSettings = !openSettings} >Settings</button>
    </div>
    {#if openSettings}
      <Settings on:save={handleNewPath} bind:scannerPath></Settings>
    {/if}
    <Files bind:scannerPath></Files>
  {:else}
      <h1>Trøkk</h1>
      <p>Logger inn...</p>
  {/if}
</main>



<style>
  .mainContainer {
    display: flex;
    flex-direction: column;
  }

  .topBar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
