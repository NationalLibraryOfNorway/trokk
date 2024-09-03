<script lang="ts">
    import { readDir } from '@tauri-apps/api/fs';
    import { beforeUpdate, onDestroy, onMount } from 'svelte';
    import { convertFileSrc } from '@tauri-apps/api/tauri';
    import RegistrationSchema from './RegistrationSchema.svelte';
    import { invoke, path } from '@tauri-apps/api';
    import FileTree from './FileTree.svelte';
    import { type DebouncedEvent, watch } from 'tauri-plugin-fs-watch-api';
    import { ChevronsDownUp, ChevronsUpDown, File, Folder } from 'lucide-svelte';
    import { FileTree as FileTreeType } from './model/file-tree';
    import { type UnlistenFn } from '@tauri-apps/api/event';
    import { formatFileNames } from './util/file-utils';
    import Split from 'split.js';
    import type { AllTransferProgress } from './model/transfer-progress';
    import { writable, type Writable } from 'svelte/store';
    import type { ConversionResult } from './model/thumbnail';


    export let scannerPath: string;
    export let useS3: boolean;
    let allUploadProgress: Writable<AllTransferProgress> = writable<AllTransferProgress>({ dir: {} });

    let currentDirectory: FileTreeType = { path: '', name: '', opened: false, children: [], thumbnail: undefined };//FileEntry | undefined = undefined;
    //let testViewDirectory: ViewDirectory | undefined = undefined;
    let readDirFailed: string | undefined = undefined;
    let scannerPathTree: FileTreeType[] = [];
    let stopWatching: UnlistenFn | void | null = null;
    const uriPathSeparator: string = encodeURIComponent(path.sep);
    const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

    $: getFileEntries(scannerPath);

    // TODO fix to that thumbnails is generated from default first directory

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
        currentDirectory.children?.sort((a, b) => {
            if (a.path < b.path) return -1;
            if (a.path > b.path) return 1;
            return 0;
        });
    });

    onDestroy(() => {
        unwatchFiles();
    });

    async function getFileEntries(path: string = scannerPath): Promise<void> {
        await unwatchFiles();
        await readDir(path, { recursive: true })
            .then(async newFiles => {
                scannerPathTree = FileTreeType.fromFileEntry(newFiles).sort((a, b) => {
                    if (a.path < b.path) return -1;
                    if (a.path > b.path) return 1;
                    return 0;
                });
                let firstDir = scannerPathTree.find((file: FileTreeType): boolean => {
                    return !!file.children;
                });
                if (firstDir) {
                    currentDirectory = {
                        path: firstDir.path,
                        name: firstDir.name,
                        children: firstDir.children,
                        thumbnail: undefined
                    } as FileTreeType;
                    await watchFiles();
                }
                setThumbnailsCurrentDirectory();
                createThumbnailsFromDirectory(currentDirectory.path);
                readDirFailed = undefined;
            })
            .catch(err => {
                console.error(`An error occurred when reading directory \'${scannerPath}\': ${err}`);
                readDirFailed = err;
            });
    }

    async function watchFiles() {
        await unwatchFiles();
        stopWatching = await watch(
            scannerPath,
            async (events) => {
                // API returns an array of objects, but says it returns a single object
                const debouncedEvents: DebouncedEvent[] = events as unknown as DebouncedEvent[];
                for (const eventD of debouncedEvents) {
                    let event: DebouncedEvent = eventD;
                    if (event.kind.toUpperCase() != 'ANY')
                        continue;
                    if (currentDirectory) {
                        // New tif file, create thumbnail
                        if (!event.path.includes('.thumbnails') && event.path.includes('.tif') && event.path == currentDirectory.path + path.sep + event.path.split(path.sep).pop()) {
                            createThumbnail(event.path);
                        } else if (event.path.includes('.thumbnails/') && event.path == currentDirectory.path + path.sep + '.thumbnails' + path.sep + event.path.split(path.sep).pop()) {
                            currentDirectory.children?.find((child: FileTreeType) => {
                                if (child.name.split('.')[0] === event.path.split(path.sep).pop().split('.')[0]) {
                                    child.thumbnail = {
                                        name: event.path.split(path.sep).pop(),
                                        path: event.path,
                                        imageSource: convertFileSrc(event.path)
                                    };
                                }
                            });

                        }
                        currentDirectory = currentDirectory; // To update view
                    } else if (getFileExtension(event.path) == 'thumbnails' || getFileExtension(event.path) == '') { // No '.', no file extension, assume new folder // TODO better folder stuff
                        // Assume event is new folder when no file extension
                        await readDir(scannerPath, { recursive: true })
                            .then(async newFiles => {
                                scannerPathTree = FileTreeType.fromFileEntry(newFiles).sort((a, b) => {
                                    if (a.path < b.path) return -1;
                                    if (a.path > b.path) return 1;
                                    return 0;
                                });
                                readDirFailed = undefined;
                            })
                            .catch(err => {
                                console.error(err);
                                readDirFailed = err;
                                scannerPathTree = [];
                            });
                    }
                }
            },
            { recursive: true }
        ).catch((err) => {
            console.error(err);
        });
    }

    async function unwatchFiles() {
        if (stopWatching) {
            stopWatching();
            stopWatching = null;
        }
    }

    function createThumbnail(path: string) {
        invoke('convert_to_webp', { filePath: path }).catch((err) => {
            console.error(err);
        });
    }

    function createThumbnailsFromDirectory(directoryPath: string) {
        invoke<ConversionResult>('convert_directory_to_webp', { directoryPath: directoryPath })
            .then((result) => {
                // Don't bother updating thumbnails if no new files were converted
                // as no new files could be missed from watcher then.
                if (result.converted > 0 && directoryPath == currentDirectory.path) {
                    setThumbnailsCurrentDirectory();
                }
            })
            .catch((err) => {
                console.error(err);
            });
    }

    function setThumbnailsCurrentDirectory(): void {
        const thumbnailsTree = currentDirectory.children?.find((child: FileTreeType) => child.name === '.thumbnails');
        currentDirectory.children?.forEach((file: FileTreeType) => {
            if (file.thumbnail || file.name.startsWith('.thumbnails') || file.children) {
                // Already has thumbnail or is a directory
                return;
            }
            if (thumbnailsTree && thumbnailsTree.children && !!file.name && !file.name.startsWith('.thumbnails') && file.name.endsWith('.tif')) {
                let thumbnail = thumbnailsTree.children.find((child: FileTreeType) => child.name.split('.')[0] === file.name.split('.')[0]);
                if (thumbnail) {
                    file.thumbnail = {
                        name: thumbnail.name,
                        path: thumbnail.path,
                        imageSource: convertFileSrc(thumbnail.path)
                    };
                }
            } else if (!file.name.startsWith('.thumbnails') && supportedFileTypes.includes(getFileExtension(file.path))) {
                file.thumbnail = {
                    name: file.name,
                    path: file.path,
                    imageSource: convertFileSrc(file.path)
                };
            }
        });
        currentDirectory = currentDirectory;
    }

    function changeViewDirectory(fileTree: FileTreeType, generateThumbnails: boolean = true): void {
        currentDirectory = fileTree;
        if (fileTree.children && fileTree.children.length > 0) {
            if (generateThumbnails) {
                createThumbnailsFromDirectory(currentDirectory.path);
            }
            if (currentDirectory.children) {
                setThumbnailsCurrentDirectory();
            }
        }
    }

    function toggleExpand(expand: boolean): void {
        scannerPathTree.forEach(entry => {
            entry.opened = expand;
            if (entry.children) {
                entry.children.forEach(child => {
                    child.opened = expand;
                });
            }
        });
        scannerPathTree = scannerPathTree;
    }

    function getFileExtension(path: string): string {
        return path?.split('.')?.pop() || '';
    }

