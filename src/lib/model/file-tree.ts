import { type DirEntry, readDir } from '@tauri-apps/plugin-fs';
import { path } from '@tauri-apps/api';

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