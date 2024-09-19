<script lang="ts">
    import { beforeUpdate, onDestroy, onMount } from 'svelte';
    import { convertFileSrc } from '@tauri-apps/api/core';
    import RegistrationSchema from './RegistrationSchema.svelte';
    import FileTree from './FileTree.svelte';
    import { ChevronsDownUp, ChevronsUpDown, File, Folder } from 'lucide-svelte';
    import { FileTree as FileTreeType, TrokkFiles } from './model/file-tree';
    import { formatFileNames } from './util/file-utils';
    import Split from 'split.js';
    import type { AllTransferProgress } from './model/transfer-progress';
    import { writable, type Writable } from 'svelte/store';

    export let scannerPath: string;
    export let useS3: boolean;

    let allUploadProgress: Writable<AllTransferProgress> = writable<AllTransferProgress>({ dir: {} });
    let readDirFailed: string | undefined = undefined;
    let scannerFiles: TrokkFiles;

    const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

    $: initScannerFiles(scannerPath);

    onMount(async () => {
        // Applies the .gutter class from styles.css to the specified elements
        Split(['#left-pane', '#middle-pane', '#right-pane'], {
            sizes: [20, 60, 20],
            minSize: [5, 10, 5],
            gutterSize: 3,
            direction: 'horizontal'
        });
    });

    beforeUpdate(() => {
        if (scannerFiles.current) {
            scannerFiles.current.children?.sort((a, b) => {
                if (a.path < b.path) return -1;
                if (a.path > b.path) return 1;
                return 0;
            });
        }
    });

    onDestroy(() => {
        scannerFiles.reset();
    });

    async function initScannerFiles(path: string): Promise<void> {
        scannerFiles = new TrokkFiles(path);
        await scannerFiles.initGetFilesAndWatch();
        readDirFailed = undefined;
        console.debug('scannerFiles', scannerFiles);
    }

    function getFileExtension(path: string): string {
        return path?.split('.')?.pop() || '';
    }

    function getThumbnailExtensionFromTree(tree: FileTreeType): string | undefined {
        let foundThumbnail = scannerFiles.getThumbnailFromTree(tree);
        if (foundThumbnail) {
            return getFileExtension(foundThumbnail.name);
        }
        return undefined;
    }

    function getThumbnailURIFromTree(tree: FileTreeType): string | undefined {
        let foundThumbnail = scannerFiles.getThumbnailFromTree(tree);
        if (foundThumbnail) {
            return convertFileSrc(foundThumbnail.path);
        }
        return undefined;
    }

</script>

{#if !readDirFailed}
    <div class="files-container">
        <div id="left-pane" data-testid="left-pane" class="pane sticky-top">
            <div class="icon-btn-group">
                <button class="expand-btn" on:click={() => scannerFiles.setAllOpenedState(true)}>
                    <ChevronsUpDown size="14" />
                </button>
                <button class="expand-btn" on:click={() => scannerFiles.setAllOpenedState(false)}>
                    <ChevronsDownUp size="14" />
                </button>
            </div>
            {#key $scannerFiles}
                <FileTree fileTree={scannerFiles.fileTrees}
                    selectedDir={scannerFiles.current?.path}
                    bind:allUploadProgress
                    on:directoryChange={(event) => scannerFiles.changeViewDirectory(event.detail)}
                    on:toggleFolderExpand={(event) => scannerFiles.toggleFolderExpand(event.detail)} />
            {/key}
        </div>
        <div id="middle-pane" class="pane">
            <div class="images">
                {#key $scannerFiles}
                    <!-- TODO figure out how to only update on this stores '.current', for non buggy reloading -->
                    {#if scannerFiles.current && scannerFiles.current.children}
                        {#if scannerFiles.current.children.length !== 0}
                            {#each scannerFiles.current.children as child}
                                {#if !child.name.startsWith('.thumbnails') && child.isDirectory}
                                    <button class="directory"
                                        on:click={() => scannerFiles.changeViewDirectory(child, true, true)}>
                                        <Folder size="96" />
                                        <i>{child.name}</i>
                                    </button>
                                {:else}
                                    {#if supportedFileTypes.includes(getFileExtension(child.path))}
                                        <div>
                                            <img src={convertFileSrc(child.path)} alt={child.name} />
                                            <i>{formatFileNames(child.name)}</i>
                                        </div>
                                    {:else if getThumbnailExtensionFromTree(child) === 'webp' }
                                        <div>
                                            <img src={getThumbnailURIFromTree(child)} alt={child.name} />
                                            <i>{formatFileNames(child.name)}</i>
                                        </div>
                                    {:else if child.name !== '.thumbnails'}
                                        <div class="file">
                                            <File size="96" color="gray" />
                                            <i>{child.name}</i>
                                        </div>
                                    {/if}
                                {/if}
                            {/each}
                        {:else if scannerFiles.current.children.length === 0}
                            <p class="dir-help-text">
                                Ingen filer i mappen.
                            </p>
                        {/if}
                    {:else}
                        <p class="dir-help-text">
                            Velg en mappe i listen til venstre. <br>
                            Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                        </p>
                    {/if}
                {/key}
            </div>
        </div>
        <div id="right-pane" class="pane sticky-top">
            {#if scannerFiles.current && scannerFiles.current.path}
                <RegistrationSchema bind:currentPath="{scannerFiles.current.path}" bind:useS3 bind:allUploadProgress />
            {/if}
        </div>
    </div>
{:else}
    <p>Failed to read directory, {readDirFailed}</p>
{/if}


<style lang="scss">
  .sticky-top {
    position: sticky;
    top: 0;
  }

  .files-container {
    display: flex;
    height: 93vh;
  }

  .images {
    margin: 0 1em;
    display: flex;
    flex-flow: row wrap;
    justify-content: flex-start;
    align-content: flex-start;
  }

  img {
    width: 150px;
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    border: solid 3px gray;
    border-radius: 3px;

    &:hover {
      cursor: pointer;
      border: solid 3px red;
    }
  }

  .directory {
    width: 156px; // 3 + 3 extra width to keep same width as img (borders)
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    text-align: center;
    background: none;
    padding: 0;
    outline: none;
    box-shadow: none;

    &:hover {
      cursor: pointer;
      border: solid 3px deepskyblue;
    }
  }

  .file {
    width: 156px; // 3 + 3 extra width to keep same width as images (borders)
    min-height: 150px;
    max-height: fit-content;
    margin: auto .5em;
    object-fit: contain;
    text-align: center;
  }

  i {
    width: 150px;
    height: fit-content;
    display: block;
    text-align: center;
    overflow: visible;
    word-wrap: break-word;
  }

  .icon-btn-group {
    display: flex;
    width: 60px;
    justify-content: space-evenly;
    margin: 6px 0;
  }

  .expand-btn {
    border-radius: 3px;
    background: none;
    padding: 0;
    margin: 0;
    box-shadow: none;
  }

  .pane {
    overflow: auto;
  }

  .dir-help-text {
    margin: 2em;
    font-weight: bold;
    word-break: break-word;
  }
</style>
