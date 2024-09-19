import {
    type DirEntry,
    readDir,
    type WatchEventKind,
    type WatchEventKindAccess,
    watchImmediate
} from '@tauri-apps/plugin-fs';
import { path } from '@tauri-apps/api';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { ConversionResult } from './thumbnail';
import { type Updater, writable } from 'svelte/store';

export class TrokkFiles {
    /* Svelte store contract */
    /*    public subscribe: Function;
        private _set: Function;
        private _update: Function;*/
    public subscribe: (run: (value: TrokkFiles) => void, invalidate?: (value?: TrokkFiles) => void) => () => void;
    private _set: (value: this) => void;
    private _update: (updater: Updater<this>) => void;

    basePath: string;                   // Base path for files, use 'scannerPath' that user configures.
    fileTrees: FileTree[];              // FileTrees to show in app
    treeIndex: Map<string, FileTree>;   // Index of file path -> FileTree Object
    current: FileTree | undefined;      // Reference to current FileTree Object
    stopWatching: UnlistenFn | void | null = null; // Call to end file watcher

    constructor(
        basePath: string
    ) {
        this.basePath = basePath;
        this.fileTrees = [] as FileTree[];
        this.treeIndex = new Map<string, FileTree>();
        let { subscribe, set, update } = writable(this);
        this.subscribe = subscribe;
        this._set = set;
        this._update = update;
    }

    private updateStore() {
        this._set(this);
    }


    /*
        subscribe(subscription: (value: any) => void): () => void {
            subscription(undefined);
            return () => {
                return;
            };
        }*/

    async initGetFilesAndWatch(): Promise<void> {
        await this.reset();
        await this.readDirRecursivelyInit();
        this.sortFileTrees();
        let firstDir = this.fileTrees.find((file: FileTree): boolean => {
            return file.isDirectory;
        });
        if (firstDir) {
            this.current = firstDir;
            await this.watchFiles();
            this.createThumbnailsFromDirectory(this.current.path);
        } else {
            await this.watchFiles();
        }
        this.updateStore();
    }

    sortFileTrees(): void {
        this.fileTrees.sort((a, b) => {
            if (a.path < b.path) return -1;
            if (a.path > b.path) return 1;
            return 0;
        });
        this.updateStore();
    }

    public async reset(): Promise<void> {
        this.fileTrees = [];
        this.treeIndex = new Map<string, FileTree>();
        this.current = undefined;
        await this.unwatchFiles();
        this.updateStore();
    }

    private IsCloseWriteEvent(event: WatchEventKind): event is { access: WatchEventKindAccess } {
        try {
            let accessEvent = (event as { access: WatchEventKindAccess }).access;
            return accessEvent.kind == 'close' && accessEvent.mode == 'write';
        } catch (e) {
            return false;
        }
    }

