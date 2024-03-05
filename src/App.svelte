<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import {onMount} from "svelte";
  import {documentDir} from "@tauri-apps/api/path";
  import {settings} from "./lib/util/settings";
  import Auth from "./lib/Auth.svelte";


  let scannerPath: string;
  let donePath: string;

  let openSettings = false;

  let authResponse: AuthenticationResponse | null;

  onMount(async () => {
    settings.scannerPath.then(async (savedScanPath) => {
      if (savedScanPath) {
        scannerPath = savedScanPath;
      } else {
        let defaultPath = await documentDir() + "trokk/files"
        settings.scannerPath = defaultPath;
        scannerPath = defaultPath;
      }
    })

    settings.donePath.then(async (savedDonePath) => {
      if (savedDonePath) {
        donePath = savedDonePath;
      } else {
        let defaultPath = await documentDir() + "trokk/done"
        settings.donePath = defaultPath;
        donePath = defaultPath;
      }
    })
  })

  function handleNewPaths(event: CustomEvent) {
    const eventScannerPath = event.detail.newScanPath
    if (eventScannerPath) {
      scannerPath = eventScannerPath
      settings.scannerPath = eventScannerPath
    }

    const eventDonePath = event.detail.newDonePath
    if (eventDonePath) {
      donePath = eventDonePath
      settings.donePath = eventDonePath
    }
  }

</script>

<main class="mainContainer">
  <Auth bind:authResponse></Auth>
  {#if authResponse}
    <div class="topBar">
      <h1>Trøkk</h1>
      <h2>Hei {authResponse.userInfo.givenName}!</h2>
      <button on:click={() => openSettings = !openSettings} >Settings</button>
    </div>
    {#if openSettings}
      <Settings on:save={handleNewPaths}></Settings>
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
    position: sticky;
    top: 0;
    height: 5vh;
  }
</style>
