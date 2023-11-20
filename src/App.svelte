<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import {onMount} from "svelte";
  import {Store} from "tauri-plugin-store-api";
  import {documentDir} from "@tauri-apps/api/path";
  import {invoke} from "@tauri-apps/api";
  import type {RequiredEnvVariables} from "./lib/model/required-env-variables";
  import {appWindow, WebviewWindow} from "@tauri-apps/api/window";


  let scannerPath: string;

  let openSettings = false;
  let store = new Store(".settings.dat");

  let authResponse: AuthenticationResponse;
  let envVariables: RequiredEnvVariables;

  onMount(async () => {
    invoke("get_required_env_variables").then((res) => {
      envVariables = res as RequiredEnvVariables;
      console.log(envVariables)

      // TODO handle already logged user? Autologout? Log in every time? Log out button?
      invoke('log_in').then((port) => {
        const webview = new WebviewWindow('Login', {url: envVariables.oicdUrl + "/auth?scope=openid&response_type=code&client_id=" + envVariables.oicdClientId + "&redirect_uri=http://localhost:" + port})
        appWindow.listen('token_exchanged', (event) => {
          authResponse = event.payload as AuthenticationResponse
          webview.close()
        });
      });
    })


    store.get<string>("scannerPath").then(async (savedPath) => {
      if (savedPath) {
        scannerPath = savedPath;
      } else {
        let defaultPath = await documentDir() + "trokk/files"
        store.set("scannerPath", defaultPath).then(() => {
          scannerPath = defaultPath;
        })
      }
    })
  })

  function handleNewPath(event: CustomEvent) {
    scannerPath = event.detail.newPath
    store.set("scannerPath", scannerPath)
    store.save()
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
