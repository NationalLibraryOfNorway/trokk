import React from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger
} from '../../components/ui/dialog.tsx';
import {useSelection} from '../../context/selection-context.tsx';
import {remove} from '@tauri-apps/plugin-fs';
import {FileTree} from '../../model/file-tree.ts';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';

export interface DeleteFile {
    childPath: string;
    setDelFilePath: (path: string | null) => void;
    delFilePath: string | null;
}

const DeleteFile: React.FC<DeleteFile> = ({childPath, setDelFilePath, delFilePath}: DeleteFile) => {
    const {dispatch, state} = useTrokkFiles();
    const {checkedItems, handleCheck} = useSelection();
    const {columns} = useSelection();

    const updateFileTrees = (path: string) => {
        const updatedTree = removeFileFromTree(state.fileTrees, path);
        dispatch({type: 'SET_FILE_TREES', payload: updatedTree});
    };

    const updateCurrent = (file: FileTree, targetPath: string): FileTree => {
        if (!file.children) return file;

        return FileTree.fromSpread({
            ...file,
            children: removeFileFromTree(file.children, targetPath),
        });
    };

    const removeFileFromTree = (files: FileTree[], targetPath: string): FileTree[] => {
        return files
            .map(file => {
                if (file.path === targetPath) {
                    return null; // remove this node
                }
                if (file.children) {
                    return {
                        ...file,
                        children: removeFileFromTree(file.children, targetPath),
                    };
                }
                return file;
            })
            .filter(Boolean) as FileTree[];
    };

    const handleDelete = async (filePath?: string) => {
        const path = filePath ?? delFilePath;
        if (!path) return;

        const buildPath = (subdir: string, extension = 'webp') =>
            path
                .replace(/([^/]+)$/, `${subdir}/$1`)
                .replace(/\.\w+$/, `.${extension}`);

        const previewPath = buildPath('.previews');
        const thumbPath = buildPath('.thumbnails');

        try {
            // Delete main file + thumbnail (always required)
            await Promise.all([
                remove(path),
                remove(thumbPath),
            ]);

            // Delete preview if it exists (optional)
            try {
                await remove(previewPath);
            } catch {
                //Ignore if preview doesn't exist
            }

            updateFileTrees(path);
            setDelFilePath(null);

            if (state.current) {
                const updatedCurrent = updateCurrent(state.current, path);
                dispatch({type: 'SET_CURRENT', payload: updatedCurrent});
            }

            if (checkedItems && checkedItems.includes(path)) {
                handleCheck();
            }
        } catch (e) {
            console.error('Failed to delete file:', e);
        }
    };

    const getDeleteBtnSize = (columns: number) => {
        if (columns <= 2) return 'w-10 h-10';
        if (columns <= 5) return 'w-8 h-8 text-sm px-2';
        if (columns <= 10) return 'w-6 h-6 text-sm py-1 px-1.5';
        return 'w-4 h-4';
    };

    return (
        <Dialog open={delFilePath === childPath} onOpenChange={(open) => setDelFilePath(open ? childPath : null)}>
            <DialogContent className={'bg-stone-700 w-3/12 min-w-[400px]'} onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogTitle>Er du sikker på at du ønsker å slette bildet?</DialogTitle>
                <DialogDescription className="text-gray-200">
                    Handlingen kan ikke angres.
                </DialogDescription>
                <div className="flex justify-center space-x-2">
                    <DialogClose
                        className="w-24 hover:bg-red-800"
                        onClick={() => handleDelete()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        Slett
                    </DialogClose>
                    <DialogClose
                        className="w-24 hover:bg-green-800"
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        Avbryt
                    </DialogClose>
                </div>
            </DialogContent>
            <DialogTrigger
                className={`bg-black rounded-[200px] flex justify-center
                 align-middle aspect-square ${getDeleteBtnSize(columns)}`}
                onKeyDown={(e) => e.stopPropagation()}
            >
                ✕
            </DialogTrigger>
        </Dialog>
    );
};

export default DeleteFile;
