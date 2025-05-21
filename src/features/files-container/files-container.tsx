import React, {useState} from 'react';
import {Folder} from 'lucide-react';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import DetailedImageView from '../detailed-image-view/detailed-image-view.tsx';
import Thumbnail from '../thumbnail/thumbnail.tsx';

const FilesContainer: React.FC = () => {
    const { state, dispatch } = useTrokkFiles();
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    const files = state.current?.children?.filter(child => !child.isDirectory) || [];

    const handleIndexChange = (index: number) => {
        setCurrentIndex(index);
        dispatch({ type: 'UPDATE_PREVIEW', payload: files[index] });
    };

    return (
        <div className="flex flex-wrap overflow-y-auto h-[calc(96%)] justify-start content-start ml-4">
            {state.current && state.current.children ? (
                <>
                    {state.preview && (
                        <div className="w-full bg-gray-200 bg-opacity-25 dark:bg-gray-700 dark:bg-opacity-25">
                            <DetailedImageView
                                onClose={() => dispatch({ type: 'UPDATE_PREVIEW', payload: undefined })}
                                image={files[currentIndex]}
                                totalImagesInFolder={files.length}
                                currentIndex={currentIndex}
                                setCurrentIndex={handleIndexChange}
                            />
                        </div>
                    )}
                    {state.current.children.length !== 0 ? (
                        state.current.children.map((child) => (
                            !(child.name.startsWith('.thumbnails') || child.name.startsWith('.previews')) && child.isDirectory ? (
                                <button
                                    key={child.path}
                                    className="max-w-[150px]"
                                    onClick={() => dispatch({
                                        type: 'SET_CURRENT_AND_EXPAND_PARENTS',
                                        payload: child
                                    })}
                                >
                                    <Folder size="96" />
                                    <i>{child.name}</i>
                                </button>
                            ) : (
                                <Thumbnail
                                    key={child.name}
                                    onClick={() => {
                                        dispatch({ type: 'UPDATE_PREVIEW', payload: child });
                                        setCurrentIndex(files.indexOf(child));
                                    }}
                                    fileTree={child}
                                />
                            )
                        ))
                    ) : (
                        <p className="m-8 font-bold break-words">
                            Ingen filer i mappen.
                        </p>
                    )}
                </>
            ) : (
                <p className="m-8 font-bold break-words">
                    Velg en mappe i listen til venstre. <br />
                    Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                </p>
            )}
            <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 mb-4 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Refresh
            </button>
        </div>
    );
};

export default FilesContainer;