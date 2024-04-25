<script lang="ts">
    import { ChevronRight, FileImage, Folder, FolderOpen, Upload } from 'lucide-svelte';
    import { beforeUpdate, createEventDispatcher, onMount } from 'svelte';
    import { FileTree } from './model/file-tree';
    import { formatFileNames } from './util/file-utils';
    import {writable, type Writable} from 'svelte/store';
    import { type AllTransferProgress, calculateProgress } from './model/transfer-progress';

    export let fileTree: FileTree[] = [];
    export let selectedDir: string = '';
    export let allUploadProgress: Writable<AllTransferProgress> = writable<AllTransferProgress>({ dir: {} });
    let uploadProgress: AllTransferProgress = { dir: {} };
    const dispatch = createEventDispatcher();

    beforeUpdate(() => {
        fileTree = sortFileTree();
    });

    onMount(() => {
        allUploadProgress.subscribe(value => {
            uploadProgress = value;
        });
    });

    function sortFileTree(): FileTree[] {
        return fileTree.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
    }

    function changeViewDirectory(file: FileTree): void {
        console.log('FileTree');
        console.log(file);
        dispatch('directoryChange', file);
    }

    function getSelectedDirectoryHighlight(dirName: string): string {
        return dirName === selectedDir ? 'selected-dir' : '';
    }
</script>

<div>
    <ul>
        {#each fileTree as file}
            {#if file.children}
                <li>
                    {#if !file.name.startsWith('.')}
                        <button
                            class="directory-list-item {getSelectedDirectoryHighlight(file.path)}"
                            on:click|preventDefault={() => changeViewDirectory(file)}
                            on:keydown|preventDefault={() => changeViewDirectory(file)}
                        >
                            <span class="filename">
                                <button class="expand-btn" on:click={() => file.opened = !file.opened}>
                                    <ChevronRight size="16" color="gray" />
                                    </button>{#if file.opened}
                                    <FolderOpen size="16" />
                                {:else}
                                    <Folder size="16" />
                                {/if}
                                <span>{formatFileNames(file.name)}</span>
                            </span>
                            {#if uploadProgress.dir[file.path]}
                                <span class="progress" data-testid="progress-bar">
                                    {calculateProgress(uploadProgress.dir[file.path])}
                                    &nbsp;
                                    <Upload style="margin-bottom: 6px" size="16" />

                                </span>
                            {/if}
                        </button>
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
                        <FileImage size="16" />
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

  .directory-list-item {
    @extend %no-style-button;
    width: 100%;

display: flex;
    flex-direction: row;
    justify-content: space-between;

    .filename {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }    &:hover {
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

  .progress {
    color: rgb(255, 70, 70);
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
  }
</style>