import React from 'react';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import {remove} from '@tauri-apps/plugin-fs';
import {FileTree} from '@/model/file-tree.ts';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import {Trash} from 'lucide-react';
import {basename, dirname, join} from '@tauri-apps/api/path';


export interface DeleteFile {
    childPath: string;
    setDelFilePath: (path: string | null) => void;
    delFilePath: string | null;
    disabled?: boolean;
    btnClassName?: string;
}

const DeleteFile: React.FC<DeleteFile> = ({childPath, setDelFilePath, delFilePath, disabled, btnClassName}: DeleteFile) => {
    const {dispatch, state} = useTrokkFiles();
    const {checkedItems, handleCheck} = useSelection();

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

        const buildPath = async (targetPath: string, subdir: string, extension = 'webp') => {
            const dir = await dirname(targetPath);
            const base = await basename(targetPath);
            const nameWithoutExt = base.replace(/\.\w+$/, '');
            const fileName = `${nameWithoutExt}.${extension}`;
            const targetDir = await join(dir, subdir);
            return await join(targetDir, fileName);
        };

        // Check if file is in a merge folder (i.e., path ends with /merge/<filename>)
        let parentPath: string | null = null;
        const parentDir = await dirname(path);
        const parentDirName = await basename(parentDir);
        if (parentDirName === 'merge') {
            const grandParentDir = await dirname(parentDir);
            const fileBaseName = await basename(path);
            parentPath = await join(grandParentDir, fileBaseName);
        }

            const previewPath = await buildPath(path, '.previews');
            const thumbPath = await buildPath(path, '.thumbnails');

            const parentPreviewPath = parentPath
                         ? parentPath
                             .replace(/([^/]+)$/, '.previews/$1')
                             .replace(/\.\w+$/, '.webp')
                         : null;
             const parentThumbPath = parentPath
                 ? parentPath
                     .replace(/([^/]+)$/, '.thumbnails/$1')
                     .replace(/\.\w+$/, '.webp')
                 : null;
            
        try {
            // Delete main file + thumbnail (always required)
            await Promise.all([
                remove(path),
                remove(thumbPath),
            ]);

            // Best-effort deletion of optional artifacts (ignore if they don't exist)
            const optionalPaths = [
                previewPath,
                parentPreviewPath,
                parentThumbPath,
            ].filter((p): p is string => Boolean(p));

            await Promise.all(
                optionalPaths.map(p =>
                    remove(p).catch(() => {
                        // Ignore errors for optional artifacts (e.g., missing previews/thumbnails)
                        return;
                    }),
                ),
            );

            updateFileTrees(path);
            if (parentPath) updateFileTrees(parentPath);
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

    return (
        <Dialog open={delFilePath === childPath} onOpenChange={(open) => setDelFilePath(open ? childPath : null)}>
            <DialogContent onClick={(e) => e.stopPropagation()} className={'bg-stone-700 w-3/12 min-w-[400px]'} onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogTitle>Er du sikker på at du ønsker å slette bildet?</DialogTitle>
                <DialogDescription className="text-gray-200">
                    Handlingen kan ikke angres.
                </DialogDescription>
                <div className="flex justify-center space-x-2">
                    <DialogClose
                        aria-label="Slett"
                        className="w-24 hover:bg-red-800"
                        onClick={() => handleDelete(undefined)}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        Slett
                    </DialogClose>
                    <DialogClose
                        aria-label="Avbryt"
                        className="w-24 hover:bg-green-800"
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        Avbryt
                    </DialogClose>
                </div>
            </DialogContent>
            <DialogTrigger
                data-testid="delete-trigger"
                disabled={disabled}
                aria-label="Slett fil"
                title="Slett fil"
                className={` ${btnClassName}`}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
            >
                <Trash/>
            </DialogTrigger>
        </Dialog>
    );
};

export default DeleteFile;
