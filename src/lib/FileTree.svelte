<script lang="ts">
    import {type FileEntry} from '@tauri-apps/api/fs'
    import {FileImage, Folder} from 'lucide-svelte';
    import {createEventDispatcher} from "svelte";

    export let fileTree: FileEntry[] = []
    const dispatch = createEventDispatcher()

    function changeViewDirectory(file: FileEntry): void {
        dispatch('directoryChange', file)
    }

    function formatFileNames(fileName: string): string {
        if (fileName.endsWith('.tif')) return fileName.replace('.tif', '')
        if (fileName.endsWith('.webp')) return fileName.replace('.webp', '')
        return fileName
    }

</script>

<div>
    <ul>
        {#each fileTree as file}
            {#if file.children}
                <li>
                    <span
                        role="button"
                        tabindex={0}
                        on:click|preventDefault={() => changeViewDirectory(file)}
                        on:keydown|preventDefault={() => changeViewDirectory(file)}
                    >
                        <Folder size="16" color="orange" />
                        <span>{formatFileNames(file.name)}</span>
                    </span>
                    <ul>
                        <svelte:self fileTree={file.children} on:directoryChange />
                    </ul>
                </li>
            {:else}
                <li>
                    <span>
                        <FileImage size="16" color="orange" />
                        <span>{formatFileNames(file.name)}</span>
                    </span>
                </li>
            {/if}
        {/each}
    </ul>
</div>

<style lang="scss">
    li > span {
        &:hover {
            cursor: pointer;
            text-decoration: underline;
        }
    }

    li {
        list-style: none;
        white-space: nowrap;
    }

    ul {
        padding: 0;
        margin: auto 10px;
    }
</style>