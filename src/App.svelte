<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import {onMount} from "svelte";
  import {Store} from "tauri-plugin-store-api";
  import {documentDir} from "@tauri-apps/api/path";
  import {invoke} from "@tauri-apps/api";
  import type {RequiredEnvVariables} from "./lib/RequiredEnvVariables";


  let scannerPath: string;

  let openSettings = false;
  let store = new Store(".settings.dat");

  let envVariables: RequiredEnvVariables;

  onMount(() => {
    invoke("get_required_env_variables").then((res: RequiredEnvVariables) => {
      envVariables = res;
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
  <div class="topBar">
    <h1>Trøkk</h1>
    <button on:click={() => openSettings = !openSettings} >Settings</button>
  </div>
  {#if openSettings}
    <Settings on:save={handleNewPath} bind:scannerPath></Settings>
  {/if}
  <Files bind:scannerPath></Files>
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
