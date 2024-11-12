import { readDir, type DirEntry } from '@tauri-apps/plugin-fs';
import { path } from '@tauri-apps/api';

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

    sort(): void {
        this.children?.sort((a, b) => {
            if (a.path < b.path) return -1;
            if (a.path > b.path) return 1;
            return 0;
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
                basePath + path.sep() + dirEntry.name,
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
            this.sort()
            return this.children;
        } else {
            return undefined;
        }
    }
}