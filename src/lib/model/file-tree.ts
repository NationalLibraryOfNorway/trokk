import type { FileEntry } from '@tauri-apps/plugin-fs';

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

    static fromFileEntry(fileEntries: FileEntry[]): FileTree[] {
        return fileEntries.map(fileEntry => {
            return {
                path: fileEntry.path,
                name: fileEntry.name || '',
                opened: false,
                children: fileEntry.children ? this.fromFileEntry(fileEntry.children) : undefined
            } as FileTree;
        });
    }

}