import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FileTree} from '../../model/file-tree.ts';
import {getPreviewURIFromTree} from '../../util/file-utils.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import LoadingSpinner from '../../components/ui/loading-spinner.tsx';
import {useSelection} from '../../context/selection-context.tsx';
import Checkbox from '../../components/ui/checkbox.tsx';

export interface DetailedImageViewProps {
    image: FileTree;
    totalImagesInFolder: number;
    isChecked: boolean;
}

export default function DetailedImageView({image, totalImagesInFolder, isChecked}: DetailedImageViewProps) {
    const {state, dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {currentIndex, handleNext, handlePrevious, handleClose, handleCheck} = useSelection();

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
        <div className={'relative z-10'} onClick={handleClose}>
            {isLoading ? (
                <div className="flex justify-center my-8 ">
                    <LoadingSpinner size={48}/>
                </div>

            ) : (
                <div className="flex justify-center items-start pt-5" >
                    <button
                            className="shadow-2xl h-20 px-6 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded self-center"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrevious();
                            }}
                    >
                        <ChevronLeft/>
                    </button>
                    <div className="px-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col justify-center pt-4 bg-stone-300 rounded-t-xl">
                            <div className="flex flex-row items-start justify-center" >
                                <p className ="text-black text-2xl ml-10 ">{isChecked ? 'Forside valgt': 'Velg forside'}</p>
                                <Checkbox
                                    isChecked={isChecked}
                                    onChange={() => handleCheck()}
                                    isFocused={false}
                                />
                            </div>
                            <p className="text-center text-lg text-stone-700">Viser bilde {currentIndex + 1} av {totalImagesInFolder}</p>
                        </div>
                        <img
                            src={getImageSrc()}
                            alt="Forhåndsvisning av bilde"
                            className={`shadow-2xl max-h-[calc(100vh-110px)] object-contain ${isChecked ? 'border-amber-400 border-8' : ''}`}
                        />
                    </div>

                    <button
                        className="shadow-2xl h-20 px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-600 rounded self-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                    >
                        <ChevronRight/>
                    </button>
                </div>
            )}
        </div>
    );
}