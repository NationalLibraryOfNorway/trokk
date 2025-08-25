import {render} from '@testing-library/react';
import {vi} from 'vitest';
import {useSelection} from '../src/context/selection-context';
import {useTrokkFiles} from '../src/context/trokk-files-context';
import {useKeyboardNavigation} from '../src/hooks/use-keyboard-navigation';

vi.mock('../src/context/selection-context');
vi.mock('../src/context/trokk-files-context');

const keypressDelay = 100;
const mockChildren = [
    {isDirectory: false},
    {isDirectory: false},
    {isDirectory: false},
];

function TestComponent() {
    useKeyboardNavigation();
    return null;
}

const setupMocks = (currentIndex = 0) => {
    const handleIndexChange = vi.fn();
    const handleNext = vi.fn();
    const handlePrevious = vi.fn();
    const handleCheck = vi.fn();
    const handleClose = vi.fn();
    const setColumns = vi.fn();

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

    render(<TestComponent/>);
    return {handleIndexChange, handleNext, handlePrevious, handleCheck, handleClose, setColumns};
};

beforeAll(() => {
    vi.useFakeTimers();
});

describe('useKeyboardNavigation', () => {


    it('ArrowDown and j/J should handleIndexChange', () => {
        const {handleIndexChange} = setupMocks(0);
        ['ArrowDown', 'j', 'J'].forEach(key => {
            window.dispatchEvent(new KeyboardEvent('keydown', {key}));
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleIndexChange).toHaveBeenCalledTimes(3);
    });

    it('ArrowUp, and k/K should handleIndexChange', () => {
        const {handleIndexChange} = setupMocks(1);
        ['ArrowUp', 'k', 'K'].forEach(key => {
            window.dispatchEvent(new KeyboardEvent('keydown', {key}));
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleIndexChange).toHaveBeenCalledTimes(3);
    });

    it('Home should handleIndexChange to 0', () => {
        const {handleIndexChange} = setupMocks(2);
        window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home'}));
        expect(handleIndexChange).toHaveBeenCalledWith(0);
    });

    it('should handle End key', () => {
        const {handleIndexChange} = setupMocks(0);
        window.dispatchEvent(new KeyboardEvent('keydown', {key: 'End'}));
        expect(handleIndexChange).toHaveBeenCalledWith(mockChildren.length - 1);
    });

    it('ArrowRight and l/L should handleNext', () => {
        const {handleNext} = setupMocks(0);
        ['ArrowRight', 'l', 'L'].forEach(key => {
            window.dispatchEvent(new KeyboardEvent('keydown', {key}));
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleNext).toHaveBeenCalledTimes(3);
    });

    it('ArrowLeft and h/H should handlePrevious', () => {
        const {handlePrevious} = setupMocks(0);
        ['ArrowLeft', 'h', 'H'].forEach(key => {
            window.dispatchEvent(new KeyboardEvent('keydown', {key}));
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handlePrevious).toHaveBeenCalledTimes(3);
    });

    it('Escape should handleClose', () => {
        const {handleClose} = setupMocks();
        window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
        expect(handleClose).toHaveBeenCalled();
    });

    it('Spacebar should handleCheck', () => {
        const {handleCheck} = setupMocks();
        ['Spacebar', ' '].forEach(key => {
            window.dispatchEvent(new KeyboardEvent('keydown', {key}));
            vi.advanceTimersByTime(keypressDelay);
        });
        expect(handleCheck).toHaveBeenCalledTimes(2);
    });

    it('Ctrl + 1-9 should set colums to 1-9', () => {
        const {setColumns} = setupMocks();
        for (let i = 1; i < 10; i++) {
            window.dispatchEvent(new KeyboardEvent('keydown', {key: i.toString(), ctrlKey: true}));
            expect(setColumns).toHaveBeenCalledWith(i);
        }
    });

    it('Ctrl+0 should set colums to 10', () => {
        const {setColumns} = setupMocks();
        window.dispatchEvent(new KeyboardEvent('keydown', {key: '0', ctrlKey: true}));
        expect(setColumns).toHaveBeenCalledWith(10);
    });
});
