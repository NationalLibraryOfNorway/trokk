import {type DirEntry, readDir} from '@tauri-apps/plugin-fs';
import {sep} from '@tauri-apps/api/path';

export class FileTree implements DirEntry {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    isSymlink: boolean;
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

    static fromSpread(
        {
          name,
          isDirectory,
          isFile,
          isSymlink,
          path,
          opened = false,
          children = []
        }: Partial<FileTree>): FileTree {
        return new FileTree(
            name || '',
            isDirectory || false,
            isFile || false,
            isSymlink || false,
            path || '',
            opened,
            children
        );
    }

    sort(): void {
        this.children?.sort((a, b) => {
            return a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' });
        });
    }

    public sortRecursive(): void {
        this.sort();
        if (this.children) {
            for (const child of this.children) {
                child.sortRecursive();
            }
        }
    }

    static fromDirEntries(basePath: string, dirEntries: DirEntry[]): FileTree[] {
        return dirEntries.map(dirEntry => {
            return new FileTree(
                dirEntry.name || '',
                dirEntry.isDirectory,
                dirEntry.isFile,
                dirEntry.isSymlink,
                basePath + sep() + dirEntry.name,
                false
            );
        });
    }

    async recursiveRead(): Promise<FileTree[] | undefined> {
        if (this.isDirectory) {
            const newDirEntries = await readDir(this.path);
            this.children = FileTree.fromDirEntries(this.path, newDirEntries);
            for (const child of this.children) {
                if (child && child.isDirectory) {
                    await child.recursiveRead();
                }
            }
            this.sort();
            return this.children;
        } else {
            return undefined;
        }
    }
}

export const findFileTreeByPath = (fileTrees: FileTree[], targetPath?: string): FileTree | undefined => {
    if (!targetPath) {
        return undefined;
    }

    for (const fileTree of fileTrees) {
        if (fileTree.path === targetPath) {
            return fileTree;
        }

        if (fileTree.children) {
            const childMatch = findFileTreeByPath(fileTree.children, targetPath);
            if (childMatch) {
                return childMatch;
            }
        }
    }

    return undefined;
};

export const findFileTreeAncestry = (fileTrees: FileTree[], targetPath?: string): FileTree[] => {
    if (!targetPath) {
        return [];
    }

    const findRecursive = (nodes: FileTree[], ancestry: FileTree[]): FileTree[] | undefined => {
        for (const node of nodes) {
            const nextAncestry = [...ancestry, node];

            if (node.path === targetPath) {
                return nextAncestry;
            }

            if (node.children) {
                const childAncestry = findRecursive(node.children, nextAncestry);
                if (childAncestry) {
                    return childAncestry;
                }
            }
        }

        return undefined;
    };

    return findRecursive(fileTrees, []) ?? [];
};
