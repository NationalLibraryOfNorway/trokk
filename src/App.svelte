<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import TrokkSettings from "./lib/TrokkSettings.svelte";

  let scannerPath: string;


  let openSettings = false;
</script>
<TrokkSettings bind:scannerPath></TrokkSettings>

<main class="mainContainer">

  <div class="topBar">
    <h1>Trøkk</h1>
    <button on:click={() => openSettings = !openSettings} >Settings</button>
  </div>
  {#if openSettings}
    <Settings bind:scannerPath></Settings>
  {/if}
  <Files bind:scannerPath></Files>
  <h1>{scannerPath ? scannerPath : "no setting"}</h1>
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