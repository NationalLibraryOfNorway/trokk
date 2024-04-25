import type { FileTree } from './file-tree';

export interface ViewDirectory {
    path: string;
    name: string;
    children: FileTree[];
    viewFiles: ViewFile[];
}

export interface ViewFile {
    path: string;
    name: string;
    imageSource: string;
}