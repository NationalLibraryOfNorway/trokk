<script lang="ts">
    import Files from './lib/Files.svelte';
    import Settings from './lib/Settings.svelte';
    import { onMount } from 'svelte';
    import { documentDir } from '@tauri-apps/api/path';
    import { settings } from './lib/util/settings';
    import Auth from './lib/Auth.svelte';
    import { User } from 'lucide-svelte';


    let scannerPath: string;
    let donePath: string;
    let useS3: boolean;

    let openSettings = false;

    let authComponent: Auth;
    let authResponse: AuthenticationResponse | null;
    let fetchSecretsError: string | null;
    let loggedOut: Boolean;

    onMount(async () => {
        settings.scannerPath.then(async (savedScanPath) => {
            if (savedScanPath) {
                scannerPath = savedScanPath;
            } else {
                let defaultPath = await documentDir() + 'trokk/files';
                settings.scannerPath = defaultPath;
                scannerPath = defaultPath;
            }
        });

        settings.donePath.then(async (savedDonePath) => {
            if (savedDonePath) {
                donePath = savedDonePath;
            } else {
                let defaultPath = await documentDir() + 'trokk/done';
                settings.donePath = defaultPath;
                donePath = defaultPath;
            }
        });

        settings.useS3.then(async (savedUseS3) => {
            if (savedUseS3 !== null) {
                useS3 = savedUseS3;
            } else {
                let defaultUseS3 = true;
                settings.useS3 = defaultUseS3;
                useS3 = defaultUseS3;
            }
        });
    });

    function handleNewSettings(event: CustomEvent) {
        const eventScannerPath = event.detail.newScanPath;
        if (eventScannerPath) {
            scannerPath = eventScannerPath;
            settings.scannerPath = eventScannerPath;
        }

        const eventDonePath = event.detail.newDonePath;
        if (eventDonePath) {
            donePath = eventDonePath;
            settings.donePath = eventDonePath;
        }

        const eventUseS3 = event.detail.newUseS3;
        if (eventUseS3 !== undefined) {
            useS3 = eventUseS3;
            settings.useS3 = eventUseS3;
        }
    }

</script>

<main class="mainContainer">
    <Auth bind:this={authComponent} bind:authResponse bind:loggedOut bind:fetchSecretsError></Auth>
    {#if fetchSecretsError}
        <div class="topBar">
            <p></p>
            <h1>Trøkk</h1>
            <p></p>
        </div>
        <div class="vaultError errorColor">
            <h1>Feil ved innhenting av hemmeligheter</h1>
            <p>{fetchSecretsError}</p>
        </div>
    {:else if authResponse}
        <div class="topBar">
            <p></p>
            <h1>Trøkk</h1>
            <div class="topRightMenu">
                <div>
                    <User />
                    <div>{authResponse.userInfo.givenName}</div>
                </div>
                <button on:click={() => openSettings = !openSettings}>Innstillinger</button>
                <button on:click={() => authComponent.logout()}>Logg ut</button>
            </div>
        </div>
        {#if openSettings}
            <Settings on:save={handleNewSettings}></Settings>
        {/if}
        <Files bind:scannerPath bind:useS3></Files>
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

    > div {
      display: flex;
      flex-direction: row;
      align-items: center;
      margin-right: 10px;
    }

    > button {
      margin-left: 10px;
    }
  }

  .topBar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    position: sticky;
    top: 0;
    height: 5vh;
  }

  .login {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;

    > button {
      width: 200px;
      height: 100px;
      font-size: 30px;
    }
  }

  @media (prefers-color-scheme: dark) {
    .errorColor {
      background-color: #aa0000;
      color: white;
    }
  }

  @media (prefers-color-scheme: light) {
    .errorColor {
      background-color: #ff7373;
      color: black;
    }
  }

  .vaultError {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: max-content;
    align-self: center;
    border-radius: 5px;
    padding: 10px;
  }
</style>
