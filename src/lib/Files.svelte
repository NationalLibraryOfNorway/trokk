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

    let currentDirectory: FileTreeType | undefined = undefined;
    let readDirFailed: string | undefined = undefined;
    let scannerPathTree: FileTreeType[] = [];
    let stopWatching: UnlistenFn | void | null = null;
    const pathSeparator: string = path.sep;
    const uriPathSeparator: string = encodeURIComponent(pathSeparator);
    const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

    $: initGetFilesAndWatch(scannerPath);


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
        if (currentDirectory) {
            currentDirectory.children?.sort((a, b) => {
                if (a.path < b.path) return -1;
                if (a.path > b.path) return 1;
                return 0;
            });
        }
    });

    onDestroy(() => {
        unwatchFiles();
    });

    async function initGetFilesAndWatch(path: string = scannerPath): Promise<void> {
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
                    currentDirectory = firstDir;
                    await watchFiles();
                    createThumbnailsFromDirectory(currentDirectory.path);
                }
                readDirFailed = undefined;
            })
            .catch(err => {
                console.error(`An error occurred when reading directory \'${scannerPath}\': ${err}`);
                readDirFailed = err;
            });
    }

    // Used to update thumbnails to currentDirectory as they are generated,
    // without refreshing the whole tree.
    function addChildToCurrentDirectoryFromPath(path: string): void {
        if (currentDirectory) {
            path = path.substring(currentDirectory.path.length);
            const pathParts = path.split(pathSeparator).filter(part => part.length > 0);
            let currentNode: FileTreeType = currentDirectory;

            for (const part of pathParts) {
                if (!currentNode.children) {
                    currentNode.children = [];
                }

                let childNode = currentNode.children.find(child => child.name === part);

                if (!childNode) {
                    childNode = {
                        path: currentNode.path + pathSeparator + part,
                        name: part,
                        opened: false,
                        children: undefined
                    } as FileTreeType;
                    currentNode.children.push(childNode);
                }
                currentNode = childNode;
            }
        }
    }

    async function watchFiles() {
        await unwatchFiles();
        stopWatching = await watch(
            /* TODO
             * vi burde oppdatere til tauri V2 for bedre håndtering av events som skjer på disk
             * se f.eks. https://v2.tauri.app/reference/javascript/fs/#watcheventkindremove
             * Per nå har vi ingen måte å skille hva som skjer på disk, bare at noe har skjedd på en path.
             */
            scannerPath,
            async (events) => {
                console.log('event');
                console.log(events);
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
                        } else if (event.path.includes('.thumbnails')) {
                            addChildToCurrentDirectoryFromPath(event.path);
                        }
                        currentDirectory = currentDirectory; // To update view
                    } else {
                        await getFiles();
                    }
                }
            },
            { recursive: true }
        ).catch((err) => {
            console.error(err);
        });
    }

    async function getFiles() {
        readDir(scannerPath, { recursive: true })
            .then(async newFiles => {
                scannerPathTree = FileTreeType.fromFileEntry(newFiles).sort((a, b) => {
                    if (a.path < b.path) return -1;
                    if (a.path > b.path) return 1;
                    return 0;
                });
                readDirFailed = undefined;
                if (currentDirectory) {
                    let tmpCurrentDir = findCurrentDir(scannerPathTree);
                    if (tmpCurrentDir)
                        currentDirectory = tmpCurrentDir;
                    else
                        currentDirectory = undefined;
                }
            })
            .catch(err => {
                console.error(err);
                readDirFailed = err;
                scannerPathTree = [];
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
                if (currentDirectory)
                    getFiles();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    function changeViewDirectory(fileTree: FileTreeType, generateThumbnails: boolean = true): void {
        currentDirectory = fileTree;
        if (fileTree.children && fileTree.children.length > 0) {
            if (generateThumbnails) {
                createThumbnailsFromDirectory(currentDirectory.path);
            }
        }
    }

    function findCurrentDir(fileEntries: FileTreeType[]): FileTreeType | undefined {
        for (const fileEntry of fileEntries) {
            if (fileEntry.path === currentDirectory.path) return fileEntry;
            else if (fileEntry.children) {
                const result = findCurrentDir(fileEntry.children);
                if (result) return result;
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

    function getThumbnailExtensionFromCurrentDirectory(filename: string): string | undefined {
        let foundThumbnail = getThumbnailFromCurrentDirectory(filename);
        if (foundThumbnail) {
            return getFileExtension(foundThumbnail.name);
        }
        return undefined;
    }

    function getThumbnailURIFromCurrentDirectory(filename: string): string | undefined {
        let foundThumbnail = getThumbnailFromCurrentDirectory(filename);
        if (foundThumbnail) {
            return convertFileSrc(foundThumbnail.path);
        }
        return undefined;
    }

    function getThumbnailFromCurrentDirectory(filename: string): FileTreeType | undefined {
        let thumbnailDirectory = currentDirectory.children?.find(child => child.name == '.thumbnails');
        if (thumbnailDirectory) {
            let foundThumbnail = thumbnailDirectory
                .children
                ?.find( // Compare only names and not file extensions
                    thumbnail => thumbnail.name.split('.')[0] == filename.split('.')[0]
                );
            if (foundThumbnail) {
                return foundThumbnail;
            }
        }
        return undefined;
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
                {#if currentDirectory && currentDirectory.children}
                    {#if currentDirectory.children.length !== 0}
                        {#each currentDirectory.children as child}
                            {#if !child.name.startsWith('.thumbnails') && child.children}
                                <button class="directory" on:click={() => changeViewDirectory(child)}>
                                    <Folder size="96" />
                                    <i>{child.name}</i>
                                </button>
                            {:else}
                                {#if supportedFileTypes.includes(getFileExtension(child.path))}
                                    <div>
                                        <img src={convertFileSrc(child.path)} alt={child.name} />
                                        <i>{formatFileNames(child.name)}</i>
                                    </div>
                                {:else if getThumbnailExtensionFromCurrentDirectory(child.name) === 'webp' }
                                    <div>
                                        <img src={getThumbnailURIFromCurrentDirectory(child.name)} alt={child.name} />
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
            {#if currentDirectory && currentDirectory.path}
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
