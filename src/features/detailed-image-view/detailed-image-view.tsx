import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {FileTree} from '../../model/file-tree.ts';
import {getPreviewURIFromTree} from '../../util/file-utils.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import LoadingSpinner from '../../components/ui/loading-spinner.tsx';
import {useSelection} from '../../context/selection-context.tsx';
import Checkbox from '../../components/ui/checkbox.tsx';

export default function DetailedImageView({files}: { files: FileTree[] }) {
    const {state, dispatch} = useTrokkFiles();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {currentIndex, handleNext, handlePrevious, handleClose, handleCheck, checkedItems} = useSelection();

    const isChecked = checkedItems.includes(files[currentIndex]?.path);
    const image = files[currentIndex];
    const getImageSrc = () => {
        return getPreviewURIFromTree(image, state);
    };
    const imageUrl = getImageSrc();

    useEffect(() => {
        dispatch({type: 'UPDATE_PREVIEW', payload: image});
    }, [image]);

    useEffect(() => {
        if (!imageUrl) {
            setIsLoading(true)
        }
    }, [imageUrl]);

    // Listen to UPDATE_FILE_TREES_AND_TREE_INDEX action.type
    useEffect(() => {
        if (imageUrl) {
            setIsLoading(false);
        }
    }, [imageUrl]);

    return (
        <div className={`relative z-10 ${isLoading ? '' : 'bg-stone-500 rounded-sm shadow-2xl'}`} onClick={handleClose}>
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
                                bilde {currentIndex + 1} av {files.length}</p>
                        </div>
                        <img
                            src={imageUrl}
                            alt="Forhåndsvisning av bilde"
                            className={`max-h-[calc(100vh-200px)]  border-2 mt-4 mb-10 object-contain ${isChecked ? 'ring-amber-400 ring-4' : 'border-gray-300'}`}
                        />
                    </div>
                    <button
                        className={`h-20 px-6 mr-4 rounded self-center ${
                            currentIndex < files.length - 1
                                ? 'bg-stone-300 hover:bg-stone-400 shadow-none text-stone-600'
                                : 'bg-stone-600 text-stone-700 cursor-not-allowed opacity-50'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        disabled={currentIndex >= files.length - 1}
                        >
                        <ChevronRight/>
                    </button>
                </div>
                )}
        </div>
    )
}