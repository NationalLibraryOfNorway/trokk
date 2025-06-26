import React, {
    createContext,
    useContext,
    useState,
    useMemo,
    useRef, useEffect
} from 'react';
import { FileTree } from '../model/file-tree';
import { useTrokkFiles } from './trokk-files-context.tsx';

export interface SelectionContextProps {
    currentIndex: number;
    setCurrentIndex: (index: number) => void;
    checkedItems: string[];
    setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>;
    handleNext: () => void;
    handleClose: () => void;
    handlePrevious: () => void;
    handleCheck: () => void;
    handleOpen: (child: FileTree) => void;
    handleIndexChange: (index: number) => void;
    requestInitialFocus: () => void;
    registerFocusTarget: (el: HTMLElement | null) => void;
}

const SelectionContext = createContext<SelectionContextProps | undefined>(undefined);

export const useSelection = () => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSelection must be used within a SelectionProvider');
    }
    return context;
};

export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [currentFolderPath, setCurrentFolderPath] = useState<string | undefined>(undefined);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const { state, dispatch } = useTrokkFiles();

    useEffect(() => {
        const folderPath = state.current?.path;
        if (folderPath !== currentFolderPath) {
            setCurrentFolderPath(folderPath);
            setCheckedItems([]);  // Reset only on folder change
        }
    }, [state.current?.path]);

    const focusTargetRef = useRef<HTMLElement | null>(null);

    const files: FileTree[] = useMemo(
        () => state.current?.children?.filter(child => !child.isDirectory) || [],
        [state.current]
    );
    const handlePrevious = () => {
        const newIndex = (currentIndex - 1 + files.length) % files.length;
        setCurrentIndex(newIndex);
    };

    const handleNext = () => {
        const newIndex = (currentIndex + 1) % files.length;
        setCurrentIndex(newIndex);
    };

    const handleCheck = () => {
        const file = files[currentIndex];
        if (!file) return;

        setCheckedItems(prev => {
            if (prev.includes(file.path)) {
                return prev.filter(path => path !== file.path);
            } else {
                return [...prev, file.path];
            }
        });
    };


    const handleOpen = (child: FileTree) => {
        dispatch({ type: 'UPDATE_PREVIEW', payload: child });

        const index = files.findIndex(f => f.path === child.path);
        if (index >= 0) {
            setCurrentIndex(index);
        } else {
            console.warn('handleOpen: file not found in current list', {
                childPath: child.path,
                files: files.map(f => f.path)
            });
        }
    };

    const handleClose = () => {
        dispatch({ type: 'UPDATE_PREVIEW', payload: undefined });
    };

    const handleIndexChange = (index: number) => {
        if (index >= 0 && index < files.length) {
            setCurrentIndex(index);
        }
    };

    const requestInitialFocus = () => {
        setTimeout(() => {
            focusTargetRef.current?.focus();
            setCurrentFolderPath(state.current?.path);
        }, 0);
    };

    const registerFocusTarget = (el: HTMLElement | null) => {
        focusTargetRef.current = el;
    };

    return (
        <SelectionContext.Provider
            value={{
                currentIndex,
                setCurrentIndex,
                checkedItems,
                setCheckedItems,
                handleNext,
                handleClose,
                handlePrevious,
                handleCheck,
                handleOpen,
                handleIndexChange,
                requestInitialFocus,
                registerFocusTarget
            }}
        >
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelectionContext = (): SelectionContextProps => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSecrets must be used within a SelectionProvider');
    }
    return context;
};
