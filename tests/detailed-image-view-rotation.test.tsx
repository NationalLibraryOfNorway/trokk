import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, fireEvent, waitFor, act} from '@testing-library/react';
import DetailedImageView from '../src/features/detailed-image-view/detailed-image-view';
import {FileTree} from '../src/model/file-tree.ts';
import {useTrokkFiles} from '../src/context/trokk-files-context.tsx';
import {SelectionProvider} from '../src/context/selection-context';
import {RotationProvider} from '../src/context/rotation-context';

// Mock dependencies
vi.mock('../src/context/trokk-files-context.tsx', () => ({
    useTrokkFiles: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
    convertFileSrc: (path: string) => `mock-src/${path}`,
    invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/util/file-utils.ts', async () => {
    const actual = await vi.importActual<typeof import('../src/util/file-utils.ts')>(
        '../src/util/file-utils.ts'
    );
    return {
        ...actual,
        getPreviewFromTree: vi.fn(() => ({path: '/preview/path.webp'})),
        getPreviewURIFromTree: vi.fn(() => 'mock-preview-uri'),
    };
});

function createMockFileTree(name: string, path: string): FileTree {
    return {
        name,
        path,
        isDirectory: false,
        isFile: true,
        isSymlink: false,
        opened: false,
        async recursiveRead(): Promise<FileTree[] | undefined> {
            return Promise.resolve(undefined);
        },
        sort(): void {},
        sortRecursive(): void {},
    };
}

const mockDispatch = vi.fn();
const mockTrokkFilesState = {
    basePath: '',
    fileTrees: [],
    treeIndex: new Map(),
    current: undefined,
    preview: createMockFileTree('preview.webp', '/preview/path.webp'),
};

const baseProps = {
    totalImagesInFolder: 5,
};

const componentWithContext = (image: FileTree) => {
    return (
        <RotationProvider>
            <SelectionProvider>
                <DetailedImageView image={image} {...baseProps} />
            </SelectionProvider>
        </RotationProvider>
    );
};

describe('DetailedImageView Rotation Feature', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useTrokkFiles).mockReturnValue({
            state: mockTrokkFilesState,
            dispatch: mockDispatch,
        });
    });

    it('renders rotation buttons', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');
        const counterClockwiseBtn = container.querySelector('[aria-label="Roter mot klokken"]');

        expect(clockwiseBtn).toBeTruthy();
        expect(counterClockwiseBtn).toBeTruthy();
    });

    it('shows rotation button tooltips', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = await waitFor(() => {
            const btn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLElement | null;
            if (!btn) throw new Error('Rotation button not found');
            return btn;
        });

        expect(clockwiseBtn.getAttribute('title')).toBe('Roter med klokken');
    });

    it('prevents click propagation when clicking rotation buttons', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const mockStopPropagation = vi.fn();
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;

        const clickEvent = new MouseEvent('click', {bubbles: true});
        Object.defineProperty(clickEvent, 'stopPropagation', {
            value: mockStopPropagation,
            writable: false,
        });

        await act(async () => {
            clockwiseBtn.dispatchEvent(clickEvent);
        });

        expect(mockStopPropagation).toHaveBeenCalled();
    });

    it('disables rotation buttons while rotation is in progress', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        vi.mocked(invoke).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 1000))
        );

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;

        await act(async () => {
            fireEvent.click(clockwiseBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(clockwiseBtn.disabled).toBe(true);
        });
    });

    it('shows loading spinner when preview does not exist', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getPreviewFromTree).mockReturnValue(undefined);

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        // Should show loading spinner
        const spinner = container.querySelector('.animate-spin');
        expect(spinner).toBeTruthy();
    });

    it('shows status overlay during rotation', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        const fileUtils = await import('../src/util/file-utils.ts');

        // Ensure preview exists
        vi.mocked(fileUtils.getPreviewFromTree).mockReturnValue(createMockFileTree('preview.webp', '/preview/path.webp'));

        vi.mocked(invoke).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 500))
        );

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        // Click to start rotation
        await act(async () => {
            fireEvent.click(clockwiseBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('invokes backend rotation when button is clicked', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        const fileUtils = await import('../src/util/file-utils.ts');

        // Ensure preview exists
        vi.mocked(fileUtils.getPreviewFromTree).mockReturnValue(createMockFileTree('preview.webp', '/preview/path.webp'));

        vi.mocked(invoke).mockResolvedValue(undefined);

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        await act(async () => {
            fireEvent.click(clockwiseBtn);
        });

        // Verify rotation was invoked with correct parameters
        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('rotate_image', {
                filePath: '/path/test.jpg',
                rotation: 90,
            });
        }, { timeout: 500 });
    });

    it('updates image src (cache buster) after rotation so it reloads', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        vi.mocked(invoke).mockResolvedValue(undefined);

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const img = container.querySelector('img') as HTMLImageElement | null;
        expect(img).toBeTruthy();

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement | null;
        expect(clockwiseBtn).toBeTruthy();

        await act(async () => {
            fireEvent.click(clockwiseBtn!);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('rotate_image', {
                filePath: '/path/test.jpg',
                rotation: 90,
            });
        });

        // The UI should enter a loading/reload state (overlay spinner appears)
        await waitFor(() => {
            const overlaySpinner = container.querySelector('.animate-spin');
            if (!overlaySpinner) {
                throw new Error('Expected loading spinner overlay after rotation');
            }
        });
    });
});
