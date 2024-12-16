import React, {useEffect} from 'react';
import {convertFileSrc} from '@tauri-apps/api/core';
import {Folder} from 'lucide-react';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import DetailedImageView from '../detailed-image-view/detailed-image-view.tsx';
import Thumbnail from '../thumbnail/thumbnail.tsx';

const FilesContainer: React.FC = () => {
    const { state, dispatch } = useTrokkFiles();
    const [selectedImgSrc, setselectedImgSrc] = React.useState<string | undefined>(undefined);

    useEffect(() => {
        setselectedImgSrc(undefined);
    }, [state.current]);

    return (
        <div className="flex flex-wrap overflow-y-auto h-[calc(96%)] justify-start content-start ml-4">

            {state.current && state.current.children ? (
                <>
                    {
                        selectedImgSrc && (
                            <DetailedImageView
                                imageSrc={selectedImgSrc}
                                displayTitle={true}
                                onClose={() => setselectedImgSrc(undefined)}
                            />
                        )
                    }
                    {
                        state.current.children.length !== 0 ? (
                            state.current.children.map((child) => (
                                !child.name.startsWith('.thumbnails') && child.isDirectory ? (
                                    <button
                                        key={child.path}
                                        className="max-w-[150px]"
                                        onClick={() => dispatch({ type: 'SET_CURRENT_AND_EXPAND_PARENTS', payload: child })}
                                    >
                                        <Folder size="96" />
                                        <i>{child.name}</i>
                                    </button>
                                ) : (
                                    <Thumbnail
                                        key={child.name}
                                        onClick={() => setselectedImgSrc(convertFileSrc(child.path))}
                                        fileTree={child}
                                    />
                                )
                            ))
                        ) : (
                            <p className="m-8 font-bold break-words">
                                Ingen filer i mappen.
                            </p>
                        )
                    }
                </>

            ) : (
                <p className="m-8 font-bold break-words">
                    Velg en mappe i listen til venstre. <br />
                    Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                </p>
            )}
        </div>
    );
};

export default FilesContainer;