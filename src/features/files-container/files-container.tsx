import React, {useRef} from 'react';
import {Folder} from 'lucide-react';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import Thumbnail from '../thumbnail/thumbnail.tsx';
import Checkbox from '../../components/ui/checkbox.tsx';
import {useSelection} from '../../context/selection-context.tsx';
import {useAutoFocusOnThumbnail} from '../../hooks/use-auto-focus-on-thumbnail.tsx';

const FilesContainer: React.FC = () => {
    const {state, dispatch} = useTrokkFiles();
    const {
        currentIndex,
        checkedItems,
        handleOpen,
        handleIndexChange,
        handleCheck,
        columns,
        setColumns
    } = useSelection();

    const containerRef = useRef<HTMLDivElement>(null);
    const fileRefs = useRef<(HTMLDivElement | null)[]>([]);

    const columnClasses: { [key: number]: string } = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
        7: 'grid-cols-7',
        8: 'grid-cols-8',
        9: 'grid-cols-9',
        10: 'grid-cols-10',
    };

    useAutoFocusOnThumbnail({fileRefs, containerRef});

    return (
        <div className="relative h-full flex w-full flex-col">
            {state.current && state.current.children?.length !== 0 && (
                <div className="p-4 border-b border-stone-600 flex items-center gap-4">
                    <p className="font-semibold">
                        {checkedItems.length} forside{checkedItems.length !== 1 ? 'r' : ''} valgt
                    </p>
                    <label htmlFor="columns" className="text-sm font-medium text-gray-300 ml-auto ">
                        Visning: {columns}
                    </label>
                    <input
                        id="columns"
                        type="range"
                        min={1}
                        max={10}
                        value={columns}
                        onChange={(e) => setColumns(Number(e.target.value))}
                        className="w-full max-w-[150px] h-2 bg-stone-500 rounded-lg appearance-none cursor-pointer"
                    />

                </div>
            )}
            <div
                ref={containerRef}
                className={`grid ${columnClasses[columns] ?? 'grid-cols-2'} 
                gap-4 overflow-y-auto grow w-full
                p-4 justify-start self-center focus-visible:outline-none focus:ring-0`}
                tabIndex={0}
                aria-activedescendant={`file-${currentIndex}`}
            >
                {state.current && state.current.children ? (
                    <>
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
                                            className="space-y-2 py-2 focus-visible:outline-none focus:ring-0"
                                            tabIndex={currentIndex === index ? 0 : -1}
                                            onFocus={() => handleIndexChange(index)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleOpen();
                                                }
                                            }}
                                        >
                                            <Thumbnail
                                                key={`${child.path}-1-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                onClick={() => handleOpen()}
                                                isChecked={checkedItems.includes(child.path)}
                                                fileTree={child}
                                                isFocused={!state.preview && currentIndex === index}
                                            />
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    aria-label={'Velg forside'}
                                                    aria-checked={'Forside valgt'}
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
        </div>
    );
};

export default FilesContainer;