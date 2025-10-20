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
import React, {forwardRef} from 'react';

export interface ThumbnailProps {
    fileTree: FileTree;
    onClick: () => void;
    isChecked: boolean;
    isFocused: boolean;
    setDelFilePath: (path: string | null) => void;
    delFilePath: string | null;
}

 const Thumbnail = forwardRef<HTMLButtonElement, ThumbnailProps>(
  ({ fileTree, onClick, isChecked, isFocused }, ref) => {

    const {state} = useTrokkFiles();

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    const fileName = truncateMiddle(formatFileNames(fileTree.name), 7, 10);
    const isSupported = supportedFileTypes.includes(getFileExtension(fileTree?.path));
    const isWebp = getThumbnailExtensionFromTree(fileTree, state) === 'webp';
    const isHiddenDir = fileTree.name === '.thumbnails' || fileTree.name === '.previews';

    if (isHiddenDir) return null;

    const initialStyle = 'max-h-[calc(100vh-250px)] ';
    let imageClass = 'w-full object-contain';
    let containerClass = 'p-[8px]';

    if (isChecked) {
        imageClass = `${isFocused ? ' ring-4 ring-blue-600' : ''} border-8 border-amber-400 hover:border-amber-500`;
        containerClass = 'p-0';
    } else if (isFocused) {
        imageClass = 'ring-4 ring-blue-600 hover:ring-blue-500';
    }

    let content: React.ReactNode;
    if (isSupported) {
        content = <img className={`${imageClass}`} src={convertFileSrc(fileTree.path)}
                       alt={fileTree.name}/>;
    } else if (isWebp) {
        content =
            <img className={`${imageClass}`} src={getThumbnailURIFromTree(fileTree, state)}
                 alt={fileTree.name}/>;
    } else {
        content = <File size="96" color="gray"/>;
    }

    return (
        <button
            type="button"
            key={fileTree.path}
            className="flex flex-col p-1 items-center"
            onClick={onClick}
            ref={ref}
        >
            <div className={`${initialStyle} ${containerClass}`}>
                {content}
            </div>
            <i className={`flex content-center justify-center pt-1 w-full text-md ${isChecked ? 'text-amber-400' : ''}`}>
                {fileName}
            </i>
        </button>
    );
  });
Thumbnail.displayName = 'Thumbnail';
export default Thumbnail;
