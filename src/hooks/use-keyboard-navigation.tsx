import {useEffect, useRef} from 'react';
import {useSelection} from '../context/selection-context.tsx';
import {FileTree} from '../model/file-tree.ts';
import {useTrokkFiles} from '../context/trokk-files-context.tsx';

type KeyboardNavigationProps = {
    delFilePath: string | null;
    setDelFilePath: (path: string | null) => void;
    previewDialogOpen: boolean;
    setPreviewDialogOpen: (open: boolean) => void;
};

export function useKeyboardNavigation(
    {
        delFilePath,
        setDelFilePath,
        previewDialogOpen,
        setPreviewDialogOpen
    }: KeyboardNavigationProps) {

    const keyHoldRef = useRef(false);
    const keypressDelay = 100;

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
        state.current?.children?.filter(child => !child.isDirectory) || [];

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (keyHoldRef.current) return;

            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.ctrlKey) {
                if (/^[1-9]$/.test(e.key)) {
                    setColumns(Number(e.key));
                    return;
                } else if (e.key === '0') {
                    setColumns(10);
                }
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
                    }
                    break;
                }
                case 'Escape':
                    handleClose();
                    setPreviewDialogOpen(false);
                    break;
                case ' ':
                case 'Spacebar':
                    e.preventDefault();
                    handleCheck();
                    break;
                case 'End':
                    handleIndexChange(files.length - 1);
                    break;
                case 'Home':
                    handleIndexChange(0);
                    break;
                case 'Delete':
                    if (!previewDialogOpen) {
                        setDelFilePath(files[currentIndex].path);
                    }
                    break;
                case 'Enter':
                    if (!delFilePath) {
                        setPreviewDialogOpen(true);
                    }
                    break;
            }

            keyHoldRef.current = true;
            setTimeout(() => {
                keyHoldRef.current = false;
            }, keypressDelay);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        currentIndex,
        files.length,
        columns,
        handleCheck,
        handleClose,
        handleIndexChange,
        handleNext,
        handlePrevious,
        setColumns,
    ]);
}