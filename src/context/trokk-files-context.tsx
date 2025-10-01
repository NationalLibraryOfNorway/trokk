import React, {createContext, useContext, useEffect, useReducer, useRef} from 'react';
import {
    WatchEvent,
    WatchEventKind,
    WatchEventKindCreate,
    WatchEventKindModify,
    WatchEventKindRemove,
    watchImmediate
} from '@tauri-apps/plugin-fs';
import {FileTree} from '../model/file-tree';
import {invoke} from '@tauri-apps/api/core';
import {ConversionResult} from '../model/thumbnail';
import {documentDir, sep} from '@tauri-apps/api/path';
import {isImage} from '../util/file-utils.ts';

export interface TrokkFilesState {
    basePath: string;
    fileTrees: FileTree[];
    treeIndex: Map<string, FileTree>;
    current: FileTree | undefined;
    preview: FileTree | undefined;
}

interface InitializeState {
    fileTrees: FileTree[];
    scannerPath: string;
}

type TrokkFilesAction =
    | { type: 'INIT_STATE'; payload: InitializeState }
    | { type: 'SET_BASE_PATH'; payload: string }
    | { type: 'SET_FILE_TREES'; payload: FileTree[] }
    | { type: 'INIT_TREE_INDEX'; payload: FileTree[] }
    | { type: 'SET_TREE_INDEX'; payload: Map<string, FileTree> }
    | {
    type: 'UPDATE_FILE_TREES_AND_TREE_INDEX';
    payloadFileTrees: FileTree[];
    payloadIndex: Map<string, FileTree>,
    payloadCurrent: FileTree | undefined
}
    | { type: 'SET_CURRENT'; payload: FileTree | undefined }
    | { type: 'SET_CURRENT_AND_EXPAND_PARENTS'; payload: FileTree }
    | { type: 'RESET' }
    | { type: 'UPDATE_STORE' }
    | { type: 'UPDATE_PREVIEW'; payload: FileTree | undefined }

const initialState: TrokkFilesState = {
    basePath: await documentDir(),
    fileTrees: [],
    treeIndex: new Map<string, FileTree>(),
    current: undefined,
    preview: undefined
};

export const TrokkFilesContext = createContext<{
    state: TrokkFilesState;
    dispatch: React.Dispatch<TrokkFilesAction>;
}>({
    state: initialState,
    dispatch: () => null
});

const setCurrentAndExpandParents = (state: TrokkFilesState, fileTree: FileTree): TrokkFilesState => {
    const updateFileTree = (files: FileTree[], target: FileTree): boolean => {
        return files.map((file) => {
            if (file.path === target.path) {
                file.opened = true;
                return true;
            }
            if (file.children && updateFileTree(file.children, target)) {
                file.opened = true;
                return true;
            }
            return false;
        }).some(Boolean);
    };

    const newFileTrees = [...state.fileTrees];
    updateFileTree(newFileTrees, fileTree);

    return {...state, fileTrees: newFileTrees, current: fileTree, preview: undefined};
};

const createThumbnailsFromDirectory = async (directoryPath: string) => {
    invoke<ConversionResult>('convert_directory_to_webp', {directoryPath: directoryPath})
        .catch((err) => {
            console.error(err);
        });
};

const createThumbnail = async (filePath: string) => {
    invoke('create_thumbnail_webp', {filePath: filePath})
        .catch((err) => {
            console.error(err);
        });
};

const createPreview = async (filePath: string) => {
    invoke('create_preview_webp', {filePath: filePath})
        .catch((err) => {
            console.error(err);
        });
}

function updateRename(
    state: TrokkFilesState,
    oldPath: string,
    newPath: string,
    kind: 'file' | 'folder'
): TrokkFilesState {
    const updatedTreeIndex = new Map<string, FileTree>();
    const pathSeparator = sep();

    const updateFileTreeRecursive = (fileTree: FileTree): FileTree => {
        const shouldUpdate =
            kind === 'folder'
                ? fileTree.path === oldPath || fileTree.path.startsWith(oldPath + pathSeparator)
                : fileTree.path === oldPath;

        let updatedPath = fileTree.path;
        let updatedName = fileTree.name;

        if (shouldUpdate) {
            updatedPath = fileTree.path.replace(oldPath, newPath);
            updatedName = updatedPath.split(pathSeparator).pop() ?? fileTree.name;
        }

        const updatedChildren = fileTree.children?.map(updateFileTreeRecursive) ?? [];

        return new FileTree(
            updatedName,
            fileTree.isDirectory,
            fileTree.isFile,
            fileTree.isSymlink,
            updatedPath,
            fileTree.opened,
            updatedChildren
        );
    };

    const updatedFileTrees = state.fileTrees.map(tree => {
        const updatedTree = updateFileTreeRecursive(tree);
        populateIndexFromTree(updatedTree, updatedTreeIndex);
        return updatedTree;
    });

    return {
        ...state,
        fileTrees: updatedFileTrees,
        treeIndex: updatedTreeIndex,
    };
}