</script>

{#if !readDirFailed}
    <div class="files-container">
        <div id="left-pane" data-testid="left-pane" class="pane sticky-top">
            <div class="icon-btn-group">
                <button class="expand-btn" on:click={() => toggleExpand(true)}>
                    <ChevronsUpDown size="14" />
                </button>
                <button class="expand-btn" on:click={() => toggleExpand(false)}>
                    <ChevronsDownUp size="14" />
                </button>
            </div>
            <FileTree fileTree={scannerPathTree} selectedDir={currentDirectory?.path}
                bind:allUploadProgress on:directoryChange={(event) => changeViewDirectory(event.detail)} />
        </div>
        <div id="middle-pane" class="pane">
            <div class="images">
                {#if currentDirectory && !!currentDirectory.children}
                    {#if currentDirectory.children.length !== 0}
                        {#each currentDirectory.children as child}
                            {#if !child.name.startsWith('.thumbnails') && child.children}
                                <button class="directory" on:click={() => changeViewDirectory(child)}>
                                    <Folder size="96" />
                                    <i>{child.name}</i>
                                </button>
                            {:else}
                                {#if child.thumbnail && supportedFileTypes.includes(getFileExtension(child.thumbnail.imageSource))}
                                    <div>
                                        <img src={child.thumbnail.imageSource} alt={child.thumbnail.name} />
                                        <i>{formatFileNames(child.thumbnail.imageSource.split(uriPathSeparator).pop())}</i>
                                    </div>
                                {:else if child.thumbnail}
                                    <div class="file">
                                        <File size="96" color="gray" />
                                        <i>{child.thumbnail.imageSource.split(uriPathSeparator).pop()}</i>
                                    </div>
                                {:else if !child.name.startsWith('.thumbnails')}
                                    <div class="file">
                                        <File size="96" color="gray" />
                                        <i>{child.name}</i>
                                    </div>
                                {/if}
                            {/if}
                        {/each}
                    {:else if currentDirectory.children.length === 0}
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
            </div>
        </div>
        <div id="right-pane" class="pane sticky-top">
            {#if currentDirectory.path}
                <RegistrationSchema bind:currentPath="{currentDirectory.path}" bind:useS3 bind:allUploadProgress />
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
