<script lang="ts">
  import Files from "./lib/Files.svelte";
  import Settings from "./lib/Settings.svelte";
  import { onMount } from "svelte";
  import { documentDir } from "@tauri-apps/api/path";
  import { settings } from "./lib/util/settings";
  import Auth from "./lib/Auth.svelte";
  import { User } from "lucide-svelte";


  let scannerPath: string;
  let donePath: string;

  let openSettings = false;
  $: showLogin = authResponse === null;
  $: authTopBarClass = showLogin ? "topbarOnLogin" : "topbar";

  $: {
    console.log("authTopBarClass", authTopBarClass);
  }
  $: {
    console.log("showLogin", showLogin);
  }

  let authComponent: Auth;
  let authResponse: AuthenticationResponse | null;
  let loggedOut: Boolean;

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
  <Auth bind:this={authComponent} bind:authResponse bind:loggedOut></Auth>
  {#if authResponse}
    <div class="topBar">
      <p></p>
      <h1>Trøkk</h1>
      <div class="topRightMenu">
        <div>
          <User/>
          <div>{authResponse.userInfo.givenName}</div>
        </div>
        <button on:click={() => openSettings = !openSettings} >Innstillinger</button>
        <button on:click={() => authComponent.logout()} >Logg ut</button>
      </div>
    </div>
    {#if openSettings}
      <Settings on:save={handleNewPaths}></Settings>
    {/if}
    <Files bind:scannerPath></Files>
  {:else if loggedOut}
    <div class="login">
      <button on:click={() => authComponent.login()}>Logg inn</button>
    </div>
  {:else}
    <h1>Trøkk</h1>
    <p>Logger inn...</p>
  {/if}
</main>


<style lang="scss">
  .mainContainer {
    display: flex;
    flex-direction: column;
  }

  .topRightMenu {
    display: flex;
    flex-direction: row;
    align-items: center;

    >div {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-right: 10px;
    }
    >button {
      margin-left: 10px;
    }
  }

  .topBar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .login {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;

    >button {
      width: 200px;
      height: 100px;
      font-size: 30px;
    }
  }
</style>
