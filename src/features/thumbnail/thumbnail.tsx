import {
    formatFileNames,
    getFileExtension,
    getThumbnailExtensionFromTree,
    getThumbnailURIFromTree,
    supportedFileTypes
} from '../../util/file-utils.ts';
import {FileTree} from '../../model/file-tree.ts';
import {convertFileSrc} from '@tauri-apps/api/core';
import {File} from 'lucide-react';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';

interface ThumbnailProps {
    fileTree: FileTree;
    onClick: () => void;
}



export default function Thumbnail({ fileTree, onClick }: ThumbnailProps) {
    const {state} = useTrokkFiles();

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    return (
        supportedFileTypes.includes(getFileExtension(fileTree?.path)) ? (
            <div key={fileTree.path} className="border-2 border-gray-300 dark:border-gray-600 rounded-sm max-w-[150px] mr-2 mb-2 hover:bg-gray-300 hover:dark:bg-gray-600"
                 onClick={onClick}>
                <img src={convertFileSrc(fileTree.path)} alt={fileTree.name}/>
                <i>{truncateMiddle(formatFileNames(fileTree.name), 7, 10)}</i>
            </div>
        ) : getThumbnailExtensionFromTree(fileTree, state) === 'webp' ? (
            <div key={fileTree.path} className="border-2 border-gray-300 dark:border-gray-600  max-w-[150px] mr-2 mb-2 hover:bg-gray-300 hover:dark:bg-gray-600"
                 onClick={onClick}>
                <img src={getThumbnailURIFromTree(fileTree, state)} alt={fileTree.name} />
                <i>{truncateMiddle(formatFileNames(fileTree.name), 7, 10)}</i>
            </div>
        ) : !(fileTree.name === '.thumbnails' || fileTree.name === '.previews') && (
            <div key={fileTree.path} className="max-w-[150px] mr-2 mb-2 flex flex-col items-center"
                 onClick={onClick}>
                <File size="96" color="gray"/>
                <i>{truncateMiddle(fileTree.name, 7, 10)}</i>
            </div>
        )
    );

}