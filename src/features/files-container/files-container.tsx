import React, {useRef, useState} from 'react';
import {Folder} from 'lucide-react';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import Thumbnail from '../thumbnail/thumbnail.tsx';
import Checkbox from '@/components/ui/checkbox.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import {useAutoFocusOnThumbnail} from '@/hooks/use-auto-focus-on-thumbnail.tsx';
import DetailedImageView from '../detailed-image-view/detailed-image-view.tsx';
import {
    Dialog,
    DialogPortal,
    DialogOverlay,
    DialogContent,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog.tsx';
import '../detailed-image-view/detailed-image-view.css';
import {useKeyboardNavigation} from '@/hooks/use-keyboard-navigation.tsx';
import {VisuallyHidden} from '@radix-ui/react-visually-hidden';

const FilesContainer: React.FC = () => {
    const [delFilePath, setDelFilePath] = useState<string | null>(null);
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

    const {state, dispatch} = useTrokkFiles();
    const {
        currentIndex,
        checkedItems,
        handleIndexChange,
        handleCheck,
        columns,
        setColumns,
    } = useSelection();

    const files = state.current?.children?.filter(child => !child.isDirectory) || [];
    const isEven = state.isEven;

    const containerRef = useRef<HTMLDivElement>(null);
    const fileRefs = useRef<(HTMLDivElement | null)[]>([]);

    useAutoFocusOnThumbnail({fileRefs, containerRef});
    useKeyboardNavigation({
        delFilePath,
        setDelFilePath,
        previewDialogOpen,
        setPreviewDialogOpen,
    });
    return (
        <>
            <Dialog open={previewDialogOpen} onOpenChange={(open) => setPreviewDialogOpen(open)}>
                <DialogPortal>
                    <DialogOverlay className="fixed inset-0 preview z-5 bg-stone-800/90"/>
                    <DialogContent
                        onOpenAutoFocus={e => { e.preventDefault(); }}
                        aria-describedby="Forstørret visning av valgt bilde"
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex tems-center justify-center z-1000"
                    >
                        <VisuallyHidden>
                            <DialogTitle>Velg Forside</DialogTitle>
                            <DialogDescription>Velg Forside (forstørret visning)</DialogDescription>
                        </VisuallyHidden>
                        <DetailedImageView
                            image={files[currentIndex]}
                            totalImagesInFolder={files.length}
                        />
                    </DialogContent>
                </DialogPortal>
            </Dialog>

            <div className="flex flex-col flex-1 min-h-0"
                 onClick={() => {
                     if (previewDialogOpen) {
                         setPreviewDialogOpen(false)
                     }
                 }}>
                {state.current && state.current.children?.length !== 0 && (
                    <div className="p-4 border-b border-stone-600 flex items-center gap-4 flex-shrink-0">
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
                            className="w-full max-w-[150px] h-2 bg-stone-500 rounded-lg appearance-none cursor-pointer px-0"
                        />
                    </div>
                )}
                {state.current?.children && !isEven && (
                    <div className="p-4 border-b border-stone-600 bg-red-900 flex items-center gap-4 flex-shrink-0">
                        <p className="font-semibold">OBS! Det er et oddetall av filer i denne mappen</p>
                    </div>
                )}
                {/* Scroll area */}
                <div className="flex-1 min-h-0 overflow-auto">
                    <div
                        ref={containerRef}
                        className="grid gap-4 p-4"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
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
                                                className="flex flex-col items-center justify-center"
                                            >
                                                <Folder size="96"/>
                                                <i>{child.name}</i>
                                            </button>
                                        ) : (
                                            <div
                                                key={child.path}
                                                ref={el => fileRefs.current[index] = el}
                                                className="relative space-y-2 py-2 flex flex-col items-center justify-start"
                                                tabIndex={currentIndex === index ? 0 : -1}
                                                onFocus={() => handleIndexChange(index)}
                                            >
                                                <Thumbnail
                                                    key={`${child.path}-thumb-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                    isChecked={checkedItems.includes(child.path)}
                                                    fileTree={child}
                                                    isFocused={!state.preview && currentIndex === index}
                                                    onClick={() => setPreviewDialogOpen(true)}
                                                    setDelFilePath={setDelFilePath}
                                                    delFilePath={delFilePath}
                                                />
                                                    <Checkbox
                                                        aria-label={'Velg forside'}
                                                        aria-checked={'Forside valgt'}
                                                        key={`${child.path}-2-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                        isChecked={checkedItems.includes(child.path)}
                                                        onChange={() => handleCheck()}
                                                        isFocused={!state.preview && currentIndex === index}
                                                    />
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
            </div>
        </>
    );
};

export default FilesContainer;
