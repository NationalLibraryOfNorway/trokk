import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { useSelection } from '../src/context/selection-context';
import { useTrokkFiles } from '../src/context/trokk-files-context';
import { useKeyboardNavigation } from '../src/hooks/use-keyboard-navigation';

vi.mock('../src/context/selection-context');
vi.mock('../src/context/trokk-files-context');

const mockChildren = [
    { isDirectory: false },
    { isDirectory: false },
    { isDirectory: false },
];

function TestComponent() {
    useKeyboardNavigation();
    return null;
}

const setupMocks = (currentIndex = 0) => {
    const handleIndexChange = vi.fn();

    (useSelection as vi.Mock).mockReturnValue({
        currentIndex,
        handleIndexChange,
        handleNext: vi.fn(),
        handlePrevious: vi.fn(),
        handleCheck: vi.fn(),
        handleClose: vi.fn(),
        setColumns: vi.fn(),
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

    render(<TestComponent />);
    return handleIndexChange;
};

describe('useKeyboardNavigation', () => {
    it('should handle ArrowDown key', () => {
        const handleIndexChange = setupMocks(0);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
        expect(handleIndexChange).toHaveBeenCalledWith(1);
    });

    it('should handle ArrowUp key', () => {
        const handleIndexChange = setupMocks(1);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
        expect(handleIndexChange).toHaveBeenCalledWith(0);
    });

    it('should handle Home key', () => {
        const handleIndexChange = setupMocks(2);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
        expect(handleIndexChange).toHaveBeenCalledWith(0);
    });

    it('should handle End key', () => {
        const handleIndexChange = setupMocks(0);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
        expect(handleIndexChange).toHaveBeenCalledWith(mockChildren.length - 1);
    });
});
