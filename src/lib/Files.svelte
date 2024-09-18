<script lang="ts">
    import {
        type DirEntry,
        readDir,
        type WatchEventKind,
        type WatchEventKindAccess,
        watchImmediate
    } from '@tauri-apps/plugin-fs';
    import { beforeUpdate, onDestroy, onMount } from 'svelte';
    import { convertFileSrc, invoke } from '@tauri-apps/api/core';
    import { path } from '@tauri-apps/api';
    import RegistrationSchema from './RegistrationSchema.svelte';
    import FileTree from './FileTree.svelte';
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
    let scannerPathMap = new Map<string, FileTreeType>();
    let stopWatching: UnlistenFn | void | null = null;
    const pathSeparator: string = path.sep();
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
        await readDirRecursivelyInit();
        let firstDir = scannerPathTree.find((file: FileTreeType): boolean => {
            return file.isDirectory;
        });
        if (firstDir) {
            currentDirectory = firstDir;
            await watchFiles();
            createThumbnailsFromDirectory(currentDirectory.path);
        }
        readDirFailed = undefined;
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

                let childNode = scannerPathMap.get(currentNode.path + pathSeparator + part);

                if (!childNode) {
                    childNode = {
                        path: currentNode.path + pathSeparator + part,
                        name: part,
                        opened: false,
                        children: undefined
                    } as FileTreeType;
                    currentNode.children.push(childNode);
                    scannerPathMap.set(childNode.path, childNode);
                }
                currentNode = childNode;
            }
        }
    }

    function addChildToScannerPathTree2(pathToAdd: string): void {
        if (!scannerPathTree)
            return;
        pathToAdd = pathToAdd.substring(scannerPath.length);
        const pathParts = pathToAdd.split(pathSeparator).filter(part => part.length > 0);
        let currentNode: FileTreeType | undefined = scannerPathMap.get(pathToAdd + pathSeparator + pathParts[0]);
        console.log('addPath', pathToAdd, currentNode);
        let parentChildren: FileTreeType[] | undefined = scannerPathTree;

        for (const part of pathParts) {
            if (!parentChildren) {
                return; // No children to add to
            }

            let childNode: FileTreeType | undefined = parentChildren.find(child => child.name === part);

            if (!childNode) {
                childNode = new FileTreeType(
                    part, // name
                    false, // isDirectory
                    true, // isFile
                    false, // isSymlink
                    (currentNode ? currentNode.path + pathSeparator : '') + part, // path
                    false, // opened
                    undefined // children
                );

                parentChildren.push(childNode);
                scannerPathMap.set(childNode.path, childNode);
            }
            if (currentNode) { // If currentNode at this point, it will have children, therefore is a directory.
                currentNode.isDirectory = true;
                currentNode.isFile = false;
                currentNode.isSymlink = false;
            }

            currentNode = childNode;
            parentChildren = currentNode.children;

            if (!parentChildren) { // TODO wtf?
                currentNode.children = [];
                parentChildren = currentNode.children;
            }
        }
    }

    // TODO use
    function removeChildFromScannerPathTree(path: string): void {
        const pathParts = path.split(pathSeparator).filter(part => part.length > 0);
        let currentNode: FileTreeType | undefined = undefined;
        let parentNode: FileTreeType | undefined = undefined;
        let parentChildren: FileTreeType[] | undefined = scannerPathTree;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!parentChildren) {
                return; // No children to remove
            }

            const childNodeIndex = parentChildren.findIndex(child => child.name === part);
            if (childNodeIndex === -1) {
                return; // Child not found
            }

            currentNode = parentChildren[childNodeIndex];

            if (i === pathParts.length - 1) {
                // Last part, remove the child
                parentChildren.splice(childNodeIndex, 1);
                scannerPathMap.delete(currentNode.path);
            } else {
                // Move to the next node
                parentNode = currentNode;
                parentChildren = currentNode.children;
            }
        }
    }

    function IsCloseWriteEvent(event: WatchEventKind): event is { access: WatchEventKindAccess } {
        try {
            let accessEvent = (event as { access: WatchEventKindAccess }).access;
            return accessEvent.kind == 'close' && accessEvent.mode == 'write';
        } catch (e) {
            return false;
        }
    }

    async function watchFiles(): Promise<void> {
        await unwatchFiles();
        stopWatching = await watchImmediate(
            /* TODO
             * vi burde oppdatere til tauri V2 for bedre håndtering av events som skjer på disk
             * se f.eks. https://v2.tauri.app/reference/javascript/fs/#watcheventkindremove
             * Per nå har vi ingen måte å skille hva som skjer på disk, bare at noe har skjedd på en path.
             */
            scannerPath,
            async (event) => {
                console.log('event');
                console.log(event);
                if (IsCloseWriteEvent(event.type)) { // TODO handle deletion/moving of files, ex. sent to S3, moved, or user deleted from disk
                    // TODO remove folder: { remove: WatchEventKindRemove } .kind = 'folder'
                    for (let eventPath of event.paths) {
                        addChildToScannerPathTree2(eventPath);
                        //addChildToCurrentDirectoryFromPath(eventPath);
                        // New tif file, create thumbnail
                        if (!eventPath.includes('.thumbnails') && eventPath.includes('.tif')) {
                            createThumbnail(eventPath);
                        }
                    }
                    currentDirectory = currentDirectory; // To update view
                } else {
                    console.debug('watch event not close write', event.type);
                    return;
                }


            /* else {
                                                                                                                                                                                                                                                                                            await readDirRecursivelyUpdate(); // TODO avoid reading recursiv update for each event
                                                                                                                                                                                                                                                                                        }*/
            },
            { recursive: true }
        ).catch((err) => {
            console.error(err);
        });
    }

    async function readDirRecursivelyInit(): Promise<void> {
        const initScannerPathTree = (tmpTree: FileTreeType[]): void => {
            scannerPathTree = tmpTree;
            console.debug('Init scannertree', tmpTree);
        };
        readDirRecursively(initScannerPathTree);
    }

    async function readDirRecursivelyUpdate(): Promise<void> {
        const updateScannerPathTreeFromDirEntries = (tmpTree: FileTreeType[]): void => {
            updateScannerPathTree(tmpTree);
        };
        readDirRecursively(updateScannerPathTreeFromDirEntries);
    }

    async function readDirRecursively(doWithNewRead: (tmpTree: FileTreeType[]) => void): void {
        await readDir(scannerPath)
            .then(async (newDirEntries: DirEntry[]) => {
                let scannerPathTreeTmp = FileTreeType.fromDirEntries(scannerPath, newDirEntries);
                console.debug('fromDirEntries', scannerPathTreeTmp);
                for (const fileTree of scannerPathTreeTmp) {
                    fileTree.children = await fileTree.recursiveRead();
                }
                console.debug('fromDirEntries; after recursive', scannerPathTreeTmp);

                doWithNewRead(scannerPathTreeTmp);

                readDirFailed = undefined;
                if (currentDirectory) {
                    currentDirectory = scannerPathMap.get(currentDirectory.path);
                }
            })
            .catch(err => {
                console.error(err);
                readDirFailed = err;
                scannerPathTree = [];
            });
    }

    async function unwatchFiles(): Promise<void> {
        if (stopWatching) {
            stopWatching();
            stopWatching = null;
        }
    }

    function createThumbnail(path: string): void {
        invoke('convert_to_webp', { filePath: path }).catch((err) => {
            console.error(err);
        });
    }

    function createThumbnailsFromDirectory(directoryPath: string): void {
        invoke<ConversionResult>('convert_directory_to_webp', { directoryPath: directoryPath })
            .then((result) => {
                console.debug(directoryPath, result);
                readDirRecursivelyUpdate();
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

    function toggleExpand(expand: boolean): void {
        scannerPathTree.forEach(entry => {
            entry.opened = expand;
            toggleExpandRecursively(expand, entry.children);
        });
        scannerPathTree = scannerPathTree;
    }

    function toggleExpandRecursively(expand: boolean, trees: FileTreeType[] | undefined): void {
        if (!trees)
            return;
        for (let entry of trees) {
            entry.opened = expand;
            if (entry.children) {
                toggleExpandRecursively(expand, entry.children);
            }
        }
    }

    function toggleFolderExpand(file: FileTreeType): void {
        file.opened = !file.opened;
        scannerPathTree = scannerPathTree;
    }

    // TODO expand parents when folder clicked in file viwer (NOT filetree list on left side.)
    function expandWithParents(file: FileTreeType): void {
        console.debug('ExpandParents!', file);
        let foundFile = scannerPathMap.get(file.path);
        if (!foundFile)
            return;

        foundFile.opened = true;
        let currentPath = file.path;
        while (currentPath !== scannerPath) {
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf(pathSeparator));
            const parentNode = scannerPathMap.get(parentPath);
            if (parentNode) {
                console.debug('ExpandParents!; parent', parentNode);
                parentNode.opened = true;
                currentPath = parentNode.path;
                console.debug('ExpandParents!; parent', parentNode);
                console.debug('ExpandParents!; parentFromTree', scannerPathMap.get(parentPath));

            } else {
                break;
            }
        }
        scannerPathTree = scannerPathTree; // Trigger reactivity
    }

    function getFileExtension(path: string): string {
        return path?.split('.')?.pop() || '';
    }

    function getThumbnailExtensionFromTree(tree: FileTreeType): string | undefined {
        let foundThumbnail = getThumbnailFromTree(tree);
        console.debug('foundThumbnail for tree', tree, foundThumbnail);
        if (foundThumbnail) {
            return getFileExtension(foundThumbnail.name);
        }
        return undefined;
    }

    function getThumbnailURIFromTree(tree: FileTreeType): string | undefined {
        let foundThumbnail = getThumbnailFromTree(tree);
        if (foundThumbnail) {
            return convertFileSrc(foundThumbnail.path);
        }
        return undefined;
    }

    function getThumbnailFromTree(tree: FileTreeType): FileTreeType | undefined {
        let thumbnailPath = tree.path.substring(
            0,
            tree.path.length - tree.name.length
        ) + '.thumbnails' + pathSeparator + tree.name.split('.')[0] + '.webp';
        console.debug('scannerpathMap', scannerPathMap);
        return scannerPathMap.get(thumbnailPath);
    }

    // Populate the map with existing tree nodes
    function populateScannerPathMap(tree: FileTreeType[] = scannerPathTree): void {
        for (const node of tree) {
            scannerPathMap.set(node.path, node);
            if (node.children) {
                populateScannerPathMap(node.children);
            }
        }
    }

    // Merge new tree with existing tree
    function mergeScannerPathTreeWithNew(newTree: FileTreeType[]): FileTreeType[] {
        return newTree.map(newNode => {
            const existingNode = scannerPathMap.get(newNode.path);
            if (existingNode) {
                // If the node exists, merge children
                if (newNode.children) {
                    newNode.children = mergeScannerPathTreeWithNew(newNode.children);
                }
                existingNode.children = newNode.children;
                return existingNode;
            } else {
                // If the node does not exist, add it
                return newNode;
            }
        });
    }

    // Remove paths from existing tree that are not in the new tree
    function removeNonExistentPathsFromScannerPath(tree: FileTreeType[], newTreePaths: Set<string>): FileTreeType[] {
        return tree.filter(node => {
            if (!newTreePaths.has(node.path)) {
                return false;
            }
            if (node.children) {
                node.children = removeNonExistentPathsFromScannerPath(node.children, newTreePaths);
            }
            return true;
        });
    }

    function collectPathsInSet(tree: FileTreeType[], paths: Set<string>): void {
        for (const node of tree) {
            paths.add(node.path);
            if (node.children) {
                collectPathsInSet(node.children, paths);
            }
        }
    }

    function updateScannerPathTree(newTree: FileTreeType[]): void {
        populateScannerPathMap(newTree);

        const mergedTree = mergeScannerPathTreeWithNew(newTree);

        const newTreePaths = new Set<string>();
        collectPathsInSet(newTree, newTreePaths);

        removeNonExistentPathsFromScannerPath(mergedTree, newTreePaths);
        if (currentDirectory) {
            currentDirectory = scannerPathMap.get(currentDirectory.path);
        }
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
                bind:allUploadProgress on:directoryChange={(event) => changeViewDirectory(event.detail)}
                on:toggleFolderExpand={(event) => toggleFolderExpand(event.detail)} />
        </div>
        <div id="middle-pane" class="pane">
            <div class="images">
                {#if currentDirectory && currentDirectory.children}
                    {#if currentDirectory.children.length !== 0}
                        {#each currentDirectory.children as child}
                            {#if !child.name.startsWith('.thumbnails') && child.isDirectory}
                                <button class="directory"
                                    on:click={() => {changeViewDirectory(child); expandWithParents(child)}}>
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
