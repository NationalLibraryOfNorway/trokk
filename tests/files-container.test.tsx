import {act, fireEvent, render, screen} from '@testing-library/react';
import FilesContainer from '../src/features/files-container/files-container';
import {TrokkFilesProvider, useTrokkFiles} from '../src/context/trokk-files-context';
import {SelectionProvider, useSelection} from '../src/context/selection-context';
import {beforeAll, beforeEach, describe, expect, it, Mock, vi} from 'vitest';

vi.mock('../src/context/trokk-files-context', () => {
    return {
        useTrokkFiles: vi.fn(),
        TrokkFilesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,

    }
});

vi.mock('@tauri-apps/api/core', () => ({
        convertFileSrc: vi.fn((src: string) => `mocked://${src}`),
    })
);

vi.mock("@tauri-apps/api/path", () => ({
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
        SelectionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
            <SelectionProvider>
                <FilesContainer/>
            </SelectionProvider>
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

    it('Clicking on thumbnail opens detail image view', () => {
        renderWithContext();
        const thumbnail = screen.getByAltText('example.jpg');
        act(() => {
            fireEvent.click(thumbnail);
        })
        expect(screen.getByText('Velg Forside')).toBeDefined();
    });

    it('opens detailed view when Enter is pressed on thumbnail container', async () => {
        renderWithContext();
        const thumbnailContainer = screen.getByAltText('example.jpg');
        thumbnailContainer && thumbnailContainer.focus();
        mockHandle.currentIndex=0;
        act(() => {
            fireEvent.keyDown(thumbnailContainer!, {key: 'Enter', code: 'Enter', charCode: 13});
        });

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

    it("renders empty folder message when selected folder has no children", () => {
        (useTrokkFiles as Mock).mockReturnValue({
            state: {current: {name: "Empty", path: "/empty", children: []}},
            dispatch: vi.fn(),
        });

        renderWithContext();

        expect(screen.queryByText(/Ingen filer i mappen/i)).not.toBeNull();
    });
})
;
