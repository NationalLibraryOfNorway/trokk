import {createContext, ReactNode, useContext, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {FileTree} from '@/model/file-tree.ts';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import {useSelection} from '@/context/selection-context.tsx';

type DialogContextType = {
    delFilePath: string | null;
    openDelDialog: (filePath: string | null) => void;
    handleDelete: (filePath?: string) => void;
    openPreview: (open: boolean) => void;
    previewOpen: boolean;
};

export const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider= ({ children }: { children: ReactNode }) => {
    const {dispatch, state} = useTrokkFiles();
    const {checkedItems, handleCheck} = useSelection();
    const [delFilePath, setDelFilePath] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const openPreview = (open: boolean) => {
        setPreviewOpen(open);
    }

    const openDelDialog = (filePath: string | null) => {
        setDelFilePath(filePath);
    };

    const handleDelete = async (filePath?: string) => {
        const path = filePath ?? delFilePath;
        if(path) {
            await deleteImage(path);

            // Update the whole tree
            const updatedTree = removeFileFromTree(state.fileTrees, path);
            dispatch({type: 'SET_FILE_TREES', payload: updatedTree});

            // If the deleted file was inside the currently opened directory, update current
            if (state.current) {
                const updatedCurrent = updateCurrent(state.current, path);
                dispatch({type: 'SET_CURRENT', payload: updatedCurrent});
            }

            if(checkedItems.includes(path)) {
                handleCheck();
            }
            openDelDialog(null);
        }
    };

    const updateCurrent = (file: FileTree, targetPath: string): FileTree => {
        if (!file.children) return file;

        return FileTree.fromSpread({
            ...file,
            children: removeFileFromTree(file.children, targetPath),
        });
    };

    const deleteImage = async (fileName: string) => {
        try {
            await invoke('delete_image', {fileName});
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
    
    return (
        <DialogContext.Provider value={{ handleDelete, delFilePath, openDelDialog, openPreview, previewOpen }}>
            {children}
        </DialogContext.Provider>
    );
}

export const useDialog = (): DialogContextType => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within a DialogProvider');
    return context;
};