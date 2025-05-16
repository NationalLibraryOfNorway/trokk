import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FileTree} from '../../model/file-tree.ts';
import {getPreviewURIFromTree} from '../../util/file-utils.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import LoadingSpinner from '../../components/ui/loading-spinner.tsx';

interface DetailedImageViewProps {
    onClose: () => void;
    image: FileTree;
    totalImagesInFolder: number;
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
}

export default function DetailedImageView({ onClose, image, totalImagesInFolder, currentIndex, setCurrentIndex }: DetailedImageViewProps) {
    const {state, dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        dispatch({ type: 'UPDATE_PREVIEW', payload: image });
    }, []);

    useEffect(() => {
        setIsLoading(true)
    }, [state.preview]);

    // Listen to UPDATE_FILE_TREES_AND_TREE_INDEX action.type
    useEffect(() => {
        setIsLoading(false);
    }, [state.current]);

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
        if (event.key === 'ArrowLeft') {
            handlePrevious();
        }
        if (event.key === 'ArrowRight') {
            handleNext();
        }
    };

    /**
     * Navigate to the previous image in the list.
     *
     * Calculates the new index by decrementing the current index.
     * If the new index is less than zero, it wraps around to the last image in the list.
     *
     * Example:
     * - totalImagesInFolder = 10
     * - currentIndex = 7
     * - newIndex = (7 - 1 + 10) % 10 = 16 % 10 = 6
     *
     * Alternatively:
     * - totalImagesInFolder = 10
     * - currentIndex = 0
     * - newIndex = (0 - 1 + 10) % 10 = 9 % 10 = 9
     * @returns {void}
     */
    const handlePrevious = () => {
        const newIndex = (currentIndex - 1 + totalImagesInFolder) % totalImagesInFolder;
        setCurrentIndex(newIndex);
    };

    /**
     * Navigate to the next image in the list.
     *
     * Calculates the new index by incrementing the current index.
     * If the new index exceeds the total number of images, it wraps around to the first image in the list.
     *
     * Example:
     * - totalImagesInFolder = 10
     * - currentIndex = 7
     * - newIndex = (7 + 1) % 10 = 8 % 10 = 8
     *
     * Alternatively:
     * - totalImagesInFolder = 10
     * - currentIndex = 9
     * - newIndex = (9 + 1) % 10 = 10 % 10 = 0
     * @returns {void}
     */
    const handleNext = () => {
        const newIndex = (currentIndex + 1) % totalImagesInFolder;
        setCurrentIndex(newIndex);
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [currentIndex, image]);

    const getImageSrc = () => {
        return getPreviewURIFromTree(image, state);
    };

    return (
        <div className="relative">
            <p className="text-center pt-4">Viser bilde {currentIndex + 1} av {totalImagesInFolder}</p>
            <div className="flex justify-center mt-4">
                <button onClick={handlePrevious} className="mx-2 px-4 py-2 bg-gray-800 text-white rounded">
                    <ChevronLeft/>
                </button>
                <button onClick={handleNext} className="mx-2 px-4 py-2 bg-gray-800 text-white rounded">
                    <ChevronRight/>
                </button>
            </div>
            <button
                onClick={onClose}
                className="absolute top-[100px] right-0 m-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white"
            >
                x
            </button>
            {isLoading ? (
                <div className="flex justify-center my-8 ">
                    <LoadingSpinner size={48}/>
                </div>

            ) : (
                <img src={getImageSrc()} alt="Forhåndsvisning av bilde"
                     className="p-2.5 max-h-screen w-full object-contain"/>
            )}
        </div>
    );
}