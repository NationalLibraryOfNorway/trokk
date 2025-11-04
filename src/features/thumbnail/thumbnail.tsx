import {
    formatFileNames,
    getFileExtension,
    getThumbnailExtensionFromTree,
    getThumbnailURIFromTree,
    supportedFileTypes
} from '@/util/file-utils.ts';
import {FileTree} from '@/model/file-tree.ts';
import {convertFileSrc} from '@tauri-apps/api/core';
import {File, RotateCw, RotateCcw} from 'lucide-react';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import {useRotation} from '@/context/rotation-context.tsx';
import StatusOverlay from '@/components/ui/rotation-status-overlay.tsx';
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
    const {cacheBuster, getRotation, rotateImage, getImageStatus} = useRotation();

    const rotation = getRotation(fileTree.path);
    const imageStatus = getImageStatus(fileTree.path);
    const imageIsRotating = imageStatus === 'rotating';

    const truncateMiddle = (str: string, frontLen: number, backLen: number) => {
        if (str.length <= frontLen + backLen) return str;
        return str.slice(0, frontLen) + '...' + str.slice(str.length - backLen);
    };

    const handleRotateClockwise = (e: React.MouseEvent) => {
        e.stopPropagation();
        rotateImage(fileTree.path, 'clockwise');
    };

    const handleRotateCounterClockwise = (e: React.MouseEvent) => {
        e.stopPropagation();
        rotateImage(fileTree.path, 'counterclockwise');
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
        const srcUrl = `${convertFileSrc(fileTree.path)}?v=${cacheBuster}`;
        content = (
            <div className="overflow-hidden flex items-center justify-center w-full h-full">
                <img className={`${imageClass}`} src={srcUrl}
                     alt={fileTree.name}
                     style={{ transform: `rotate(${rotation}deg)` }}/>
            </div>
        );
    } else if (isWebp) {
        const thumbnailUrl = getThumbnailURIFromTree(fileTree, state);
        const srcUrl = thumbnailUrl ? `${thumbnailUrl}?v=${cacheBuster}` : undefined;
        content = (
            <div className="overflow-hidden flex items-center justify-center w-full h-full">
                <img className={`${imageClass}`} src={srcUrl}
                     alt={fileTree.name}
                     style={{ transform: `rotate(${rotation}deg)` }}/>
            </div>
        );
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
            <div className={`${initialStyle} ${containerClass} relative group`}>
                {content}
                <StatusOverlay status={imageStatus} size="small" />
                {(isSupported || isWebp) && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={handleRotateCounterClockwise}
                            disabled={imageIsRotating}
                            className={`bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-all ${imageIsRotating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Roter mot klokken"
                            title="Roter mot klokken"
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            onClick={handleRotateClockwise}
                            disabled={imageIsRotating}
                            className={`bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-sm transition-all ${imageIsRotating ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-label="Roter med klokken"
                            title="Roter med klokken"
                        >
                            <RotateCw size={16} />
                        </button>
                    </div>
                )}
            </div>
            <i className={`flex content-center justify-center pt-1 w-full text-md ${isChecked ? 'text-amber-400' : ''}`}>
                {fileName}
            </i>
        </button>
    );
  });
Thumbnail.displayName = 'Thumbnail';
export default Thumbnail;
