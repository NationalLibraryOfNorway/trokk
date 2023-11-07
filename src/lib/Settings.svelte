<script lang="ts">
    import {onMount, tick} from "svelte";

    export let scannerPath: string
    let tmpPath: string

    $: {
        console.log("ComponsentSettings", scannerPath)
        tick();
    }

    onMount(() => {
        tmpPath = scannerPath
    })

    async function save() {
        scannerPath = tmpPath
        console.log("saveeee", scannerPath)
    }
</script>

<form on:submit|preventDefault={save}>
    <label for="scannerPath">Skanner kilde</label>
    <input type="text" id="scannerPath" bind:value={tmpPath}/>
    <button type="submit">Save</button>
</form>

<h1>
    settings {scannerPath}
</h1>
