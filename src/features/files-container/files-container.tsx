import React, {useRef, useState} from 'react';
import {ChevronRight, Folder} from 'lucide-react';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import Thumbnail from '@/features/thumbnail/thumbnail.tsx';
import Checkbox from '@/components/ui/checkbox.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import {useAutoFocusOnThumbnail} from '@/hooks/use-auto-focus-on-thumbnail.tsx';
import DetailedImageView from '@/features/detailed-image-view/detailed-image-view.tsx';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog.tsx';
import {useKeyboardNavigation} from '@/hooks/use-keyboard-navigation.tsx';
import {VisuallyHidden} from '@radix-ui/react-visually-hidden';
import {cn} from '@/lib/utils.ts';
import {getBreadcrumbSegments} from '@/util/file-utils.ts';

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
    const visibleChildren = state.current?.children?.filter(child =>
        !child.name.startsWith('.thumbnails') &&
        !child.name.startsWith('.previews')
    ) || [];
    const breadcrumbSegments = getBreadcrumbSegments(state.basePath, state.current?.path);

    const containerRef = useRef<HTMLDivElement>(null);
    const fileRefs = useRef<(HTMLDivElement | null)[]>([]);

    useAutoFocusOnThumbnail({fileRefs, containerRef, previewDialogOpen});
    useKeyboardNavigation({
        delFilePath,
        setDelFilePath,
        previewDialogOpen,
        setPreviewDialogOpen,
    });
    return (
        <>
            <Dialog open={previewDialogOpen} onOpenChange={(open) => setPreviewDialogOpen(open)}>
                <DialogContent
                    onOpenAutoFocus={e => e.preventDefault()}
                    onClick={() => setPreviewDialogOpen(false)} // Trykk utenfor for å lukke

                    aria-describedby="Forstørret visning av valgt bilde"
                    className={cn(
                        'bg-card/80 backdrop-blur-lg',
                        'fixed left-1/2 -translate-x-1/2',
                        '-translate-y-1/2',
                        'top-[calc(var(--toolbar-h)+(100dvh-var(--toolbar-h))/2)]',
                        'h-full items-center justify-center mt-7',
                    )}
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
            </Dialog>

            <div className="flex min-h-full flex-col"
                 onClick={() => {
                     if (previewDialogOpen) {
                         setPreviewDialogOpen(false)
                     }
                 }}>
                {state.current && (
                    <div className="border-b border-border px-4 py-3 flex flex-col gap-3 flex-shrink-0">
                        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <Folder size="16" className="shrink-0"/>
                            <nav aria-label="Arbeidsmappe" className="flex min-w-0 items-center gap-1 overflow-hidden">
                                {breadcrumbSegments.map((segment, index) => (
                                    <React.Fragment key={segment}>
                                        {index > 0 && <ChevronRight size="14" className="shrink-0 text-muted-foreground"/>}
                                        <span
                                            className={cn(
                                                'truncate whitespace-nowrap',
                                                index == breadcrumbSegments.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                            )}
                                        >
                                            {segment}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </nav>
                        </div>
                        {visibleChildren.length !== 0 && (
                            <div className="flex items-center gap-4">
                                <p className="font-semibold">
                                    {checkedItems.length} forside{checkedItems.length !== 1 ? 'r' : ''} valgt
                                </p>
                                <label htmlFor="columns" className="text-sm font-medium text-muted-foreground ml-auto ">
                                    Bilder per rad: {columns}
                                </label>
                                <input
                                    id="columns"
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={columns}
                                    onChange={(e) => setColumns(Number(e.target.value))}
                                    className="w-full max-w-[150px] mb-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer px-0"
                                />
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1">
                    <div
                        ref={containerRef}
                        className="grid gap-4 p-4 focus-visible:outline-none focus:ring-0"
                        style={{gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`}}
                        tabIndex={0}
                        aria-activedescendant={`file-${currentIndex}`}
                    >
                        {state.current && state.current.children ? (
                            <>
                                {visibleChildren.length !== 0 ? (

                                    visibleChildren
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
                                                    className="flex flex-col items-center justify-center bg-card hover:bg-accent rounded-lg p-4"
                                                >
                                                    <Folder size="96"/>
                                                    <i>{child.name}</i>
                                                </button>
                                            ) : (
                                                <div
                                                    key={child.path}
                                                    ref={el => fileRefs.current[index] = el}
                                                    className="relative space-y-2 py-2 focus-visible:outline-none flex flex-col items-center justify-start"
                                                    tabIndex={currentIndex === index ? 0 : -1}
                                                    onFocus={() => handleIndexChange(index)}
                                                    onClick={() => handleIndexChange(index)}
                                                >
                                                    <Thumbnail
                                                        key={`${child.path}-thumb-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                        isChecked={checkedItems.includes(child.path)}
                                                        fileTree={child}
                                                        isFocused={!previewDialogOpen && currentIndex === index}
                                                        onDoubleClick={() => setPreviewDialogOpen(true)}
                                                        setDelFilePath={setDelFilePath}
                                                        delFilePath={delFilePath}
                                                        isDisabled={state.isSubmitting}
                                                    />
                                                    <Checkbox
                                                        aria-label={'Velg forside'}
                                                        aria-checked={'Forside valgt'}
                                                        key={`${child.path}-2-${checkedItems.includes(child.path) ? 'checked' : 'unchecked'}`}
                                                        isChecked={checkedItems.includes(child.path)}
                                                        onChange={() => handleCheck()}
                                                        isFocused={!previewDialogOpen && currentIndex === index}
                                                        isDisabled={state.isSubmitting}
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
