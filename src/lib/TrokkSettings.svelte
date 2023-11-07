<script lang="ts">
    import {Store} from "tauri-plugin-store-api";
    import {documentDir} from "@tauri-apps/api/path";
    import {onMount} from "svelte";

    let store = new Store(".settings.dat");

    export let scannerPath: string;

    onMount(async () => {
        store.get<string>("scannerPath").then(async (savedPath) => {
            if (savedPath) {
                console.log("saveed", savedPath)
                scannerPath = savedPath;
            } else {
                console.log("not saved", savedPath)
                let defaultPath = await documentDir() + "trokk/files"
                await store.set("scannerPath", defaultPath).then(() => {
                    scannerPath = defaultPath;
                })
            }
        })
    })

    $: {
        console.log("saving", scannerPath)
        store.set("scannerPath", scannerPath)
        store.save()
    }
</script>