// Helper to recursively populate the index
function populateIndexFromTree(fileTree: FileTree, index: Map<string, FileTree>) {
    index.set(fileTree.path, fileTree);
    if (fileTree.children) {
        fileTree.children.forEach(child => populateIndexFromTree(child, index));
    }
}

// Populate the map with existing tree nodes
const populateIndex = (fileTrees: FileTree[]): Map<string, FileTree> => {
    const treeIndex = new Map<string, FileTree>();
    const populateRecursive = (index: Map<string, FileTree>, nodes: FileTree[]) => {
        for (const node of nodes) {
            index.set(node.path, node);
            if (node.children) {
                populateRecursive(index, node.children);
            }
        }
    };
    populateRecursive(treeIndex, fileTrees);
    return treeIndex;
};

function isCreate(event: WatchEventKind): event is { create: WatchEventKindCreate } {
    try {
        const createEvent = (event as { create: WatchEventKindCreate }).create;
        return createEvent.kind == 'any' || createEvent.kind == 'folder' || createEvent.kind == 'file';
    } catch {
        return false;
    }
}

function isDeleteFolder(event: WatchEventKind): event is { remove: WatchEventKindRemove } {
    try {
        const removeEvent = (event as { remove: WatchEventKindRemove }).remove;
        return removeEvent.kind == 'folder' || removeEvent.kind == 'any';
    } catch {
        return false;
    }
}

function isModifyRenameFrom(event: WatchEventKind): event is { modify: WatchEventKindModify } {
    try {
        const modifyEvent = (event as { modify: WatchEventKindModify }).modify;
        return modifyEvent.kind == 'rename' && modifyEvent.mode == 'from';
    } catch {
        return false;
    }
}

function isModifyRenameTo(event: WatchEventKind): event is { modify: WatchEventKindModify } {
    try {
        const modifyEvent = (event as { modify: WatchEventKindModify }).modify;
        return modifyEvent.kind == 'rename' && modifyEvent.mode == 'to';
    } catch {
        return false;
    }
}

function isDeleteFile(event: WatchEventKind): event is { remove: WatchEventKindRemove } {
    try {
        const removeEvent = (event as { remove: WatchEventKindRemove }).remove;
        return removeEvent.kind == 'any';
    } catch {
        return false;
    }
}


interface PathsSorted {
    create: EventPathAndKind[];
    remove: EventPathAndKind[];
    renameFrom: EventPathAndKind[];
    renameTo: EventPathAndKind[];
}

interface EventPathAndKind {
    path: string;
    kind: 'folder' | 'file';
}

function isFile(path: string): boolean {
    return isImage(path);
}

function splitWatchEvents(events: WatchEvent[]): PathsSorted {
    const deduplicatedEvents = events.filter((event, index, self) => {
        if (event.paths.some((path) => path.endsWith('TeraCopyTestFile-1234567890'))) {
            return false; // Ignore TeraCopy test files
        }
        return index === self.findIndex((t) => (
            t.paths[0] === event.paths[0] && t.type === event.type
        ));
    });
    const paths = deduplicatedEvents.reduce(
        (acc, event) => {
            if (isCreate(event.type)) {
                event.paths.forEach((path) => {
                    acc.create.push({path: path, kind: isFile(path) ? 'file' : 'folder'});
                });
            } else if (isModifyRenameFrom(event.type)) {
                event.paths.forEach((path) => {
                    acc.renameFrom.push({path: path, kind: isFile(path) ? 'file' : 'folder'});
                });
            } else if (isModifyRenameTo(event.type)) {
                event.paths.forEach((path) => {
                    acc.renameTo.push({path: path, kind: isFile(path) ? 'file' : 'folder'});
                });
            } else if (isDeleteFolder(event.type)) {
                event.paths.forEach((path) => {
                    acc.remove.push({path, kind: 'folder'});
                });
            } else if (isDeleteFile(event.type)) {
                event.paths.forEach((path) => {
                    acc.remove.push({path, kind: 'file'});
                });
            }
            return acc;
        },
        {
            create: [] as EventPathAndKind[],
            remove: [] as EventPathAndKind[],
            renameFrom: [] as EventPathAndKind[],
            renameTo: [] as EventPathAndKind[],
        } as PathsSorted
    );

    const sortByFolderFirst = (a: EventPathAndKind, b: EventPathAndKind) => {
        if (a.kind === 'folder' && b.kind === 'file') return -1;
        if (a.kind === 'file' && b.kind === 'folder') return 1;
        return 0;
    };

    paths.create.sort(sortByFolderFirst);
    paths.remove.sort(sortByFolderFirst);
    paths.renameFrom.sort(sortByFolderFirst);
    paths.renameTo.sort(sortByFolderFirst);
    return paths;
}

