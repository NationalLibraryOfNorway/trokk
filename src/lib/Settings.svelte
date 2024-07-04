<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { invoke } from '@tauri-apps/api';
    import { settings } from './util/settings';
    import { readDir } from '@tauri-apps/api/fs';

    const dispatch = createEventDispatcher();
    let scannerPath: string;
    let donePath: string;
    let useS3: boolean;
    let scanPathError: string | undefined;
    let donePathError: string | undefined;
    let scanPathSuccess: string | undefined;
    let donePathSuccess: string | undefined;

    onMount(async () => {
        scannerPath = await settings.scannerPath ?? '';
        donePath = await settings.donePath ?? '';
        let tmpUseS3 = await settings.useS3;
        console.log(tmpUseS3);
        if (tmpUseS3 === null) {
            tmpUseS3 = true;
            settings.useS3 = tmpUseS3;
        } else {
            useS3 = tmpUseS3;
        }
    });

    async function pickScannerPath() {
        await invoke<string>('pick_directory', { startPath: scannerPath })
            .then(path => saveScannerPath(path))
            .catch(error => console.log(error));
    }

    async function pickDonePath() {
        await invoke<string>('pick_directory', { startPath: donePath })
            .then(path => saveDonePath(path))
            .catch(error => console.log(error));
    }

    function saveScannerPath(path: string): void {
        readDir(path)
            .then(() => {
                scanPathError = undefined;
                scannerPath = path;
                dispatch('save', { newScanPath: path });
                scanPathSuccess = 'Lagret!';
                setTimeout(() => scanPathSuccess = undefined, 5000);
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) scanPathError = 'Dette er ikke en mappe';
                else scanPathError = 'Mappen eksisterer ikke';
            });
    }

    function saveDonePath(path: string): void {
        readDir(path)
            .then(() => {
                donePathError = undefined;
                donePath = path;
                dispatch('save', { newDonePath: path });
                donePathSuccess = 'Lagret!';
                setTimeout(() => donePathSuccess = undefined, 5000);
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) donePathError = 'Dette er ikke en mappe';
                else donePathError = 'Mappen eksisterer ikke';
            });
    }

    function saveUseS3(useS3: boolean): undefined {
        dispatch('save', { newUseS3: useS3 });
        setTimeout(() => console.log('useS3', useS3), 1000);
        setTimeout(async () => console.log('useS3', await settings.useS3), 1000);
    }

</script>

<form on:submit|preventDefault class="settings-form">
    <div class="form-group">
        <label for="useS3">Bruk S3</label>
        <input type="checkbox" id="useS3" bind:checked={useS3} on:change={saveUseS3(useS3)} />
    </div>

    <div class="form-group">
        <label for="scannerPath">Skanner kilde</label>
        <button type="button" on:click={() => pickScannerPath()}>Velg mappe</button>
        <input type="text" id="scannerPath" bind:value={scannerPath} />
        <button on:click={() => saveScannerPath(scannerPath)}>Lagre</button>
        {#if scanPathError}
            <p class="error-message">{scanPathError}</p>
        {/if}
        {#if scanPathSuccess}
            <p class="success-message">{scanPathSuccess}</p>
        {/if}
    </div>

    <div class="form-group {useS3 ? 'grey-out' : ''}">
        <label for="donePath">Ferdige objekter</label>
        <button disabled="{useS3}" type="button" on:click={() => pickDonePath()}>Velg mappe</button>
        <input disabled="{useS3}" type="text" id="donePath" bind:value={donePath} />
        <button disabled="{useS3}" on:click={() => saveDonePath(donePath)}>Lagre</button>
        {#if donePathError}
            <p class="error-message">{donePathError}</p>
        {/if}
        {#if donePathSuccess}
            <p class="success-message">{donePathSuccess}</p>
        {/if}
    </div>
</form>

<!--use scss-->
<style lang="scss">
  .settings-form {
    display: flex;
    flex-direction: column;
  }

  .form-group {
    display: flex;
    margin: .2em .5em;
  }

  .form-group label {
    width: 125px;
    margin: auto 0;
  }

  .form-group input[type="text"] {
    width: 30em;
    margin: auto .2em;
  }

  .form-group input[type="checkbox"] {
    /*size checkbox to double*/
    transform: scale(2);
    /*Adjust left padding for scaling*/
    margin: auto .5em;
  }

  .grey-out {
    > button, > input {
      cursor: not-allowed;
      background-color: grey;
      opacity: 0.3;

      &:hover {
        border-color: grey;
      }
    }
  }

  .error-message {
    color: red;
    margin: auto .2em;
  }

  .success-message {
    color: green;
    margin: auto .2em;
  }
</style>
