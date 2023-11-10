<script lang="ts">
    import {createEventDispatcher, onMount} from "svelte";

    export let scannerPath: string
    const dispatch = createEventDispatcher()
    let tmpPath: string

    onMount(() => {
        tmpPath = scannerPath
    })

    function dispatchSave() {
        dispatch("save", {newPath: tmpPath})
    }
</script>

<form on:submit|preventDefault={() => dispatchSave()}>
    <label for="scannerPath">Skanner kilde</label>
    <input type="text" id="scannerPath" bind:value={tmpPath}/>
    <button type="submit">Save</button>
</form>