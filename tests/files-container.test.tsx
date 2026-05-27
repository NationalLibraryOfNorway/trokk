import {act, fireEvent, render, screen} from '@testing-library/react';
import FilesContainer from '../src/features/files-container/files-container';
import {TrokkFilesProvider, useTrokkFiles} from '../src/context/trokk-files-context';
import {SelectionProvider, useSelection} from '../src/context/selection-context';
import {RotationProvider} from '../src/context/rotation-context';
import {beforeAll, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {FileTree} from '../src/model/file-tree';

vi.mock('../src/context/trokk-files-context', () => {
    return {
        useTrokkFiles: vi.fn(),
        TrokkFilesProvider: ({children}: { children: React.ReactNode }) => <>{children}</>,

    }
});

vi.mock('../src/context/message-context.tsx', () => ({
    useMessage: () => ({
        handleBackendError: vi.fn(),
    }),
}));

vi.mock('@tauri-apps/api/core', () => ({
        convertFileSrc: vi.fn((src: string) => `mocked://${src}`),
        invoke: vi.fn().mockResolvedValue(undefined),
    })
);

vi.mock('@tauri-apps/api/path', () => ({
    documentDir: vi.fn().mockResolvedValue('mocked/path'),
    sep: vi.fn().mockResolvedValue('/'),
}));

vi.mock('@tauri-apps/plugin-fs', () => {
    return {
        readDir: vi.fn().mockResolvedValue([]),
        watchImmediate: vi.fn(() => Promise.resolve(() => {
        }))
    }
});

vi.mock('../src/context/selection-context', () => {
    return {
        useSelection: vi.fn(),
        SelectionProvider: ({children}: { children: React.ReactNode }) => <>{children}</>,
    }
});

vi.mock('../src/hooks/use-auto-focus-on-thumbnail.tsx', () => {
    return {
        useAutoFocusOnThumbnail: vi.fn(),
    }
});

vi.mock('../src/hooks/use-keyboard-navigation.tsx', () => ({
    useKeyboardNavigation: vi.fn(),
}));

const mockHandle = {
    currentIndex: 0,
    checkedItems: [],
    handleCheck: vi.fn(),
    handleIndexChange: vi.fn(),
    handleClose: vi.fn(),
};

const renderWithContext = () => {
    return render(
        <TrokkFilesProvider scannerPath="/mock/path">
            <RotationProvider>
                <SelectionProvider>
                    <FilesContainer/>
                </SelectionProvider>
            </RotationProvider>
        </TrokkFilesProvider>
    );
};

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
        const treeIndex = new Map<string, {name: string; path: string; isDirectory: boolean}>();
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

    it('Single-clicking on thumbnail focuses it without opening detail view', () => {
        renderWithContext();
        const thumbnail = screen.getByAltText('example.jpg');
        act(() => {
            fireEvent.click(thumbnail);
        })
        expect(mockHandle.handleIndexChange).toHaveBeenCalled();
        expect(screen.queryByText('Velg Forside')).toBeNull();
    });

    it('Double-clicking on thumbnail opens detail image view', () => {
        renderWithContext();
        const thumbnail = screen.getByAltText('example.jpg');
        act(() => {
            fireEvent.dblClick(thumbnail);
        })
        expect(screen.getByText('Velg Forside')).toBeDefined();
    });

    it('checkbox change triggers handleCheck', () => {
        renderWithContext();
        const checkboxes = screen.getAllByRole('checkbox');
        act(() => {
            fireEvent.click(checkboxes[0]);
        })
        expect(mockHandle.handleCheck).toHaveBeenCalled();
    });

    it('shows blue focus frame on thumbnail when state.preview is truthy but dialog is closed (regression: 002)', () => {
        // Simulate state where DetailedImageView set state.preview but it wasn't cleared
        // (the primary close path via DialogContent.onClick doesn't call handleClose)
        const treeIndex = new Map<string, {name: string; path: string; isDirectory: boolean}>();
        treeIndex.set('/mock/path/.thumbnails/example.webp', {
            name: 'example.webp',
            path: '/mock/path/.thumbnails/example.webp',
            isDirectory: false,
        });

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    children: [{
                        name: 'example.jpg',
                        path: '/mock/path/example.jpg',
                        isDirectory: false,
                    }],
                },
                preview: {
                    name: 'example.jpg',
                    path: '/mock/path/example.jpg',
                    isDirectory: false,
                },
                treeIndex,
            },
            dispatch: vi.fn(),
        });

        renderWithContext();

        const img = screen.getByAltText('example.jpg');
        const frame = img.parentElement;
        expect(frame?.className).toContain('bg-selected');
    });

    it('renders empty folder message when selected folder has no children', () => {
        (useTrokkFiles as Mock).mockReturnValue({
            state: {current: {name: 'Empty', path: '/empty/path', children: []}, fileTrees: [], isEven: true, basePath: '/empty'},
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText(/Ingen filer i mappen/i)).not.toBeNull();
    });

    it('renders breadcrumbs for the active folder', () => {
        const selectedFolder = new FileTree('Mappe', true, false, false, '/root/Serie/Mappe', false, [
            new FileTree('example.jpg', false, true, false, '/root/Serie/Mappe/example.jpg'),
        ]);
        const parentFolder = new FileTree('Serie', true, false, false, '/root/Serie', true, [selectedFolder]);

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: selectedFolder,
                fileTrees: [parentFolder],
                preview: undefined,
                treeIndex: new Map<string, {name: string; path: string; isDirectory: boolean}>(),
                isEven: false,
                basePath: '/root',
            },
            dispatch: vi.fn(),
        });
        renderWithContext();

        expect(screen.queryByText(/root/)).toBeNull();
        expect(screen.queryByText(/Serie/)).not.toBeNull();
        expect(screen.queryByText(/Mappe/)).not.toBeNull();
    });

    it('does not create a pane-owned overflow-auto scroller inside the file grid content area', () => {
        renderWithContext();

        expect(document.querySelector('.overflow-auto')).toBeNull();
    });

    it('hides non-image files from the grid', () => {
        const treeIndex = new Map<string, {name: string; path: string; isDirectory: boolean}>();

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    children: [
                        {name: 'photo.jpg', path: '/mock/path/photo.jpg', isDirectory: false},
                        {name: '.DS_Store', path: '/mock/path/.DS_Store', isDirectory: false},
                        {name: 'logfil.txt', path: '/mock/path/logfil.txt', isDirectory: false},
                        {name: 'notes.pdf', path: '/mock/path/notes.pdf', isDirectory: false},
                    ],
                },
                preview: false,
                treeIndex,
                basePath: '/mock',
            },
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText('photo.jpg')).not.toBeNull();
        expect(screen.queryByText('.DS_Store')).toBeNull();
        expect(screen.queryByText('logfil.txt')).toBeNull();
        expect(screen.queryByText('notes.pdf')).toBeNull();
    });

    it('shows empty-state message when folder contains only non-image files', () => {
        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    name: 'Folder',
                    path: '/mock/path/Folder',
                    children: [
                        {name: '.DS_Store', path: '/mock/path/Folder/.DS_Store', isDirectory: false},
                        {name: 'logfil.txt', path: '/mock/path/Folder/logfil.txt', isDirectory: false},
                    ],
                },
                preview: false,
                treeIndex: new Map(),
                basePath: '/mock',
            },
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText(/Ingen filer i mappen/i)).not.toBeNull();
    });

    it('still renders subdirectories as folder buttons alongside image filtering', () => {
        const treeIndex = new Map<string, {name: string; path: string; isDirectory: boolean}>();

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    children: [
                        {name: 'subfolder', path: '/mock/path/subfolder', isDirectory: true, children: []},
                        {name: 'photo.jpg', path: '/mock/path/photo.jpg', isDirectory: false},
                        {name: 'readme.txt', path: '/mock/path/readme.txt', isDirectory: false},
                    ],
                },
                preview: false,
                treeIndex,
                basePath: '/mock',
            },
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText('subfolder')).not.toBeNull();
        expect(screen.queryByText('photo.jpg')).not.toBeNull();
        expect(screen.queryByText('readme.txt')).toBeNull();
    });

    it('selection counter reflects filtered image files only', () => {
        const treeIndex = new Map<string, {name: string; path: string; isDirectory: boolean}>();

        (useSelection as Mock).mockReturnValue({
            ...mockHandle,
            checkedItems: ['/mock/path/photo1.jpg', '/mock/path/photo2.png'],
        });

        (useTrokkFiles as Mock).mockReturnValue({
            state: {
                current: {
                    children: [
                        {name: 'photo1.jpg', path: '/mock/path/photo1.jpg', isDirectory: false},
                        {name: 'photo2.png', path: '/mock/path/photo2.png', isDirectory: false},
                        {name: 'photo3.gif', path: '/mock/path/photo3.gif', isDirectory: false},
                        {name: '.DS_Store', path: '/mock/path/.DS_Store', isDirectory: false},
                        {name: 'logfil.txt', path: '/mock/path/logfil.txt', isDirectory: false},
                    ],
                },
                preview: false,
                treeIndex,
                basePath: '/mock',
            },
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText('2 forsider valgt')).not.toBeNull();
    });
})
;
