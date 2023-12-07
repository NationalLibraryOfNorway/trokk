<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";

    export let scannerPath: string
    export let donePath: string

    const dispatch = createEventDispatcher()
    let tmpScannerPath: string
    let tmpDonePath: string

    onMount(() => {
        tmpScannerPath = scannerPath;
        tmpDonePath = donePath;
    })

    function dispatchSave() {
        dispatch("save", {
            newScanPath: tmpScannerPath,
            newDonePath: tmpDonePath
        })
    }
</script>

<form on:submit|preventDefault={() => dispatchSave()}>
    <label for="scannerPath">Skanner kilde</label>
    <input type="text" id="scannerPath" bind:value={tmpScannerPath}/>

    <label for="donePath">Mappe for ferdige objekter</label>
    <input type="text" id="donePath" bind:value={tmpDonePath}/>

    <button type="submit">Save</button>
</form>
