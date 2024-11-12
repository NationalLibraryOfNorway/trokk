import React from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { File, Folder } from 'lucide-react';
import { formatFileNames } from '../../util/file-utils';
import {useTrokkFiles} from "../../context/trokk-files-context.tsx";
import {FileTree} from "../../model/file-tree.ts";
import {path} from "@tauri-apps/api";

const supportedFileTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

const FilesContainer: React.FC = () => {
    const { state, dispatch } = useTrokkFiles();

    const getFileExtension = (path: string) => path?.split('.')?.pop() || '';

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
        ) + '.thumbnails' + path.sep() + tree.name.split('.')[0] + '.webp';
        return state.treeIndex.get(thumbnailPath);
    }


    const getThumbnailExtensionFromTree = (tree: FileTree) => {
        const foundThumbnail = getThumbnailFromTree(tree);
        return foundThumbnail ? getFileExtension(foundThumbnail.name) : undefined;
    };

    const getThumbnailURIFromTree = (tree: FileTree) => {
        const foundThumbnail = getThumbnailFromTree(tree);
        return foundThumbnail ? convertFileSrc(foundThumbnail.path) : undefined;
    };

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    return (
        <div className="flex flex-wrap overflow-y-auto h-[calc(96%)] justify-start content-start ml-4">
            {state.current && state.current.children ? (
                state.current.children.length !== 0 ? (
                    state.current.children.map((child) => (
                            !child.name.startsWith('.thumbnails') && child.isDirectory ? (
                                <button
                                    key={child.path}
                                    className="max-w-[150px]"
                                    onClick={() => dispatch({type: "SET_CURRENT_AND_EXPAND_PARENTS", payload: child})}
                                >
                                    <Folder size="96" />
                                    <i>{child.name}</i>
                                </button>
                            ) : (
                                supportedFileTypes.includes(getFileExtension(child.path)) ? (
                                    <div key={child.path} className="border-2 border-stone-500 max-w-[150px] mr-2 mb-2">
                                        <img src={convertFileSrc(child.path)} alt={child.name} />
                                        <i>{formatFileNames(child.name)}</i>
                                    </div>
                                ) : getThumbnailExtensionFromTree(child) === 'webp' ? (
                                    <div key={child.path} className="border-2 border-stone-500 max-w-[150px] mr-2 mb-2">
                                        <img src={getThumbnailURIFromTree(child)} alt={child.name} />
                                        <i>{truncateMiddle(formatFileNames(child.name), 7, 10)}</i>
                                    </div>
                                ) : child.name !== '.thumbnails' && (
                                    <div key={child.path} className="max-w-[150px] mr-2 mb-2 flex flex-col items-center">
                                        <File size="96" color="gray"/>
                                        <i>{truncateMiddle(child.name, 7, 10)}</i>
                                    </div>
                                )
                            )
                    ))
                ) : (
                    <p className="m-8 font-bold break-words">
                        Ingen filer i mappen.
                    </p>
                )
            ) : (
                <p className="m-8 font-bold break-words">
                    Velg en mappe i listen til venstre. <br />
                    Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                </p>
            )}
        </div>
    );
};

export default FilesContainer;