function createNewThumbnailFromEvents(currentPath: string, events: EventPathAndKind[]): void {
    events.forEach((event) => {
        if (
            event.path.includes(currentPath) &&
            event.kind === 'file' &&
            isImage(event.path) &&
            !event.path.includes('.thumbnails/')
        ) {
            void createThumbnail(event.path);
        }
    });
}

async function updateFileTreesWithNewObject(state: TrokkFilesState, eventPathsSorted: EventPathAndKind[]): Promise<TrokkFilesState> {
    const insertFileTree = (fileTrees: FileTree[], newFileTree: FileTree): FileTree[] => {
        const parentPath = newFileTree.path.split(sep()).slice(0, -1).join(sep());

        if (parentPath === state.basePath) {
            return [...fileTrees, newFileTree];
        }

        return fileTrees.map((fileTree) => {
            if (fileTree.path === parentPath) {
                return new FileTree(
                    fileTree.name,
                    fileTree.isDirectory,
                    fileTree.isFile,
                    fileTree.isSymlink,
                    fileTree.path,
                    fileTree.opened,
                    [...(fileTree.children || []), newFileTree]
                );
            }
            if (fileTree.children) {
                return new FileTree(
                    fileTree.name,
                    fileTree.isDirectory,
                    fileTree.isFile,
                    fileTree.isSymlink,
                    fileTree.path,
                    fileTree.opened,
                    insertFileTree(fileTree.children, newFileTree)
                );
            }
            return fileTree;
        });
    };

    let updatedFileTrees = [...state.fileTrees];

    await Promise.all(
        eventPathsSorted.map(async (eventPath) => {
            const newFileTree = new FileTree(
                eventPath.path.split(sep()).slice(-1)[0],
                eventPath.kind == 'folder', // isFolder
                eventPath.kind == 'file', // isFile
                false, // isSymlink
                eventPath.path, // path
                false // opened
            );

            if (eventPath.kind === 'folder') {
                await newFileTree.recursiveRead(); // Updates files in the folder
            }

            updatedFileTrees = insertFileTree(updatedFileTrees, newFileTree);
        })
    );

    updatedFileTrees.sort((a, b) => {
        if (a.path < b.path) return -1;
        if (a.path > b.path) return 1;
        return 0;
    });

    updatedFileTrees.forEach((fileTree: FileTree) => {
        // noinspection SuspiciousTypeOfGuard
        if (fileTree instanceof FileTree) {
            fileTree.sortRecursive();
        } else {
            console.error('Not instance of FileTree', fileTree);
        }
    });

    return {...state, fileTrees: updatedFileTrees};
}

function removeFileTree(state: TrokkFilesState, eventPathsSorted: EventPathAndKind[]): TrokkFilesState {
    const deleteFileTree = (fileTrees: FileTree[], targetPath: string): FileTree[] => {
        return fileTrees
            .map((fileTree) => {
                if (fileTree.path === targetPath) {
                    return null;
                }
                if (fileTree.children) {
                    fileTree.children = deleteFileTree(fileTree.children, targetPath);
                }
                return fileTree;
            })
            .filter((fileTree): fileTree is FileTree => fileTree !== null);
    };

    let updatedFileTrees = [...state.fileTrees];

    eventPathsSorted.forEach((eventPath) => {
        updatedFileTrees = deleteFileTree(updatedFileTrees, eventPath.path);
    });

    return {...state, fileTrees: updatedFileTrees};
}

