import {render} from '@testing-library/react';
import {vi} from 'vitest';
import {useSelection} from '../src/context/selection-context';
import {useTrokkFiles} from '../src/context/trokk-files-context';
import {useKeyboardNavigation} from '../src/hooks/use-keyboard-navigation';

vi.mock('../src/context/selection-context');
vi.mock('../src/context/trokk-files-context');

const keypressDelay = 100;
const mockChildren = [
    {isDirectory: false, path: '/test/file1'},
    {isDirectory: false, path: '/test/file2'},
    {isDirectory: false, path: '/test/file3'},
];

function TestComponent({
                           delFilePath,
                           setDelFilePath,
                           previewDialogOpen,
                           setPreviewDialogOpen,
                       }: any) {
    useKeyboardNavigation({
        delFilePath,
        setDelFilePath,
        previewDialogOpen,
        setPreviewDialogOpen,
    });
    return null;
}

const setupMocks = (currentIndex = 0) => {
    const handleIndexChange = vi.fn();
    const handleNext = vi.fn();
    const handlePrevious = vi.fn();
    const handleCheck = vi.fn();
    const handleClose = vi.fn();
    const setColumns = vi.fn();

    const setDelFilePath = vi.fn();
    const setPreviewDialogOpen = vi.fn();

    (useSelection as vi.Mock).mockReturnValue({
        currentIndex,
        handleIndexChange,
        handleNext,
        handlePrevious,
        handleCheck,
        handleClose,
        setColumns,
        columns: 1,
    });

    (useTrokkFiles as vi.Mock).mockReturnValue({
        state: {
            current: {
                path: '/test',
                children: mockChildren,
            },
        },
    });

    render(
        <TestComponent
            delFilePath={null}
            setDelFilePath={setDelFilePath}
            previewDialogOpen={false}
            setPreviewDialogOpen={setPreviewDialogOpen}
        />
    );

    return {
        handleIndexChange,
        handleNext,
        handlePrevious,
        handleCheck,
        handleClose,
        setColumns,
        setDelFilePath,
        setPreviewDialogOpen,
    };
};

beforeAll(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    window.onkeyPress = null;
});

describe('useKeyboardNavigation', () => {
    function pressKey(key: string, options: KeyboardEventInit = {}) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key, ...options }));
    }

    it('ArrowDown and j/J should handleIndexChange', () => {
        const {handleIndexChange} = setupMocks(0);
        ['ArrowDown', 'j', 'J'].forEach(key => {
            pressKey(key, {});
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleIndexChange).toHaveBeenCalledTimes(3);
    });

    it('ArrowUp and k/K should handleIndexChange', () => {
        const {handleIndexChange} = setupMocks(1);
        ['ArrowUp', 'k', 'K'].forEach(key => {
            pressKey(key, {});
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleIndexChange).toHaveBeenCalledTimes(3);
    });

    it('Home should handleIndexChange to 0', () => {
        const {handleIndexChange} = setupMocks(2);
        pressKey('Home', {});
        expect(handleIndexChange).toHaveBeenCalledWith(0);
    });

    it('should handle End key', () => {
        const {handleIndexChange} = setupMocks(0);
        pressKey('End', {});
        expect(handleIndexChange).toHaveBeenCalledWith(mockChildren.length - 1);
    });

    it('ArrowRight and l/L should handleNext', () => {
        const {handleNext} = setupMocks(0);
        ['ArrowRight', 'l', 'L'].forEach(key => {
            pressKey(key, {});
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleNext).toHaveBeenCalledTimes(3);
    });

    it('ArrowLeft and h/H should handlePrevious', () => {
        const {handlePrevious} = setupMocks(0);
        ['ArrowLeft', 'h', 'H'].forEach(key => {
            pressKey(key, {});
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handlePrevious).toHaveBeenCalledTimes(3);
    });

    it('Escape should handleClose and close preview dialog', () => {
        const {handleClose, setPreviewDialogOpen} = setupMocks();
        pressKey('Escape', {});
        expect(handleClose).toHaveBeenCalled();
        expect(setPreviewDialogOpen).toHaveBeenCalledWith(false);
    });

    it('Spacebar should handleCheck', () => {
        const {handleCheck} = setupMocks();
        ['Spacebar', ' '].forEach(key => {
            pressKey(key, {});
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleCheck).toHaveBeenCalledTimes(2);
    });

    it('Ctrl + 1-9 should set columns to 1-9', () => {
        const {setColumns} = setupMocks();
        for (let i = 1; i < 10; i++) {
            pressKey(i.toString(), {ctrlKey: true});
            expect(setColumns).toHaveBeenCalledWith(i);
        }
    });

    it('Ctrl+0 should set columns to 10', () => {
        const {setColumns} = setupMocks();
        pressKey('0', {ctrlKey: true});
        expect(setColumns).toHaveBeenCalledWith(10);
    });

    it('Enter should open preview dialog if no delete path', () => {
        const {setPreviewDialogOpen} = setupMocks(2);
        pressKey('Enter', {});
        expect(setPreviewDialogOpen).toHaveBeenCalledWith(true);
    });

    it('Delete should set delete file path if no preview open', () => {
        const {setDelFilePath} = setupMocks(1);
        pressKey('Delete', {});
        expect(setDelFilePath).toHaveBeenCalledWith(mockChildren[1].path);
    });
});
