import { render, screen, fireEvent } from '@testing-library/react';
import FilesContainer from '../src/features/files-container/files-container';
import {TrokkFilesProvider, useTrokkFiles} from '../src/context/trokk-files-context';
import {SelectionProvider, useSelection} from '../src/context/selection-context';
import {beforeAll, Mock, vi} from 'vitest';
import React from 'react';

vi.mock('../src/context/trokk-files-context', () => ({
    useTrokkFiles: vi.fn(),
    TrokkFilesProvider: ({ children }:{children:React.ReactNode}) => <>{children}</>,
}));

vi.mock('@tauri-apps/api/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        actual,
        convertFileSrc: vi.fn((src: string) => `mocked://${src}`),
    };
});

vi.mock('@tauri-apps/api/path', () => ({
    documentDir: vi.fn().mockResolvedValue('/mocked/path'),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    readDir: vi.fn().mockResolvedValue([]),
    watchImmediate: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('../src/context/selection-context', () => ({
    useSelection: vi.fn(),
    SelectionProvider: ({ children }:{children:React.ReactNode}) => <>{children}</>,
}));

const mockHandle = {
    currentIndex: 0,
    checkedItems: [],
    handleOpen: vi.fn(),
    handleCheck: vi.fn(),
    handleNext: vi.fn(),
    handlePrevious: vi.fn(),
    handleIndexChange: vi.fn(),
    handleClose: vi.fn(),
};

const renderWithContext = () =>
    render(
        <TrokkFilesProvider scannerPath="/mock/path">
            <SelectionProvider>
                <FilesContainer />
            </SelectionProvider>
        </TrokkFilesProvider>
    );

describe('FilesContainer', () => {
    beforeAll(() => {
        window.HTMLElement.prototype.scrollIntoView = () => {
        };
    })
    beforeEach(() => {
        ((useTrokkFiles as unknown) as Mock).mockReturnValue({
            state: {
                current: {
                    children: [
                        {
                            name: 'example.jpg',
                            path: '/mock/path/example.jpg',
                            isDirectory: false,
                        },
                    ],
                },
                preview: false,
            },
            dispatch: vi.fn(),
        });

        (useSelection as Mock).mockReturnValue(mockHandle);
    });
    it('renders file thumbnail from mocked state', () => {
        renderWithContext();
        expect(screen.getByText('example.jpg')).toBeDefined();
    });


    it('calls handleOpen on Enter key', () => {
           renderWithContext();
           const container = screen.getByAltText('example.jpg');
           container.focus();
           fireEvent.keyDown(container, { key: 'Enter' });

           expect(mockHandle.handleOpen).toHaveBeenCalledWith(
               expect.objectContaining({ name: 'example.jpg' })
           );
       });

       it('calls handleCheck on space key', () => {
           renderWithContext();
           const container = screen.getByAltText('example.jpg');

           fireEvent.keyDown(container, { key: ' ' });

           expect(mockHandle.handleCheck).toHaveBeenCalled();
       });

        it('calls navigation functions on arrow keys', () => {
           renderWithContext();
           const container = screen.getByAltText('example.jpg');

           fireEvent.keyDown(container, { key: 'ArrowRight' });
           expect(mockHandle.handleNext).toHaveBeenCalled();

           fireEvent.keyDown(container, { key: 'ArrowLeft' });
           expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'h' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'H' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'j' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'J' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'k' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'K' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'l' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

            fireEvent.keyDown(container, { key: 'L' });
            expect(mockHandle.handlePrevious).toHaveBeenCalled();

           fireEvent.keyDown(container, { key: 'ArrowDown' });
           expect(mockHandle.handleIndexChange).toHaveBeenCalledWith(expect.any(Number));

           fireEvent.keyDown(container, { key: 'ArrowUp' });
           expect(mockHandle.handleIndexChange).toHaveBeenCalledWith(expect.any(Number));
       });

       it('calls handleClose on Escape key', () => {
           renderWithContext();
           const container = screen.getByAltText('example.jpg');

           fireEvent.keyDown(container, { key: 'Escape' });

           expect(mockHandle.handleClose).toHaveBeenCalled();
       });

       it('checkbox change triggers handleCheck', () => {
           renderWithContext();
           const checkboxes = screen.getAllByRole('checkbox');

           fireEvent.click(checkboxes[0]);

           expect(mockHandle.handleCheck).toHaveBeenCalled();
       });
});
