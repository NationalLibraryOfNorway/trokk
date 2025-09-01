import React from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger
} from '../../components/ui/dialog.tsx';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import {FileTree} from '../../model/file-tree.ts';
import {useSelection} from '../../context/selection-context.tsx';
import {invoke} from '@tauri-apps/api/core';

export interface DeleteBtnProps {
    childPath: string;
}

const DeleteButton: React.FC<DeleteBtnProps> = ({childPath}: DeleteBtnProps) => {
    const {state, dispatch} = useTrokkFiles();
    const {columns} = useSelection();

    const getDeleteBtnSize = (columns: number) => {
        if (columns <= 2) return 'w-10 h-10';
        if (columns <= 5) return 'w-8 h-8 text-sm px-2';
        if (columns <= 10) return 'w-6 h-6 text-sm py-1 px-1.5';
        return 'w-4 h-4';
    };

    const handleDelete = async (fileName: string) => {
        try {
            const result = await invoke('delete_image', {fileName});
            console.log('delete_image result:', result);
        } catch (err) {
            console.error('Failed to delete:', err);
        }
    }

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

    const handleDeleteClick = async () => {
        await handleDelete(childPath);

        // Update the whole tree
        const updatedTree = removeFileFromTree(state.fileTrees, childPath);
        dispatch({type: 'SET_FILE_TREES', payload: updatedTree});

        // If the deleted file was inside the currently opened directory, update current
        if (state.current) {
            const updateCurrent = (file: FileTree, targetPath: string): FileTree => {
                if (!file.children) return file;

                return FileTree.fromSpread({
                    ...file,
                    children: removeFileFromTree(file.children, targetPath),
                });
            };

            const updatedCurrent = updateCurrent(state.current, childPath);
            dispatch({type: 'SET_CURRENT', payload: updatedCurrent});
        }
    };


    return (
        <Dialog>
            <DialogContent className={'bg-stone-700 w-3/12'}>
                <DialogTitle>Er du sikker på at du ønsker å slette bildet?</DialogTitle>
                <DialogDescription className="text-gray-200">
                    Handlingen kan ikke angres.
                </DialogDescription>
                <div className="flex justify-center space-x-2">
                    <DialogClose
                        className="w-24 hover:bg-red-800"
                        onClick={handleDeleteClick}
                    >
                        Slett
                    </DialogClose>
                    <DialogClose className="w-24 hover:bg-green-800">
                        Avbryt
                    </DialogClose>
                </div>
            </DialogContent>
            <DialogTrigger
                className={`bg-black rounded-[200px] flex justify-center
                 align-middle aspect-square ${getDeleteBtnSize(columns)}`}
            >
                ✕
            </DialogTrigger>
        </Dialog>
    );
};

export default DeleteButton;
