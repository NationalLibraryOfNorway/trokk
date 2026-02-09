import React, {createContext, useContext, useEffect, useReducer, useRef} from 'react';
import {
    exists,
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
    isEven: boolean;
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
    | { type: 'REMOVE_FOLDER_PATH'; payload: string }
    | { type: 'RESET' }
    | { type: 'UPDATE_STORE' }
    | { type: 'UPDATE_PREVIEW'; payload: FileTree | undefined }

const initialState: TrokkFilesState = {
    basePath: await documentDir(),
    fileTrees: [],
    treeIndex: new Map<string, FileTree>(),
    current: undefined,
    preview: undefined,
    isEven: true
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

    const isEven = calculateIsEven(fileTree);

    return {...state, fileTrees: newFileTrees, current: fileTree, preview: undefined, isEven};
};

const calculateIsEven = (fileTree: FileTree | undefined): boolean => {
    if (!fileTree?.children) {
        console.log('calculateIsEven: No children, returning true');
        return true; // Default to true if no children
    }

    // Count only files, excluding directories and hidden folders
    const fileCount = fileTree.children.filter(child =>
        !child.isDirectory &&
        !child.name.startsWith('.thumbnails') &&
        !child.name.startsWith('.previews')
    ).length;

    return fileCount % 2 === 0;
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

function isDelete(event: WatchEventKind): event is { remove: WatchEventKindRemove } {
    try {
        // Check if event is an object and has remove property
        if (typeof event !== 'object' || event === null) {
            return false;
        }
        const eventObj = event as { remove?: WatchEventKindRemove };
        if (!eventObj.remove || !eventObj.remove.kind) {
            return false;
        }
        const removeEvent = eventObj.remove;
        return removeEvent.kind == 'folder' || removeEvent.kind == 'file' || removeEvent.kind == 'any';
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

function splitWatchEvents(events: WatchEvent[], processedEvents: Set<string>): PathsSorted {
    const deduplicatedEvents = events.filter((event, index, self) => {
        if (event.paths.some((path) => path.endsWith('TeraCopyTestFile-1234567890'))) {
            return false; // Ignore TeraCopy test files
        }

        const eventTypeStr = JSON.stringify(event.type);
        const eventKey = `${event.paths.join('|')}::${eventTypeStr}`;
        // NOTE: Since eventsKey is based on path and type, if the user performs multiple identical operations
        // valid events may be ignored. Implement more sophisticated logic if needed.
        if (processedEvents.has(eventKey)) {
            return false;
        }

        // Check for duplicates in current batch
        const isDuplicate = self.findIndex((t) => {
            const tEventTypeStr = JSON.stringify(t.type);
            return t.paths[0] === event.paths[0] && tEventTypeStr === eventTypeStr;
        }) !== index;

        if (!isDuplicate) {
            processedEvents.add(eventKey);
        }

        return !isDuplicate;
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
            } else if (isDelete(event.type)) {
                event.paths.forEach((path) => {
                    acc.remove.push({path, kind: isFile(path) ? 'file' : 'folder'});
                });
            } else {
                console.debug('❓ Unknown event type:', JSON.stringify(event.type), 'for paths:', event.paths);
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

        // Check if this path already exists at root level
        if (parentPath === state.basePath) {
            const exists = fileTrees.some(tree => tree.path === newFileTree.path);
            if (exists) {
                return fileTrees;
            }
            return [...fileTrees, newFileTree];
        }

        return fileTrees.map((fileTree) => {
            if (fileTree.path === parentPath) {
                // Check if this child already exists
                const childExists = fileTree.children?.some(child => child.path === newFileTree.path);
                if (childExists) {
                    return fileTree;
                }
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
    const pathSeparator = sep();

    const deleteFileTree = (fileTrees: FileTree[], targetPath: string, isFolder: boolean): FileTree[] => {
        return fileTrees
            .map((fileTree) => {
                // Exact match: remove this node
                if (fileTree.path === targetPath) {
                    console.debug(`🗑️ Found and removing ${isFolder ? 'folder' : 'file'}: ${targetPath}`);
                    return null;
                }
                // If deleting a folder, also remove all children whose paths start with the folder path
                if (isFolder && fileTree.path.startsWith(targetPath + pathSeparator)) {
                    console.debug(`🗑️ Removing child of deleted folder: ${fileTree.path}`);
                    return null;
                }
                // Recursively process children
                if (fileTree.children) {
                    fileTree.children = deleteFileTree(fileTree.children, targetPath, isFolder);
                }
                return fileTree;
            })
            .filter((fileTree): fileTree is FileTree => fileTree !== null);
    };

    let updatedFileTrees = [...state.fileTrees];

    eventPathsSorted.forEach((eventPath) => {
        updatedFileTrees = deleteFileTree(updatedFileTrees, eventPath.path, eventPath.kind === 'folder');
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
        case 'UPDATE_FILE_TREES_AND_TREE_INDEX': {
            const isEven = calculateIsEven(action.payloadCurrent);
            return {
                ...state,
                treeIndex: action.payloadIndex,
                fileTrees: action.payloadFileTrees,
                current: action.payloadCurrent,
                isEven
            };
        }
        case 'SET_CURRENT': {
            if (action.payload) {
                void createThumbnailsFromDirectory(action.payload.path);
            }
            const isEven = calculateIsEven(action.payload);
            return {...state, current: action.payload, preview: undefined, isEven};
        }
        case 'SET_CURRENT_AND_EXPAND_PARENTS': {
            void createThumbnailsFromDirectory(action.payload.path);
            return setCurrentAndExpandParents(state, action.payload);
        }
        case 'REMOVE_FOLDER_PATH': {
            const pathToRemove = action.payload;
            const newState = removeFileTree(state, [{ path: pathToRemove, kind: 'folder' }]);

            const newTreeIndex = populateIndex(newState.fileTrees);

            const wasViewingDeletedFolder = state.current?.path === pathToRemove;
            const newCurrent = wasViewingDeletedFolder
                ? undefined
                : (state.current?.path ? newTreeIndex.get(state.current.path) : undefined);

            const isEven = calculateIsEven(newCurrent);

            return {
                ...newState,
                treeIndex: newTreeIndex,
                current: newCurrent,
                isEven
            };
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
    const processedEvents = useRef<Set<string>>(new Set());

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

            // Check if any paths that received events still exist
            // If they don't exist, they were deleted (even if we didn't get a remove event)
            const pathsToCheck = new Set<string>();
            events.forEach(event => {
                event.paths.forEach(path => {
                    pathsToCheck.add(path);
                });
            });

            const deletedPaths: string[] = [];
            for (const path of pathsToCheck) {
                try {
                    const stillExists = await exists(path);
                    if (!stillExists) deletedPaths.push(path);
                } catch {
                    // Path doesn't exist
                    deletedPaths.push(path);
                }
            }

            const {create, remove, renameFrom, renameTo} = splitWatchEvents(events, processedEvents.current);

            // Add detected deletions to the remove list
            deletedPaths.forEach(path => {
                const treeNode = stateRef.current.treeIndex.get(path);
                const kind = treeNode?.isDirectory ? 'folder' : 'file';
                if (!remove.some(r => r.path === path)) {
                    remove.push({ path, kind });
                }
            });

            // Clean up old processed events (keep only last 100 to prevent memory leak)
            if (processedEvents.current.size > 100) {
                const entries = Array.from(processedEvents.current);
                processedEvents.current = new Set(entries.slice(-100));
            }

            if (stateRef.current?.current) {
                createNewThumbnailFromEvents(stateRef.current.current.path, create);
            }

            let newState: TrokkFilesState | null = stateRef.current;

            newState = await updateFileTreesWithNewObject(newState, create);

            newState = removeFileTree(newState, remove);

            // Handles moves being treated as a rename-events from the OS
            if (renameFrom.length > 0 || renameTo.length > 0) {
                const usedTo = new Set<number>();

                const baseName = (p: string) => p.split(sep()).pop() ?? p;

                for (const from of renameFrom) {
                    let toIndex = renameTo.findIndex((t, idx) => !usedTo.has(idx) && t.kind === from.kind && baseName(t.path) === baseName(from.path));

                    if (toIndex === -1) {
                        toIndex = renameTo.findIndex((t, idx) => !usedTo.has(idx) && t.kind === from.kind);
                    }

                    usedTo.add(toIndex);
                    const newPath = renameTo[toIndex].path;
                    newState = updateRename(newState, from.path, newPath, from.kind);

                    if (newPath.toLowerCase().endsWith('.tif') && stateRef.current?.current?.path) {
                        createNewThumbnailFromEvents(stateRef.current.current.path, [{ path: newPath, kind: from.kind }]);
                    }
                }

                const unpairedTo = renameTo.filter((_, idx) => !usedTo.has(idx));
                if (unpairedTo.length > 0) {
                    newState = await updateFileTreesWithNewObject(newState, unpairedTo);
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
                // Log all events to understand what's happening
                const eventTypeStr = JSON.stringify(event.type);
                console.debug('📁 Event received:', {
                    paths: event.paths,
                    type: eventTypeStr,
                    isDelete: isDelete(event.type),
                    isCreate: isCreate(event.type)
                });
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
