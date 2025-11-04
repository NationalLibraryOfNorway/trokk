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
    const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);
    const {currentIndex, handleNext, handlePrevious, handleClose, handleCheck, checkedItems} = useSelection();
    const {getRotation, rotateImage, getImageStatus, cacheBuster} = useRotation();

    const rotation = getRotation(image.path);
    const imageStatus = getImageStatus(image.path);
    const imageIsRotating = imageStatus === 'rotating';

    const getImageSrc = () => {
        const baseUrl = getPreviewURIFromTree(image, state);
        // Add cache buster to force reload after rotation
        return baseUrl ? `${baseUrl}?v=${cacheBuster}` : undefined;
    };

    const rotateClockwise = () => {
        setShouldAnimate(true);
        rotateImage(image.path, 'clockwise');
        // Reset animation after rotation completes
        setTimeout(() => setShouldAnimate(false), 300);
    };

    const rotateCounterClockwise = () => {
        setShouldAnimate(true);
        rotateImage(image.path, 'counterclockwise');
        // Reset animation after rotation completes
        setTimeout(() => setShouldAnimate(false), 300);
    };

    const isChecked = checkedItems.includes(image.path);
    const imageUrl = getImageSrc();

    // Swap dimensions when rotated 90° or 270° to prevent stretching
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const containerMaxWidth = isRotated90or270 ? 'calc(100vh - 200px)' : 'calc(100vw - 300px)';
    const containerMaxHeight = isRotated90or270 ? 'calc(100vw - 300px)' : 'calc(100vh - 200px)';

    useEffect(() => {
        dispatch({type: 'UPDATE_PREVIEW', payload: image});
        setShouldAnimate(false); // Disable animation when navigating to a new image
    }, [image]);

    useEffect(() => {
        const previewExists = !!getPreviewFromTree(image, state);
        setIsLoading(!previewExists);
    }, [state.preview, state.treeIndex, image]);

    return (
        <div className='relative z-10' onClick={handleClose}>
            {isLoading ? (
                <div className="flex justify-center my-8 ">
                    <LoadingSpinner size={48}/>
                </div>

            ) : (
                    <div className="flex justify-center items-start pt-2">
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
                            <div className="flex flex-col justify-center pt-4">
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
                            <div className={`relative group mt-4 mb-10 border-2 overflow-hidden mx-auto ${isChecked ? 'ring-4 ring-amber-400' : 'border-gray-300'}`} style={{ maxWidth: containerMaxWidth, maxHeight: containerMaxHeight }}>
                                <div className="flex items-center justify-center w-full h-full">
                                    <img
                                        src={imageUrl}
                                        alt="Forhåndsvisning av bilde"
                                        className={`max-h-full max-w-full object-contain ${shouldAnimate ? 'transition-transform duration-300' : ''}`}
                                        style={{ transform: `rotate(${rotation}deg)` }}
                                    />
                                </div>
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
