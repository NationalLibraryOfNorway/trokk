import {useEffect} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FileTree} from '../../model/file-tree.ts';
import {getPreviewURIFromTree} from '../../util/file-utils.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';

interface DetailedImageViewProps {
    onClose: () => void;
    images: FileTree[];
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
}

export default function DetailedImageView({ onClose, images, currentIndex, setCurrentIndex }: DetailedImageViewProps) {
    const {state, dispatch} = useTrokkFiles();

    useEffect(() => {
        const currentImage = images[currentIndex];
        dispatch({ type: 'UPDATE_PREVIEW', payload: currentImage });
    }, []);

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

    const handlePrevious = () => {
        const newIndex = (currentIndex - 1 + images.length) % images.length;
        setCurrentIndex(newIndex);
    };

    const handleNext = () => {
        const newIndex = (currentIndex + 1) % images.length;
        setCurrentIndex(newIndex);
    };

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [currentIndex, images]);

    const getImageSrc = () => {
        const image = images[currentIndex];
        return getPreviewURIFromTree(image, state);
    };

    return (
        <div className="relative">
            <p className="text-center pt-4">Viser bilde {currentIndex + 1} av {images.length}</p>
            <div className="flex justify-center mt-4">
                <button onClick={handlePrevious} className="mx-2 px-4 py-2 bg-gray-800 text-white rounded">
                    <ChevronLeft />
                </button>
                <button onClick={handleNext} className="mx-2 px-4 py-2 bg-gray-800 text-white rounded">
                    <ChevronRight />
                </button>
            </div>
            <button
                onClick={onClose}
                className="absolute top-[100px] right-0 m-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white"
            >
                x
            </button>
            <img src={getImageSrc()} alt="Forhåndsvisning av bilde"
                 className="p-2.5 max-h-screen w-full object-contain" />
        </div>
    );
}