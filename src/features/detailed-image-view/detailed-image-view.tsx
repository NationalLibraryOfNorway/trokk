import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FileTree} from '../../model/file-tree.ts';
import {getPreviewURIFromTree} from '../../util/file-utils.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import LoadingSpinner from '../../components/ui/loading-spinner.tsx';
import {useSelection} from '../../context/selection-context.tsx';

export interface DetailedImageViewProps {
    image: FileTree;
    totalImagesInFolder: number;
}

export default function DetailedImageView({ image, totalImagesInFolder}: DetailedImageViewProps) {
    const {state, dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const { currentIndex, handleNext, handlePrevious, handleClose  } = useSelection()
    useEffect(() => {
        dispatch({type: 'UPDATE_PREVIEW', payload: image});
    }, []);

    useEffect(() => {
        setIsLoading(true)
    }, [state.preview]);

    // Listen to UPDATE_FILE_TREES_AND_TREE_INDEX action.type
    useEffect(() => {
        setIsLoading(false);
    }, [state.current]);


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
                onClick={handleClose}
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