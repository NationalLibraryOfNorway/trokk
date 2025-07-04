import React, {useRef, useEffect} from 'react';
import {Folder} from 'lucide-react';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import DetailedImageView from '../detailed-image-view/detailed-image-view.tsx';
import Thumbnail from '../thumbnail/thumbnail.tsx';
import Checkbox from '../../components/ui/checkbox.tsx';
import {useSelection} from '../../context/selection-context.tsx';

const FilesContainer: React.FC = () => {
    const {state, dispatch} = useTrokkFiles();
    const {
        currentIndex,
        checkedItems,
        handleOpen,
        handleIndexChange,
        handleNext,
        handlePrevious,
        handleCheck,
        handleClose,
    } = useSelection();

    const files = state.current?.children?.filter(child => !child.isDirectory) || [];

    const containerRef = useRef<HTMLDivElement>(null);
    const fileRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            switch (e.key) {
                case 'ArrowRight':
                case 'l':
                case 'L':
                    handleNext();
                    break;
                case 'ArrowLeft':
                case 'h':
                case 'H':
                    handlePrevious();
                    break;
                case 'ArrowDown':
                case 'j':
                case 'J': {
                    const newIndex = currentIndex + 2;
                    if (newIndex < files.length) handleIndexChange(newIndex);

                    break;
                }
                case 'ArrowUp':
                case 'k':
                case 'K': {
                    const newIndex = currentIndex - 2;
                    if (newIndex >= 0) handleIndexChange(newIndex);
                    break;
                }
                case 'Enter': {
                    const currentFile = files[currentIndex];
                    if (currentFile && !state.preview) handleOpen(currentFile);
                    break;
                }
                case 'Escape':
                    handleClose();
                    break;
                case ' ':
                    handleCheck();
                    break;
            }
        };

        const container = containerRef.current;

        if (state.current?.children?.length) {
            container?.addEventListener('keydown', handleKeyDown);
            container?.focus();
        }

        return () => {
            container?.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        currentIndex,
        files,
        handleOpen,
        handleNext,
        handlePrevious,
        handleIndexChange,
        handleCheck,
    ]);

    useEffect(() => {
        if (state.preview) return;
        const currentFileElement = fileRefs.current[currentIndex];
        if (currentFileElement) {
            currentFileElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            });
            currentFileElement.focus();
        }
    }, [currentIndex, state.preview]);

    return (
        <div
            ref={containerRef}
            className={`grid grid-cols-2 overflow-y-auto h-full justify-start content-start pl-4 pt-2 focus:outline-none focus:ring-0 ${state.preview? 'inset-0': ''}`}
            tabIndex={0}
        >
            {state.current && state.current.children ? (
                <>
                    {state.preview && (
                        <div className="fixed inset-0 justify-center z-50 bg-stone-800/40" onClick={handleClose}>
                            <div
                                className="relative"
                            >
                                <DetailedImageView
                                    image={files[currentIndex]}
                                    totalImagesInFolder={files.length}
                                    isChecked={checkedItems.includes(files[currentIndex]?.path)}
                                />
                            </div>
                        </div>
                    )}

                    {state.current.children.length !== 0 ? (
                        state.current.children
                            .filter(child =>
                                !child.name.startsWith('.thumbnails') &&
                                !child.name.startsWith('.previews')
                            )
                            .map((child, index) =>
                                child.isDirectory ? (
                                    <button
                                        key={child.path}
                                        className="max-w-[150px]"
                                        onClick={() =>
                                            dispatch({
                                                type: 'SET_CURRENT_AND_EXPAND_PARENTS',
                                                payload: child,
                                            })
                                        }
                                    >
                                        <Folder size="96"/>
                                        <i>{child.name}</i>
                                    </button>
                                ) : (
                                    <div
                                        key={child.path}
                                        ref={el => fileRefs.current[index] = el}
                                        className="space-y-2 w-[80%] grid-rows-2 py-5 focus:outline-none focus:ring-0"
                                        tabIndex={currentIndex === index ? 0 : -1}
                                        onFocus={() => handleIndexChange(index)}
                                    >
                                        <Thumbnail
                                            key={`${child.path}-1-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                            onClick={() => handleOpen(child)}
                                            isChecked={checkedItems.includes(child.path)}
                                            fileTree={child}
                                            isFocused={!state.preview && currentIndex === index}
                                        />
                                        <div className="flex justify-center">
                                            <Checkbox
                                                key={`${child.path}-2-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                isChecked={checkedItems.includes(child.path)}
                                                onChange={() => handleCheck()}
                                                isFocused={!state.preview && currentIndex === index}
                                            />
                                        </div>
                                    </div>
                                )
                            )
                    ) : (
                        <p className="m-8 font-bold break-words">Ingen filer i mappen.</p>
                    )}
                </>
            ) : (
                <p className="m-8 font-bold break-words">
                    Velg en mappe i listen til venstre. <br/>
                    Er det ingen mapper, sjekk at det fins filer i den valgte scanner kilden.
                </p>
            )}
        </div>
    );
};

export default FilesContainer;