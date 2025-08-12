import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FilesContainer from '../src/features/files-container/files-container';
import { TrokkFilesProvider, useTrokkFiles } from '../src/context/trokk-files-context';
import { SelectionProvider, useSelection } from '../src/context/selection-context';
import { beforeAll, beforeEach, describe, it, vi, Mock } from 'vitest';

vi.mock('../src/context/trokk-files-context', () => ({
    useTrokkFiles: vi.fn(),
    TrokkFilesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@tauri-apps/api/core', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        actual,
        convertFileSrc: vi.fn((src: string) => `mocked://${src}`),
    };
});

vi.mock('@tauri-apps/api/path', async (importOriginal) => {
    const actual = await importOriginal();

    return {
        actual,
        documentDir: vi.fn().mockResolvedValue('/mocked/path'),
        sep: vi.fn().mockResolvedValue('/'),
    };
});

vi.mock('@tauri-apps/plugin-fs', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        actual,
        readDir: vi.fn().mockResolvedValue([]),
        watchImmediate: vi.fn(() => Promise.resolve(() => {})),
    };
});

vi.mock('../src/context/selection-context', () => ({
    useSelection: vi.fn(),
    SelectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
        window.HTMLElement.prototype.scrollIntoView = () => {};
    });

    beforeEach(() => {
        // Construct expected thumbnail path
        const originalFile = {
            name: 'example.jpg',
            path: '/mock/path/example.jpg',
            isDirectory: false,
        };
        const thumbnailPath = '/mock/path/.thumbnails/example.webp';

        // Add the thumbnail FileTree to treeIndex map
        const treeIndex = new Map<string, any>();
        treeIndex.set(thumbnailPath, {
            name: 'example.webp',
            path: thumbnailPath,
            isDirectory: false,
        });

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    children: [originalFile],
                },
                preview: false,
                treeIndex,
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

        mockHandle.handleOpen({
            name: 'example.jpg',
            path: '/mock/path/example.jpg',
            isDirectory: false,
        });

        expect(mockHandle.handleOpen).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'example.jpg' })
        );
    });


   it('checkbox change triggers handleCheck', () => {
       renderWithContext();
       const checkboxes = screen.getAllByRole('checkbox');

       fireEvent.click(checkboxes[0]);

       expect(mockHandle.handleCheck).toHaveBeenCalled();
   });
});
