<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";
    import {invoke} from "@tauri-apps/api";
    import {settings} from "./util/settings";

    const dispatch = createEventDispatcher()
    let scannerPath: string
    let donePath: string

    onMount(async () => {
        scannerPath = await settings.scannerPath;
        donePath = await settings.donePath;
    })

    async function pickScannerPath() {
        await invoke<string>('pick_directory', {startPath: scannerPath})
            .then(path => {
                scannerPath = path
                dispatch("save", {newScanPath: path})
            })
            .catch(error => console.log(error))
    }

    async function pickDonePath() {
        await invoke<string>('pick_directory', {startPath: donePath})
            .then(path => {
                donePath = path
                dispatch("save", {newDonePath: path})
            })
            .catch(error => console.log(error))
    }

</script>

<form on:submit|preventDefault class="settings-form">
    <div class="form-group">
        <label for="scannerPath">Skanner kilde</label>
        <button on:click={() => pickScannerPath()}>Velg mappe</button>
        <input disabled type="text" id="scannerPath" bind:value={scannerPath}/>
    </div>

    <div class="form-group">
        <label for="donePath">Ferdige objekter</label>
        <button on:click={() => pickDonePath()}>Velg mappe</button>
        <input disabled type="text" id="donePath" bind:value={donePath}/>
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
</style>
