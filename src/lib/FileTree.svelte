<script lang="ts">
    import {ChevronDown, ChevronRight, FileImage, Folder, FolderOpen} from 'lucide-svelte';
    import {beforeUpdate, createEventDispatcher} from "svelte";
    import {FileTree} from "./model/file-tree";
    import {formatFileNames} from "./util/file-utils";

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

    function changeViewDirectory(file: FileTree): void {
        dispatch('directoryChange', file)
    }

</script>

<div>
    <ul>
        {#each fileTree as file}
            {#if file.children}
                <li>
                    {#if !file.name.startsWith('.')}
                        {#if file.opened}
                            <button class="expand-btn" on:click={() => file.opened = !file.opened}>
                                <ChevronDown size="16" color="gray"/>
                            </button>
                            <button
                                class="expand-btn"
                                on:click|preventDefault={() => changeViewDirectory(file)}
                                on:keydown|preventDefault={() => changeViewDirectory(file)}
                            >
                                <FolderOpen size="16"/>
                                <span>{formatFileNames(file.name)}</span>
                            </button>
                        {:else}
                            <button class="expand-btn" on:click={() => file.opened = !file.opened}>
                                <ChevronRight size="16" color="gray"/>
                            </button>
                            <button
                                class="expand-btn"
                                on:click|preventDefault={() => changeViewDirectory(file)}
                                on:keydown|preventDefault={() => changeViewDirectory(file)}
                            >
                                <Folder size="16"/>
                                <span>{formatFileNames(file.name)}</span>
                            </button>
                        {/if}
                    {/if}
                    {#if file.opened && !file.name.startsWith('.')}
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

    .expand-btn {
        border: none;
        background: none;
        padding: 0;
        margin: 0;
        outline: none;
        box-shadow: none;
    }
</style>