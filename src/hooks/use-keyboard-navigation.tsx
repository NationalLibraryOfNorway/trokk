import {useEffect, useRef} from 'react';
import {useSelection} from '../context/selection-context.tsx';
import {FileTree} from '../model/file-tree.ts';
import {useTrokkFiles} from '../context/trokk-files-context.tsx';

export function useKeyboardNavigation({
                                              containerRef,
                                          }: {
    containerRef: React.RefObject<HTMLDivElement>;
}) {
    const keyHoldRef = useRef(false);
    const hasFocused = useRef(false);

    const {
        currentIndex,
        handleIndexChange,
        handleNext,
        handlePrevious,
        handleCheck,
        handleClose,
        setColumns,
        columns,
    } = useSelection();

    const {state} = useTrokkFiles();

    const files: FileTree[] =
        state.current?.children?.filter(
            (child: { isDirectory: boolean }) => !child.isDirectory
        ) || [];

    // Ensure initial focus on mount
    useEffect(() => {
        if (containerRef.current && files.length > 0 && !hasFocused.current) {
            containerRef.current.focus();
            hasFocused.current = true;
        }
    }, [state.current?.path, files.length]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !state.current?.children?.length) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (keyHoldRef.current) return;
            e.preventDefault();

            if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
                setColumns(Number(e.key));
                return;
            }

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
                    const newIndex = currentIndex + columns;
                    if (newIndex < files.length) {
                        handleIndexChange(newIndex);
                    }
                    break;
                }
                case 'ArrowUp':
                case 'k':
                case 'K': {
                    const newIndex = currentIndex - columns;
                    if (newIndex >= 0) {
                        handleIndexChange(newIndex);
                    } else {
                        handleIndexChange(currentIndex);
                    }
                    break;
                }
                case 'Escape':
                    handleClose();
                    break;
                case ' ':
                case 'Space':
                    handleCheck();
                    break;
                case 'End':
                    handleIndexChange(files.length - 1);
                    break;
                case 'Home':
                    handleIndexChange(0);
                    break;
            }

            keyHoldRef.current = true;
            setTimeout(() => {
                keyHoldRef.current = false;
            }, 150);
        };

        const handleBlur = () => {
            requestAnimationFrame(() => {
                if (
                    document.activeElement === document.body &&
                    containerRef.current
                ) {
                    containerRef.current.focus();
                }
            });
        };

        container.addEventListener('keydown', handleKeyDown);
        container.addEventListener('blur', handleBlur);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            container.removeEventListener('blur', handleBlur);
        };
    }, [
        containerRef,
        currentIndex,
        files.length,
        columns,
        handleCheck,
        handleClose,
        handleIndexChange,
        handleNext,
        handlePrevious,
        setColumns,
        state.current?.children?.length,
    ]);
}
