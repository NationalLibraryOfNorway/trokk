<script lang="ts">
    import {type FileEntry} from '@tauri-apps/api/fs'
    import {ChevronDown, ChevronRight, FileImage, Folder, FolderOpen} from 'lucide-svelte';
    import {beforeUpdate, createEventDispatcher} from "svelte";

    export let fileTree: FileTree[] = []
    const dispatch = createEventDispatcher()

    beforeUpdate(() => {
        fileTree = sortFileTree();
    })

    function sortFileTree(): FileTree[] {
        return fileTree.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
    }

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
                    {#if file.opened}
                        <span on:click={() => file.opened = !file.opened} >
                            <ChevronDown size="16" color="gray"/>
                        </span>
                    {:else}
                        <span on:click={() => file.opened = !file.opened} >
                            <ChevronRight size="16" color="gray"/>
                        </span>
                    {/if}
                    <span
                        role="button"
                        tabindex={file.index}
                        on:dblclick|preventDefault={() => changeViewDirectory(file)}
                        on:keydown|preventDefault={() => changeViewDirectory(file)}
                    >
                        <Folder size="16"/>
                        <span>{formatFileNames(file.name)}</span>
                    </span>
                    {#if file.opened}
                        <ul>
                            <svelte:self fileTree={file.children} on:directoryChange />
                        </ul>
                    {/if}
                </li>
            {:else}
                <li>
                    <span class="file">
                        <FileImage size="16"/>
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

    .file {
      margin-left: 16px;
    }
</style>