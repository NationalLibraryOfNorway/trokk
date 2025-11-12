import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, RotateCw, RotateCcw} from 'lucide-react';
import {FileTree} from '@/model/file-tree.ts';
import {getPreviewFromTree, getPreviewURIFromTree} from '@/util/file-utils.ts';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import LoadingSpinner from '@/components/ui/loading-spinner.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import Checkbox from '@/components/ui/checkbox.tsx';
import {useRotation} from '@/context/rotation-context.tsx';
import StatusOverlay from '@/components/ui/rotation-status-overlay.tsx';

export interface DetailedImageViewProps {
    image: FileTree;
    totalImagesInFolder: number;
}

export default function DetailedImageView({ image, totalImagesInFolder}: DetailedImageViewProps) {
    const {state, dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {currentIndex, handleNext, handlePrevious, handleClose, handleCheck, checkedItems} = useSelection();
    const {rotateImage, getImageStatus, getFileCacheBuster} = useRotation();

    const imageStatus = getImageStatus(image.path);
    const imageIsRotating = imageStatus === 'rotating';

    // Get preview file for cache busting
    const previewFile = getPreviewFromTree(image, state);
    const previewPath = previewFile?.path || image.path;
    const previewCacheBuster = getFileCacheBuster(previewPath);

    const getImageSrc = () => {
        const baseUrl = getPreviewURIFromTree(image, state);
        if (!baseUrl) return undefined;

        // Add per-file cache buster to force reload after rotation
        return `${baseUrl}?v=${previewCacheBuster}`;
    };

    const rotateClockwise = () => {
        rotateImage(image.path, 'clockwise');
    };

    const rotateCounterClockwise = () => {
        rotateImage(image.path, 'counterclockwise');
    };

    const isChecked = checkedItems.includes(image.path);
    const imageUrl = getImageSrc();

    useEffect(() => {
        dispatch({type: 'UPDATE_PREVIEW', payload: image});
    }, [image]);

    useEffect(() => {
        const previewExists = !!getPreviewFromTree(image, state);
        setIsLoading(!previewExists);
    }, [state.preview, state.treeIndex, image]);

    return (
        <div className='relative' onClick={handleClose}>
            {isLoading ? (
                <div className="flex justify-center">
                    <LoadingSpinner size={48}/>
                </div>

            ) : (
                    <div className="flex justify-center">
                        <button
                            className={`h-20 px-6 ml-4 rounded self-center ${
                                currentIndex > 0
                                    ? 'bg-stone-300 hover:bg-stone-400 shadow-none text-stone-600'
                                    : 'bg-stone-600 text-stone-700 cursor-not-allowed opacity-50'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                            disabled={currentIndex <= 0}>
                            <ChevronLeft/>
                        </button>
                        <div className="px-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col justify-center">
                                <div className="flex flex-row items-start space-x-2 justify-center">
                                    <p className="text-stone-100 font-bold text-3xl ml-10 ">{isChecked ? 'Forside valgt' : 'Velg forside'}</p>
                                    <Checkbox
                                        isChecked={isChecked}
                                        onChange={() => handleCheck()}
                                        isFocused={false}
                                    />
                                </div>
                                <p className="text-center text-lg text-stone-200">Viser
                                    bilde {currentIndex + 1} av {totalImagesInFolder}</p>
                            </div>
                            <div
                                className={`relative group mt-4 mb-10 border-2 mx-auto flex items-center justify-center ${isChecked ? 'ring-4 ring-amber-400' : 'border-gray-300'}`}
                                style={{
                                    maxWidth: 'calc(100vw - 400px)',
                                    maxHeight: 'calc(100vh - 250px)',
                                    width: 'fit-content',
                                    height: 'fit-content',
                                    overflow: 'hidden'
                                }}
                            >
                                <img
                                    key={`${previewPath}-${previewCacheBuster}`}
                                    src={imageUrl}
                                    alt="Forhåndsvisning av bilde"
                                    style={{
                                        maxWidth: 'calc(100vw - 400px)',
                                        maxHeight: 'calc(100vh - 250px)',
                                        objectFit: 'contain',
                                        display: 'block'
                                    }}
                                />
                                <StatusOverlay status={imageStatus} size="large" />
                                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            rotateCounterClockwise();
                                        }}
                                        disabled={imageIsRotating}
                                        className={`bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all relative group/btn ${imageIsRotating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        aria-label="Roter mot klokken"
                                        title="Roter mot klokken"
                                    >
                                        <RotateCcw size={24} className={imageIsRotating ? 'animate-spin' : ''} />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                                            Roter mot klokken
                                        </span>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            rotateClockwise();
                                        }}
                                        disabled={imageIsRotating}
                                        className={`bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all relative group/btn ${imageIsRotating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        aria-label="Roter med klokken"
                                        title="Roter med klokken"
                                    >
                                        <RotateCw size={24} className={imageIsRotating ? 'animate-spin' : ''} />
                                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none">
                                            Roter med klokken
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            className={`h-20 px-6 mr-4 rounded self-center ${
                                currentIndex < totalImagesInFolder - 1
                                    ? 'bg-stone-300 hover:bg-stone-400 shadow-none text-stone-600'
                                    : 'bg-stone-600 text-stone-700 cursor-not-allowed opacity-50'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleNext();
                            }}
                            disabled={currentIndex >= totalImagesInFolder - 1}
                        >
                            <ChevronRight/>
                        </button>
                    </div>
                )}
        </div>
    )
}

