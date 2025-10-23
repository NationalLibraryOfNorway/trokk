import {
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
    checkedItems: string[];
    setCheckedItems: React.Dispatch<React.SetStateAction<string[]>>;
    handleNext: () => void;
    handleClose: () => void;
    handlePrevious: () => void;
    handleCheck: () => void;
    handleIndexChange: (index: number) => void;
    requestInitialFocus: () => void;
    registerFocusTarget: (el: HTMLElement | null) => void;
    columns: number,
    setColumns: React.Dispatch<React.SetStateAction<number>>;
}

const SelectionContext = createContext<SelectionContextProps | undefined>(undefined);


export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [currentFolderPath, setCurrentFolderPath] = useState<string | undefined>(undefined);
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [columns, setColumns] = useState<number>(2);

    const { state, dispatch } = useTrokkFiles();

    useEffect(() => {
        const folderPath = state.current?.path;

        // Reset only on folder change
        if (folderPath !== currentFolderPath) {
            setCurrentFolderPath(folderPath);
            if(files.length > 0 ) {
                setCheckedItems([files.at(0)!.path]);
            } else {
                setCheckedItems([]);
            }
            handleIndexChange(0); // Reset index to 0 when folder changes
        }
    }, [state.current?.path]);

    const focusTargetRef = useRef<HTMLElement | null>(null);

    const files: FileTree[] = useMemo(
        () => state.current?.children?.filter(child => !child.isDirectory) || [],
        [state.current]
    );

    /**
     * Navigate to the previous image in the list.
     *
     * Calculates the new index by decrementing the current index.
     * If the new index is less than zero, it wraps around to the last image in the list.
     *
     * Example:
     * - totalImagesInFolder = 10
     * - currentIndex = 7
     * - newIndex = (7 - 1 + 10) % 10 = 16 % 10 = 6
     *
     * Alternatively:
     * - totalImagesInFolder = 10
     * - currentIndex = 0
     * - newIndex = (0 - 1 + 10) % 10 = 9 % 10 = 9
     * @returns {void}
     */
    const handlePrevious = () => {
        if (currentIndex != 0) {
            const newIndex = (currentIndex - 1 + files.length) % files.length;
            handleIndexChange(newIndex);
        }
    };

    /**
     * Navigate to the next image in the list.
     *
     * Calculates the new index by incrementing the current index.
     * If the new index exceeds the total number of images, it wraps around to the first image in the list.
     *
     * Example:
     * - totalImagesInFolder = 10
     * - currentIndex = 7
     * - newIndex = (7 + 1) % 10 = 8 % 10 = 8
     *
     * Alternatively:
     * - totalImagesInFolder = 10
     * - currentIndex = 9
     * - newIndex = (9 + 1) % 10 = 10 % 10 = 0
     * @returns {void}
     */
    const handleNext = () => {
        if (currentIndex != files.length - 1) {
            const newIndex = (currentIndex + 1) % (files.length);
            handleIndexChange(newIndex);
        }
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
            setCurrentIndex(0);
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
                checkedItems,
                setCheckedItems,
                handleNext,
                handleClose,
                handlePrevious,
                handleCheck,
                handleIndexChange,
                requestInitialFocus,
                registerFocusTarget,
                columns,
                setColumns
            }}
        >
            {children}
        </SelectionContext.Provider>
    );
};

export const useSelection = (): SelectionContextProps => {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error('useSecrets must be used within a SelectionProvider');
    }
    return context;
};
