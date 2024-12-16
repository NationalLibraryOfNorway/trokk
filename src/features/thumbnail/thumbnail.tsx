import React from 'react';
import {formatFileNames} from '../../util/file-utils.ts';
import {FileTree} from '../../model/file-tree.ts';
import {convertFileSrc} from '@tauri-apps/api/core';
import {File} from 'lucide-react';
import {sep} from '@tauri-apps/api/path';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';

interface ThumbnailProps {
    fileTree: FileTree;
    onClick: () => void;
}

const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

export default function Thumbnail({ fileTree, onClick }: ThumbnailProps) {
    const {state} = useTrokkFiles();

    const getFileExtension = (path?: string) => path?.split('.')?.pop() || '';

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
    function getThumbnailFromTree(tree: FileTree): FileTree | undefined {
        const thumbnailPath = tree.path.substring(
            0,
            tree.path.length - tree.name.length
        ) + '.thumbnails' + sep() + tree.name.split('.')[0] + '.webp';
        return state.treeIndex.get(thumbnailPath);
    }

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    const getThumbnailExtensionFromTree = (tree: FileTree) => {
        const foundThumbnail = getThumbnailFromTree(tree);
        return foundThumbnail ? getFileExtension(foundThumbnail.name) : undefined;
    };

    const getThumbnailURIFromTree = (tree: FileTree) => {
        const foundThumbnail = getThumbnailFromTree(tree);
        return foundThumbnail ? convertFileSrc(foundThumbnail.path) : undefined;
    };

    return (
        supportedFileTypes.includes(getFileExtension(fileTree?.path)) ? (
            <div key={fileTree.path} className="border-2 border-gray-300 dark:border-gray-600 rounded-sm max-w-[150px] mr-2 mb-2 hover:bg-gray-300 hover:dark:bg-gray-600"
                 onClick={onClick}>
                <img src={convertFileSrc(fileTree.path)} alt={fileTree.name}/>
                <i>{truncateMiddle(formatFileNames(fileTree.name), 7, 10)}</i>
            </div>
        ) : getThumbnailExtensionFromTree(fileTree) === 'webp' ? (
            <div key={fileTree.path} className="border-2 border-gray-300 dark:border-gray-600  max-w-[150px] mr-2 mb-2 hover:bg-gray-300 hover:dark:bg-gray-600"
                 onClick={onClick}>
                <img src={getThumbnailURIFromTree(fileTree)} alt={fileTree.name}/>
                <i>{truncateMiddle(formatFileNames(fileTree.name), 7, 10)}</i>
            </div>
        ) : fileTree.name !== '.thumbnails' && (
            <div key={fileTree.path} className="max-w-[150px] mr-2 mb-2 flex flex-col items-center"
                 onClick={onClick}>
                <File size="96" color="gray"/>
                <i>{truncateMiddle(fileTree.name, 7, 10)}</i>
            </div>
        )
    );

}