    private async watchFiles(): Promise<void> {
        await this.unwatchFiles();
        this.stopWatching = await watchImmediate(
            /* TODO
             * vi burde oppdatere til tauri V2 for bedre håndtering av events som skjer på disk
             * se f.eks. https://v2.tauri.app/reference/javascript/fs/#watcheventkindremove
             * Per nå har vi ingen måte å skille hva som skjer på disk, bare at noe har skjedd på en path.
             */
            this.basePath,
            async (event) => {
                console.log('event');
                console.log(event);
                if (this.IsCloseWriteEvent(event.type)) { // TODO handle deletion/moving of files, ex. sent to S3, moved, or user deleted from disk
                    // TODO remove folder: { remove: WatchEventKindRemove } .kind = 'folder'
                    for (let eventPath of event.paths) {
                        this.addChildToTrees(eventPath);
                        //addChildToCurrentDirectoryFromPath(eventPath);
                        // New tif file, create thumbnail
                        if (!eventPath.includes('.thumbnails') && eventPath.includes('.tif')) {
                            this.createThumbnail(eventPath);
                        }
                    }
                    this.updateStore();
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

    private createThumbnailsFromDirectory(directoryPath: string): void {
        invoke<ConversionResult>('convert_directory_to_webp', { directoryPath: directoryPath })
            .then(async (result) => {
                console.debug(directoryPath, result);
                await this.readDirRecursivelyUpdate();
            })
            .catch((err) => {
                console.error(err);
            });
    }

    public changeViewDirectory(fileTree: FileTree, generateThumbnails: boolean = true, expandParents: boolean = false): void {
        this.current = fileTree;
        if (fileTree.children && fileTree.children.length > 0) {
            if (generateThumbnails) {
                this.createThumbnailsFromDirectory(this.current.path);
            }
        }
        if (expandParents) {
            this.expandWithParents(fileTree);
        }
    }

    private createThumbnail(path: string): void {
        invoke('convert_to_webp', { filePath: path }).catch((err) => {
            console.error(err);
        });
    }

    private async readDirRecursivelyInit(): Promise<void> {
        const initScannerPathTree = (tmpTree: FileTree[]): void => {
            this.fileTrees = tmpTree;
            console.debug('Init scannertree', tmpTree);
        };
        await this.readDirRecursively(initScannerPathTree);
    }

    public async readDirRecursivelyUpdate(): Promise<void> {
        const updateScannerPathTreeFromDirEntries = (tmpTree: FileTree[]): void => {
            this.updateTrees(tmpTree);
        };
        await this.readDirRecursively(updateScannerPathTreeFromDirEntries);
    }

    private async readDirRecursively(doWithNewRead: (tmpTree: FileTree[]) => void): Promise<void> {
        await readDir(this.basePath)
            .then(async (newDirEntries: DirEntry[]) => {
                let scannerPathTreeTmp = FileTree.fromDirEntries(this.basePath, newDirEntries);
                console.debug('fromDirEntries', scannerPathTreeTmp);
                for (const fileTree of scannerPathTreeTmp) {
                    fileTree.children = await fileTree.recursiveRead();
                }
                console.debug('fromDirEntries; after recursive', scannerPathTreeTmp);

                doWithNewRead(scannerPathTreeTmp);

                //readDirFailed = undefined; // TODO figure out wtf to do here.
                if (this.current) {
                    this.current = this.treeIndex.get(this.current.path);
                }
                this.updateStore();
            })
            .catch(err => {
                console.error(err);
                //readDirFailed = err; // TODO figure out wtf to do here.
                this.fileTrees = [];
                this.treeIndex = new Map<string, FileTree>();
                this.updateStore();
            });
    }

    private async unwatchFiles(): Promise<void> {
        if (this.stopWatching) {
            this.stopWatching();
            this.stopWatching = null;
        }
    }


    // Populate the map with existing tree nodes
    private populateIndex(tree: FileTree[] = this.fileTrees): void {
        for (const node of tree) {
            this.treeIndex.set(node.path, node);
            if (node.children) {
                this.populateIndex(node.children);
            }
        }
    }

    // Merge new tree with existing tree
    private mergeTreesWithNew(newTree: FileTree[]): FileTree[] {
        return newTree.map(newNode => {
            const existingNode = this.treeIndex.get(newNode.path);
            if (existingNode) {
                // If the node exists, merge children
                if (newNode.children) {
                    newNode.children = this.mergeTreesWithNew(newNode.children);
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
    private removeNonExistentPathsFromTrees(tree: FileTree[], newTreePaths: Set<string>): FileTree[] {
        return tree.filter(node => {
            if (!newTreePaths.has(node.path)) {
                return false;
            }
            if (node.children) {
                node.children = this.removeNonExistentPathsFromTrees(node.children, newTreePaths);
            }
            return true;
        });
    }

    private collectPathsInSet(tree: FileTree[], paths: Set<string>): void {
        for (const node of tree) {
            paths.add(node.path);
            if (node.children) {
                this.collectPathsInSet(node.children, paths);
            }
        }
    }

    private updateTrees(newTree: FileTree[]): void {
        console.debug('updateScannerPathTree; before', this.fileTrees);
        this.populateIndex(newTree);

        const mergedTree = this.mergeTreesWithNew(newTree);

        const newTreePaths = new Set<string>();
        this.collectPathsInSet(newTree, newTreePaths);

        this.removeNonExistentPathsFromTrees(mergedTree, newTreePaths);
        if (this.current) {
            this.current = this.treeIndex.get(this.current.path);
        }
        console.debug('updateScannerPathTree; after', this.fileTrees);
        this.updateStore();
    }

    private addChildToTrees(pathToAdd: string): void {
        if (!this.fileTrees)
            return;
        pathToAdd = pathToAdd.substring(this.basePath.length);
        const pathParts = pathToAdd.split(path.sep()).filter(part => part.length > 0);
        let currentNode: FileTree | undefined = this.treeIndex.get(pathToAdd + path.sep() + pathParts[0]);
        console.log('addPath', pathToAdd, currentNode);
        let parentChildren: FileTree[] | undefined = this.fileTrees;

        for (const part of pathParts) {
            if (!parentChildren) {
                return; // No children to add to
            }

            let childNode: FileTree | undefined = parentChildren.find(child => child.name === part);

            if (!childNode) {
                childNode = new FileTree(
                    part, // name
                    false, // isDirectory
                    true, // isFile
                    false, // isSymlink
                    (currentNode ? currentNode.path + path.sep() : '') + part, // path
                    false, // opened
                    undefined // children
                );

                parentChildren.push(childNode);
                this.treeIndex.set(childNode.path, childNode);
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
        this.updateStore();
    }

    // TODO use
    private removeChildFromTrees(pathToRemove: string): void {
        const pathParts = pathToRemove.split(path.sep()).filter(part => part.length > 0);
        let currentNode: FileTree | undefined = undefined;
        let parentNode: FileTree | undefined = undefined;
        let parentChildren: FileTree[] | undefined = this.fileTrees;

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
                this.treeIndex.delete(currentNode.path);
            } else {
                // Move to the next node
                parentNode = currentNode;
                parentChildren = currentNode.children;
            }
        }
        this.updateStore();
    }

    /*  Thumbnail directories are generated where '.tif' files are located.
     *  Used to find corresponding '.webp' thumbnail for a tif, for example:
     *
     *  folder
     *  ├── image_1.tif
     *  ├── image_2.tif
     *  ├── image_3.tif
     *  └── .thumbnails
     *      ├── image_1.webp
     *      ├── image_2.webp
     *      └── image_3.webp
     */
    public getThumbnailFromTree(tree: FileTree): FileTree | undefined {
        let thumbnailPath = tree.path.substring(
            0,
            tree.path.length - tree.name.length
        ) + '.thumbnails' + path.sep() + tree.name.split('.')[0] + '.webp';
        return this.treeIndex.get(thumbnailPath);
    }


    public setAllOpenedState(expand: boolean): void {
        this.fileTrees.forEach(entry => {
            entry.opened = expand;
            this.setOpenedStateRecursively(expand, entry.children);
        });
        this.fileTrees = this.fileTrees; // TODO how to update svelte view
    }


    private setOpenedStateRecursively(expand: boolean, trees: FileTree[] | undefined): void {
        if (!trees)
            return;
        for (let entry of trees) {
            entry.opened = expand;
            if (entry.children) {
                this.setOpenedStateRecursively(expand, entry.children);
            }
        }
        this.updateStore();
    }

    public toggleFolderExpand(file: FileTree): void {
        file.opened = !file.opened;
        this.updateStore();
    }

    // TODO expand parents when folder clicked in file viwer (NOT filetree list on left side.)
    public expandWithParents(file: FileTree): void {
        console.debug('ExpandParents!', file);
        let foundFile = this.treeIndex.get(file.path);
        if (!foundFile)
            return;
        file.opened = true;
        foundFile.opened = true;
        console.debug('ExpandParents!', file);
        console.debug('ExpandParents!', foundFile);
        /*        let currentPath = file.path;
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
                }*/
        this.updateStore();
    }
}


export class FileTree implements DirEntry {
    // From DirEntry
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    isSymlink: boolean;

    // Our extra
    path: string;
    opened: boolean;
    children?: FileTree[];

    constructor(
        name: string,
        isDirectory: boolean,
        isFile: boolean,
        isSymlink: boolean,
        path: string,
        opened: boolean = false,
        children?: FileTree[]
    ) {
        this.name = name;
        this.isDirectory = isDirectory;
        this.isFile = isFile;
        this.isSymlink = isSymlink;
        this.path = path;
        this.opened = opened;
        this.children = children;
    }

    static fromDirEntries(basePath: string, dirEntries: DirEntry[]): FileTree[] {
        return dirEntries
            .map(dirEntry => {
                return new FileTree(
                    dirEntry.name || '',
                    dirEntry.isDirectory,
                    dirEntry.isFile,
                    dirEntry.isSymlink,
                    basePath + path.sep() + dirEntry.name,
                    false
                );
            });
    }

    async recursiveRead(): Promise<FileTree[] | undefined> {
        if (this.isDirectory) {
            const newDirEntries = await readDir(this.path);
            this.children = FileTree.fromDirEntries(this.path, newDirEntries);
            for (let child of this.children) {
                if (child && child.isDirectory) {
                    await child.recursiveRead();
                }
            }
            return this.children;
        } else {
            return undefined;
        }
    }

}