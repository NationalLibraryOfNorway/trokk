import {useEffect, useState, useMemo} from 'react';
import {ChevronLeft, ChevronRight, RotateCw, RotateCcw} from 'lucide-react';
import {FileTree} from '@/model/file-tree.ts';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import Checkbox from '@/components/ui/checkbox.tsx';
import {useRotation} from '@/context/rotation-context.tsx';
import StatusOverlay from '@/components/ui/rotation-status-overlay.tsx';
import {sep} from '@tauri-apps/api/path';
import {convertFileSrc, invoke} from '@tauri-apps/api/core';

export interface DetailedImageViewProps {
    image: FileTree;
    totalImagesInFolder: number;
}

export default function DetailedImageView({ image, totalImagesInFolder}: DetailedImageViewProps) {
    const {dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);
    const [retryBuster, setRetryBuster] = useState<number>(0);

    const {currentIndex, handleNext, handlePrevious, handleClose, handleCheck, checkedItems} = useSelection();
    const {rotateImage, getImageStatus, getFileCacheBuster} = useRotation();

    const imageStatus = getImageStatus(image.path);
    const imageIsRotating = imageStatus === 'rotating';

    const rotationCacheBuster = getFileCacheBuster(image.path);

    const rotateBtnClass = `bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all relative group/btn ${imageIsRotating ? 'opacity-50 cursor-not-allowed' : ''}`

    const previewWebpPath = useMemo(() => {
        const baseNoExt = image.path.replace(/\.[^/.]+$/, '');
        const dir = image.path.substring(0, image.path.length - image.name.length);
        return `${dir}.previews${sep()}${baseNoExt.split(sep()).pop()}.webp`;
    }, [image.path, image.name]);

    const imageUrl = useMemo(() => {
        return `${convertFileSrc(previewWebpPath)}?v=${rotationCacheBuster}.${retryBuster}`;
    }, [previewWebpPath, rotationCacheBuster, retryBuster]);

    const rotateClockwise = () => {
        rotateImage(image.path, 'clockwise');
    };

    const rotateCounterClockwise = () => {
        rotateImage(image.path, 'counterclockwise');
    };

    const isChecked = checkedItems.includes(image.path);

    useEffect(() => {
        dispatch({type: 'UPDATE_PREVIEW', payload: image});
    }, [dispatch, image]);

    useEffect(() => {
        setHasError(false);
        setRetryBuster(0);
        setIsLoading(true);
        void invoke('create_preview_webp', { filePath: image.path })
            .catch((e) => console.error('Failed to create preview:', e));
    }, [image.path]);

    useEffect(() => {
        if (!imageIsRotating) {
            setIsLoading(false);
        }
    }, [imageIsRotating]);

    return (
        <div className='relative z-10' onClick={handleClose}>
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
                            key={`${previewWebpPath}-${rotationCacheBuster}-${retryBuster}`}
                            src={imageUrl}
                            alt="Forhåndsvisning av bilde"
                            onLoad={() => {
                                setIsLoading(false);
                                setHasError(false);
                            }}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);

                                void invoke('create_preview_webp', { filePath: image.path })
                                    .catch((e) => console.error('Failed to regenerate preview:', e))
                                    .finally(() => setRetryBuster(Date.now()));
                            }}
                            style={{
                                maxWidth: 'calc(100vw - 400px)',
                                maxHeight: 'calc(100vh - 250px)',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />

                        {/* Reload spinner overlay */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-[6]">
                                <LoadingSpinner size={48} />
                            </div>
                        )}

                        {hasError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] z-[6]">
                                <p className="text-white text-sm px-4 text-center">
                                    Kunne ikke laste forhåndsvisning. Regenererer…
                                </p>
                            </div>
                        )}

                        <StatusOverlay status={imageStatus} size="large" />
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-row gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    rotateCounterClockwise();
                                }}
                                disabled={imageIsRotating}
                                className={rotateBtnClass}
                                aria-label="Roter mot klokken"
                                title="Roter mot klokken"
                            >
                                <RotateCcw size={24} className={imageIsRotating ? 'animate-spin' : ''} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    rotateClockwise();
                                }}
                                disabled={imageIsRotating}
                                className={rotateBtnClass}
                                aria-label="Roter med klokken"
                                title="Roter med klokken"
                            >
                                <RotateCw size={24} className={imageIsRotating ? 'animate-spin' : ''} />
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
        </div>
    )
}

