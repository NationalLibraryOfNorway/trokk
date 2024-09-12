import type { DirEntry } from '@tauri-apps/plugin-fs';

export class FileTree {
    path: string;
    name: string;
    opened: boolean;
    children?: FileTree[];

    constructor(path: string, name: string, opened: boolean = false, children?: FileTree[]) {
        this.path = path;
        this.name = name;
        this.opened = opened;
        this.children = children;
    }

    static fromDirEntries(basePath: string, dirEntries: DirEntry[]): FileTree[] {
        return dirEntries.map(dirEntry => {
            return {
                path: basePath,
                name: dirEntry.name || '',
                opened: false
                //children: dirEntry.isDirectory ? this.fromDirEntries(dirEntry.children) : undefined
            } as FileTree;
        });
    }

}