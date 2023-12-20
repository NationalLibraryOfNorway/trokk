<script lang="ts">
    import {ChevronDown, ChevronRight, FileImage, Folder, FolderOpen} from 'lucide-svelte';
    import {beforeUpdate, createEventDispatcher} from "svelte";
    import {FileTree} from "./model/file-tree";
    import {formatFileNames} from "./util/file-utils";

    export let fileTree: FileTree[] = []
    export let selectedDir: string = ''
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

    function getSelectedDirectoryHighlight(dirName: string): string {
        return dirName === selectedDir ? 'selected-dir' : ''
    }

</script>

<div>
    <ul>
        {#each fileTree as file}
            {#if file.children}
                <li class="directory-list-item {getSelectedDirectoryHighlight(file.path)}">
                    <button
                        class="clickable-list-item"
                        on:click|preventDefault={() => changeViewDirectory(file)}
                        on:keydown|preventDefault={() => changeViewDirectory(file)}
                    >
                        {#if !file.name.startsWith('.')}
                            {#if file.opened}
                                <span>
                                    <button class="expand-btn" on:click={() => file.opened = !file.opened}>
                                        <ChevronDown size="16" color="gray"/>
                                    </button>
                                    <FolderOpen size="16"/>
                                    <span>{formatFileNames(file.name)}</span>
                                </span>
                            {:else}
                                <span>
                                    <button class="expand-btn" on:click={() => file.opened = !file.opened}>
                                        <ChevronRight size="16" color="gray"/>
                                    </button>
                                    <Folder size="16"/>
                                    <span>{formatFileNames(file.name)}</span>
                                </span>
                            {/if}
                        {/if}
                        {#if file.opened && !file.name.startsWith('.')}
                            <ul>
                                <svelte:self fileTree={file.children} on:directoryChange />
                            </ul>
                        {/if}
                    </button>
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

    %no-style-button {
        text-align: start;
        background: none;
        color: inherit;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        outline: inherit;
        box-shadow: none;
    }

    .expand-btn {
        @extend %no-style-button;
    }

    .clickable-list-item {
        @extend %no-style-button;
        width: 100%;
    }

    .directory-list-item {
        &:hover {
            background-color: rgba(180, 193, 208, 0.55);
            border-radius: 5px;
            cursor: pointer;
        }
        &:active {
            background-color: rgba(79, 122, 168, 0.55);
        }
    }

    .selected-dir {
        width: 100%;
        background-color: rgba(19, 91, 168, 0.55);
        border-radius: 5px;
    }
</style>