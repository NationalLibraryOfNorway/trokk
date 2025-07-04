import {
    formatFileNames,
    getFileExtension,
    getThumbnailExtensionFromTree,
    getThumbnailURIFromTree,
    supportedFileTypes
} from '../../util/file-utils.ts';
import { FileTree } from '../../model/file-tree.ts';
import { convertFileSrc } from '@tauri-apps/api/core';
import { File } from 'lucide-react';
import { useTrokkFiles } from '../../context/trokk-files-context.tsx';

export interface ThumbnailProps {
    fileTree: FileTree;
    onClick: () => void;
    isChecked: boolean;
    isFocused: boolean;
}

export default function Thumbnail({ fileTree, onClick, isChecked, isFocused }: ThumbnailProps) {
    const { state } = useTrokkFiles();

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    const fileName = truncateMiddle(formatFileNames(fileTree.name), 7, 10);
    const isSupported = supportedFileTypes.includes(getFileExtension(fileTree?.path));
    const isWebp = getThumbnailExtensionFromTree(fileTree, state) === 'webp';
    const isHiddenDir = fileTree.name === '.thumbnails' || fileTree.name === '.previews';

    if (isHiddenDir) return null;

    let className = '';

    if (isChecked) {
        className += `${isFocused ? ' ring-4 ring-blue-600' : ''} border-8 border-amber-400 hover:border-amber-300 `;
    } else if (isFocused) {
        className += 'ring-4 ring-blue-600 hover:ring-blue-500';
    }

    let content: React.ReactNode;
    if (isSupported) {
        content = <img className={`${className} w-full`} src={convertFileSrc(fileTree.path)} alt={fileTree.name} />;
    } else if (isWebp) {
        content = <img className={`${className} w-full`} src={getThumbnailURIFromTree(fileTree, state)} alt={fileTree.name} />;
    } else {
        content = <File size="96" color="gray" />;
    }

    return (
        <div key={fileTree.path} className="flex flex-col items-center justify-center hover:bg-stone-700" onClick={onClick}>
            {content}
            <i className={`flex content-center justify-center text-lg ${isChecked? 'text-amber-400' : ''}`}>{fileName}</i>
        </div>
    );
}
