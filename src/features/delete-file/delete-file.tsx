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
import {useDialog} from '../../context/dialog-context.tsx';


export interface DeleteFile {
    childPath: string;
}

const DeleteFile: React.FC<DeleteFile> = ({childPath}: DeleteFile) => {
    const {columns} = useSelection();
    const {openDelDialog, handleDelete, delFilePath} = useDialog();

    const getDeleteBtnSize = (columns: number) => {
        if (columns <= 2) return 'w-10 h-10';
        if (columns <= 5) return 'w-8 h-8 text-sm px-2';
        if (columns <= 10) return 'w-6 h-6 text-sm py-1 px-1.5';
        return 'w-4 h-4';
    };

    return (
        <Dialog open={delFilePath === childPath} onOpenChange={(open) => openDelDialog(open ? childPath : null)}>
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
