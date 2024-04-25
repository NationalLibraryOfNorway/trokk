<script lang="ts">
    import { type FileEntry, readDir } from '@tauri-apps/api/fs';
    import { beforeUpdate, onDestroy, onMount } from 'svelte';
    import { convertFileSrc } from '@tauri-apps/api/tauri';
    import RegistrationSchema from './RegistrationSchema.svelte';
    import { invoke, path } from '@tauri-apps/api';
    import FileTree from './FileTree.svelte';
    import { type DebouncedEvent, watch } from 'tauri-plugin-fs-watch-api';
    import { ChevronsDownUp, ChevronsUpDown, File, Folder } from 'lucide-svelte';
    import { FileTree as FileTreeType } from './model/file-tree';
    import { type UnlistenFn } from '@tauri-apps/api/event';
    import { type ViewDirectory, type ViewFile } from './model/view-file';
    import { formatFileNames } from './util/file-utils';
    import Split from 'split.js';
    import type { AllTransferProgress } from './model/transfer-progress';
    import { writable, type Writable } from 'svelte/store';
    import TransferLog from './TransferLog.svelte'


    export let scannerPath: string;
    export let useS3: boolean;
    let allUploadProgress: Writable<AllTransferProgress> = writable<AllTransferProgress>({ dir: {} });

    let currentViewDirectory: ViewDirectory = { path: '', name: '', opened: false, children: [], viewFiles: [] };//FileEntry | undefined = undefined;
    //let testViewDirectory: ViewDirectory | undefined = undefined;
    let readDirFailed: string | undefined = undefined;
    let fileTree: FileTreeType[] = [];
    let viewFiles: ViewFile[] = [];
    let stopWatching: UnlistenFn | void | null = null;
    const uriPathSeparator: string = encodeURIComponent(path.sep);
    const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

    $: getFileEntries(scannerPath);

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
        sortViewDirectoryChildren();
    });

    onDestroy(() => {
        unwatchFiles();
    });

    async function getFileEntries(path: string = scannerPath): Promise<FileTreeType[]> {
        console.log('Getting file entries...');
        await unwatchFiles();
        return await readDir(path, { recursive: true })
            .then(async newFiles => {
                console.log('Reading directory...');
                newFiles.sort((a, b) => {
                    if (a.path < b.path) return -1;
                    if (a.path > b.path) return 1;
                    return 0;
                });
                let firstDir = newFiles.find((file: FileEntry): boolean => {
                    return !!file.children;
                });
                if (firstDir) {
                    let firstDirFileTree = FileTreeType.fromFileEntry([firstDir])[0];
                    currentViewDirectory = {
                        path: firstDir.path,
                        name: firstDir.name,
                        children: firstDirFileTree.children,
                        viewFiles: []
                    } as ViewDirectory;
                    addViewFilesFromChildren(firstDirFileTree, false);
                }
                console.log('File entries read...');

                readDirFailed = undefined;
                const newFileTree = FileTreeType.fromFileEntry(newFiles);
                fileTree = newFileTree;
                watchFiles();
                return newFileTree;
            })
            .catch(err => {
                console.error(`An error occurred when reading directory \'${scannerPath}\': ${err}`);
                readDirFailed = err;
                return [];
            });
    }

    /*    function sortViewFiles(): ViewFile[] {
            return viewFiles.sort((a, b) => {
                if (a.fileEntry.path < b.fileEntry.path) return -1;
                if (a.fileEntry.path > b.fileEntry.path) return 1;
                return 0;
            });
        }  */

    function sortViewDirectoryChildren() {
        currentViewDirectory.children = currentViewDirectory.children
            .sort((a, b) => {
                if (a.path < b.path) return -1;
                if (a.path > b.path) return 1;
                return 0;
            });
    }

    // TODO ide
    // watch here also updates the filelist
    // do we need a new watch to only update thumbnails in currentDir?

    async function watchFiles() {
        await unwatchFiles();
        console.log('Watching files...');
        stopWatching = await watch(
            scannerPath,
            async (events) => {
                // API returns an array of objects, but says it returns a single object
                const debouncedEvents: DebouncedEvent[] = events as unknown as DebouncedEvent[];
                console.log(typeof events);
                console.log(events);
                console.log(debouncedEvents);
                for (const eventD of debouncedEvents) {
                    let event: DebouncedEvent = eventD;
                    if (event.kind.toUpperCase() != 'ANY')
                        continue;
                    console.log(event);
                    console.log(currentViewDirectory);
                    console.log(event.path);
                    console.log(currentViewDirectory?.path + path.sep + event.path.split(path.sep).pop());
                    if (currentViewDirectory) {
                        // New tif file, create thumbnail
                        if (!event.path.includes('.thumbnails') && event.path.includes('.tif') && event.path == currentViewDirectory.path + path.sep + event.path.split(path.sep).pop()) {
                            console.log(`Event: ${event}`);
                            console.log(event);

                            createThumbnail(event.path);
                        /*if (currentPath && !await exists(currentPath)) currentPath = undefined;                                                                                                                 }*/
                        } else if (event.path.includes('.thumbnails/') && event.path == currentViewDirectory.path + path.sep + '.thumbnails' + path.sep + event.path.split(path.sep).pop()) {
                            console.log(`ThumbnailEvent: ${event}`);
                            console.log(event);
                            currentViewDirectory.viewFiles.push({
                                path: event.path,
                                name: event.path.split(path.sep).pop(),
                                imageSource: convertFileSrc(event.path)
                            } as ViewFile);

                        }
                        currentViewDirectory = currentViewDirectory; // To update view
                        console.log(currentViewDirectory);
                    } else if (!event.path.includes('.')) { // No '.', no file extension, assume new folder
                        // Assume event is new folder when no file extension
                        await readDir(scannerPath, { recursive: true })
                            .then(async newFiles => {
                                fileTree = FileTreeType.fromFileEntry(newFiles).sort((a, b) => {
                                    if (a.path < b.path) return -1;
                                    if (a.path > b.path) return 1;
                                    return 0;
                                });
                                readDirFailed = undefined;
                            })
                            .catch(err => {
                                console.error(err);
                                readDirFailed = err;
                                fileTree = [];
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
            console.log('Unwatching files...');
            stopWatching();
            stopWatching = null;
        }
    }

    function findCurrentDir(fileEntries: FileTreeType[]): FileTreeType | undefined {
        for (const fileEntry of fileEntries) {
            if (fileEntry.path === currentViewDirectory?.path) return fileEntry;
            else if (fileEntry.children) {
                const result = findCurrentDir(fileEntry.children);
                if (result) return result;
            }
        }
    }

    function createThumbnail(path: string) {
        invoke('convert_to_webp', { filePath: path }).catch((err) => {
            console.error(err);
        });
    }

    function createThumbnailsFromDirectory(directoryPath: string) {
        // TODO use result, update viewFiles last time
        invoke('convert_directory_to_webp', { directoryPath: directoryPath })
            .then((result) => {
                console.log(result);
                // TODO update viewFiles
                viewFiles = [];
            // getFileEntries();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    function addViewFilesFromChildren(fileTree: FileTreeType, generateThumbnails: boolean = true) {
        console.log('INSIDEAdding view files from children...');
        console.log(fileTree);
        fileTree?.children?.forEach((file: FileTreeType) => {
            // Show all files except the .thumbnail directory and tif files
            console.log(file);
            if (!!file.name && !file.name?.startsWith('.thumbnails') && !file.name?.endsWith('.tif')) {
                currentViewDirectory.viewFiles.push({
                    name: file.name,
                    path: file.path,
                    imageSource: convertFileSrc(file.path)
                });
            }
            // If the current file is the .thumbnail directory, add all files in it
            else if (file.children && file.path.endsWith('.thumbnails')) {
                addViewFilesFromChildren(file);
            }
            console.log('Adding view files from children...');
        });
        console.log(currentViewDirectory.viewFiles);
        console.log(currentViewDirectory.children);
    }

    function changeViewDirectory(fileTree: FileTreeType, generateThumbnails: boolean = true): void {
        currentViewDirectory = { ...fileTree, viewFiles: [] } as ViewDirectory;
        console.log('Changing view directory...');
        if (generateThumbnails) {
            createThumbnailsFromDirectory(currentViewDirectory.path);
        }
        if (fileTree.children) {
            addViewFilesFromChildren(fileTree, false);
        } else {
            currentViewDirectory.viewFiles.push({
                name: fileTree.name ? fileTree.name : '',
                path: fileTree.path,
                imageSource: convertFileSrc(fileTree.path)
            });
        }
    }

    function toggleExpand(expand: boolean): void {
        fileTree.forEach(entry => {
            entry.opened = expand;
            if (entry.children) {
                entry.children.forEach(child => {
                    child.opened = expand;
                });
            }
        });
        fileTree = [...fileTree];
    }

    function getFileExtension(path: string): string {
        return path?.split('.')?.pop() || '';
    }

    function getCorrespondingViewFile(fileTree: FileTreeType): ViewFile | undefined {
        return currentViewDirectory?.viewFiles?.find(viewFile => viewFile.name.split('.')[0] === fileTree.name.split('.')[0]);
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
            <FileTree fileTree={fileTree} selectedDir={currentViewDirectory?.path}
               bind:allUploadProgress on:directoryChange={(event) => changeViewDirectory(event.detail)} />
        </div>
        <div id="middle-pane" class="pane">
            <div class="images">
                {#if currentViewDirectory && !!currentViewDirectory.children}
                    {#if currentViewDirectory.children.length !== 0}
                        {#each currentViewDirectory.children as child}
                            {#if !child.name.startsWith('.thumbnails') && child.children}
                                <button class="directory" on:click={() => changeViewDirectory(child)}>
                                    <Folder size="96" />
                                    <i>{child.name}</i>
                                </button>
                            {:else}
                                {@const viewFile = getCorrespondingViewFile(child)}
                                {#if viewFile && supportedFileTypes.includes(getFileExtension(viewFile.imageSource))}
                                    <div>
                                        <img src={viewFile.imageSource} alt={viewFile.name} />
                                        <i>{formatFileNames(viewFile.imageSource.split(uriPathSeparator).pop())}</i>
                                    </div>
                                {:else if viewFile}
                                    <div class="file">
                                        <File size="96" color="gray" />
                                        <i>{viewFile.imageSource.split(uriPathSeparator).pop()}</i>
                                    </div>
                                {:else if !child.name.startsWith('.thumbnails')}
                                    <div class="file">
                                        <File size="96" color="gray" />
                                        <i>{child.name}</i>
                                    </div>
                                {/if}
                            {/if}
                            <!-- TODO use filelist in combination with viewfiles. So all images are "shown" while generating thumbnails -->

                        {/each}
                    {:else}
                        <p class="dir-help-text">
                            Velg en mappe i listen til venstre. <br>
                            Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                        </p>
                    {/if}
                {/if}
            </div>
        </div>
        <div id="right-pane" class="pane sticky-top">
            {#if currentViewDirectory.path}
                <RegistrationSchema bind:currentPath="{currentViewDirectory.path}" bind:useS3 bind:allUploadProgress />
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
