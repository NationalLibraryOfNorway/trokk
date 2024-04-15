<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { invoke } from '@tauri-apps/api';
    import { settings } from './util/settings';
    import { readDir } from '@tauri-apps/api/fs';

    const dispatch = createEventDispatcher()
    let scannerPath: string
    let donePath: string
    let scanPathError: string | undefined
    let donePathError: string | undefined
    let scanPathSuccess: string | undefined
    let donePathSuccess: string | undefined

    onMount(async () => {
        scannerPath = await settings.scannerPath ?? '';
        donePath = await settings.donePath ?? '';
    })

    async function pickScannerPath() {
        await invoke<string>('pick_directory', {startPath: scannerPath})
            .then(path => saveScannerPath(path))
            .catch(error => console.log(error))
    }

    async function pickDonePath() {
        await invoke<string>('pick_directory', {startPath: donePath})
            .then(path => saveDonePath(path))
            .catch(error => console.log(error))
    }

    function saveScannerPath(path: string): void {
        readDir(path)
            .then(() => {
                scanPathError = undefined
                scannerPath = path
                dispatch('save', {newScanPath: path})
                scanPathSuccess = 'Lagret!'
                setTimeout(() => scanPathSuccess = undefined, 5000)
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) scanPathError = 'Dette er ikke en mappe'
                else scanPathError = 'Mappen eksisterer ikke'
            })
    }

    function saveDonePath(path: string): void {
        readDir(path)
            .then(() => {
                donePathError = undefined
                donePath = path
                dispatch('save', {newDonePath: path})
                donePathSuccess = 'Lagret!'
                setTimeout(() => donePathSuccess = undefined, 5000)
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) donePathError = 'Dette er ikke en mappe'
                else donePathError = 'Mappen eksisterer ikke'
            })
    }

</script>

<form on:submit|preventDefault class="settings-form">
    <div class="form-group">
        <label for="scannerPath">Skanner kilde</label>
        <button type="button" on:click={() => pickScannerPath()}>Velg mappe</button>
        <input type="text" id="scannerPath" bind:value={scannerPath}/>
        <button on:click={() => saveScannerPath(scannerPath)}>Lagre</button>
        {#if scanPathError}
            <p class="error-message">{scanPathError}</p>
        {/if}
        {#if scanPathSuccess}
            <p class="success-message">{scanPathSuccess}</p>
        {/if}
    </div>

    <div class="form-group">
        <label for="donePath">Ferdige objekter</label>
        <button type="button" on:click={() => pickDonePath()}>Velg mappe</button>
        <input type="text" id="donePath" bind:value={donePath}/>
        <button on:click={() => saveDonePath(donePath)}>Lagre</button>
        {#if donePathError}
            <p class="error-message">{donePathError}</p>
        {/if}
        {#if donePathSuccess}
            <p class="success-message">{donePathSuccess}</p>
        {/if}
    </div>
</form>

<style>
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

    .form-group input {
        width: 30em;
        margin: auto .2em;
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
