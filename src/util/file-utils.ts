import {FileTree} from '../model/file-tree.ts';
import {TrokkFilesState} from '../context/trokk-files-context.tsx';
import {sep} from '@tauri-apps/api/path';
import {convertFileSrc} from '@tauri-apps/api/core';

export const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

export const getFileExtension = (path?: string) => path?.split('.')?.pop() || '';

export const formatFileNames = (fileName?: string): string => {
    if (!fileName) return ''
    if (fileName.endsWith('.webp')) return fileName.replace('.webp', '.tif')
    return fileName
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
export function getThumbnailFromTree(tree: FileTree, state: TrokkFilesState): FileTree | undefined {
    const thumbnailPath = tree.path.substring(
        0,
        tree.path.length - tree.name.length
    ) + '.thumbnails' + sep() + tree.name.split('.')[0] + '.webp';
    return state.treeIndex.get(thumbnailPath);
}


export const getThumbnailExtensionFromTree = (tree: FileTree, state: TrokkFilesState) => {
    const foundThumbnail = getThumbnailFromTree(tree, state);
    return foundThumbnail ? getFileExtension(foundThumbnail.name) : undefined;
};

export const getThumbnailURIFromTree = (tree: FileTree, state: TrokkFilesState) => {
    const foundThumbnail = getThumbnailFromTree(tree, state);
    return foundThumbnail ? convertFileSrc(foundThumbnail.path) : undefined;
};

export const getPreviewFromTree = (tree: FileTree, state: TrokkFilesState): FileTree | undefined => {
    const previewPath = tree.path.substring(
        0,
        tree.path.length - tree.name.length
    ) + '.previews' + sep() + tree.name.split('.')[0] + '.webp';
    return state.treeIndex.get(previewPath);
};

export const getPreviewURIFromTree = (tree: FileTree, state: TrokkFilesState) => {
    const foundPreview = getPreviewFromTree(tree, state);
    return foundPreview ? convertFileSrc(foundPreview.path) : undefined;
};

export const isImage = (path: string): boolean => {
    return path.endsWith('.webp') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith(('.tif')) || path.endsWith('.tiff');
}