const trokkFilesReducer = (state: TrokkFilesState, action: TrokkFilesAction): TrokkFilesState => {
    switch (action.type) {
        case 'INIT_STATE':
            return {
                ...state,
                fileTrees: action.payload.fileTrees,
                treeIndex: populateIndex(action.payload.fileTrees),
                basePath: action.payload.scannerPath
            };
        case 'SET_BASE_PATH':
            return {...state, basePath: action.payload};
        case 'SET_FILE_TREES':
            return {...state, fileTrees: action.payload};
        case 'INIT_TREE_INDEX':
            return {...state, treeIndex: populateIndex(state.fileTrees)};
        case 'SET_TREE_INDEX':
            return {...state, treeIndex: action.payload};
        case 'UPDATE_FILE_TREES_AND_TREE_INDEX':
            return {
                ...state,
                treeIndex: action.payloadIndex,
                fileTrees: action.payloadFileTrees,
                current: action.payloadCurrent
            };
        case 'SET_CURRENT': {
            if (action.payload) {
                void createThumbnailsFromDirectory(action.payload.path);
            }
            return {...state, current: action.payload, preview: undefined};
        }
        case 'SET_CURRENT_AND_EXPAND_PARENTS': {
            void createThumbnailsFromDirectory(action.payload.path);
            return setCurrentAndExpandParents(state, action.payload);
        }
        case 'RESET':
            return initialState;
        case 'UPDATE_STORE':
            return {...state};
        case 'UPDATE_PREVIEW':
            if (action.payload?.path) {
                void createPreview(action.payload.path);
            }
            return {...state, preview: action.payload};
        default:
            return state;
    }
};

export const TrokkFilesProvider: React.FC<{ children: React.ReactNode; scannerPath: string }> = ({
                                                                                                     children,
                                                                                                     scannerPath
                                                                                                 }) => {
    const [state, dispatch] = useReducer(trokkFilesReducer, initialState);
    const stateRef = useRef(state);
    const eventQueue = useRef<WatchEvent[]>([]);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        const cleanupPromise = initialize();
        return () => {
            cleanupPromise.then((cleanup) => cleanup && cleanup());
        };
    }, [scannerPath]);


    const initialize = async () => {
        console.debug('Initializing TrokkFilesProvider', scannerPath);
        if (!scannerPath) return;

        const rootTree = new FileTree(
            scannerPath,
            true, // isDirectory
            false, // isFile
            false, // isSymlink
            scannerPath,
            false // opened
        );

        const fileTrees = await rootTree.recursiveRead();

        dispatch({type: 'INIT_STATE', payload: {fileTrees: fileTrees ?? [], scannerPath: scannerPath}});

        const processQueue = async () => {
            if (eventQueue.current.length === 0) return;

            const events = eventQueue.current;
            eventQueue.current = [];

            const {create, remove, renameFrom, renameTo} = splitWatchEvents(events);

            if (stateRef.current?.current) {
                createNewThumbnailFromEvents(stateRef.current.current.path, create);
            }

            let newState: TrokkFilesState | null = stateRef.current;

            newState = await updateFileTreesWithNewObject(newState, create);
            newState = removeFileTree(newState, remove);

            if (renameTo.length > 0 && renameFrom.length > 0) {
                for (let i = 0; i < renameFrom.length; i++) {
                    const oldPath = renameFrom[i].path;
                    const newPath = renameTo[i].path;
                    const kind = renameFrom[i].kind;
                    newState = updateRename(newState, oldPath, newPath, kind);

                    if (newPath.toLowerCase().endsWith('.tif') && stateRef.current?.current?.path) {
                        createNewThumbnailFromEvents(stateRef.current.current.path, [{path: newPath, kind}]); //makes webp when renaming tif
                    }
                }
            }
            // Rebuild index based on updated fileTrees (optional fallback)
            const newTreeIndex = populateIndex(newState.fileTrees);

            // Keep current selection if it exists
            const current = stateRef.current.current?.path
                ? newTreeIndex.get(stateRef.current.current.path)
                : undefined;

            dispatch({
                type: 'UPDATE_FILE_TREES_AND_TREE_INDEX',
                payloadFileTrees: newState.fileTrees,
                payloadIndex: newTreeIndex,
                payloadCurrent: current
            });
        };

        const unwatch = await watchImmediate(scannerPath, async (event: WatchEvent) => {
                eventQueue.current.push(event);
            },
            {
                recursive: true
            }
        );

        const intervalId = setInterval(processQueue, 1000);

        return () => {
            unwatch();
            clearInterval(intervalId);
        };
    }

    return (
        <TrokkFilesContext.Provider value={{state, dispatch}}>
            {children}
        </TrokkFilesContext.Provider>
    );
};

export const useTrokkFiles = () => useContext(TrokkFilesContext);
