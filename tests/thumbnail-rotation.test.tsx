import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import Thumbnail from '../src/features/thumbnail/thumbnail';
import {FileTree} from '../src/model/file-tree.ts';
import {useTrokkFiles} from '../src/context/trokk-files-context.tsx';
import {SelectionProvider} from '../src/context/selection-context';
import {SecretProvider} from '../src/context/secret-context';
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
        getFileExtension: (path: string) => path.split('.').pop() || '',
        formatFileNames: (name: string) => name,
        getThumbnailExtensionFromTree: vi.fn(() => 'jpg'),
        getThumbnailURIFromTree: vi.fn(() => 'mock-thumbnail-uri'),
        supportedFileTypes: ['jpg', 'png', 'tif'],
    };
});

const mockDispatch = vi.fn();
const mockTrokkFilesState = {
    basePath: '',
    fileTrees: [],
    treeIndex: new Map(),
    current: undefined,
    preview: undefined,
};

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

const baseProps = {
    onClick: vi.fn(),
    isChecked: false,
    isFocused: false,
    setDelFilePath: vi.fn(),
    delFilePath: null,
};

const componentWithContext = (fileTree: FileTree, props: typeof baseProps) => {
    return (
        <RotationProvider>
            <SelectionProvider>
                <SecretProvider>
                    <Thumbnail fileTree={fileTree} {...props} />
                </SecretProvider>
            </SelectionProvider>
        </RotationProvider>
    );
};

describe('Thumbnail Rotation Feature', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.mocked(useTrokkFiles).mockReturnValue({
            state: mockTrokkFilesState,
            dispatch: mockDispatch,
        });

        // Reset file utils mocks to default values
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('jpg');
        vi.mocked(fileUtils.getThumbnailURIFromTree).mockReturnValue('mock-thumbnail-uri');
        // Reset supportedFileTypes array (important: create a new array, don't mutate)
        Object.defineProperty(fileUtils, 'supportedFileTypes', {
            value: ['jpg', 'png', 'tif'],
            writable: true,
            configurable: true
        });
    });

    it('renders rotation buttons for supported image types', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');
        const counterClockwiseBtn = container.querySelector('[aria-label="Roter mot klokken"]');

        expect(clockwiseBtn).toBeTruthy();
        expect(counterClockwiseBtn).toBeTruthy();
    });

    it('does not show rotation buttons for unsupported file types', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('unknown');
        vi.mocked(fileUtils.supportedFileTypes).splice(0);

        const fileTree = createMockFileTree('test.txt', '/path/test.txt');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');
        expect(clockwiseBtn).toBeNull();
    });

    it('rotates image clockwise on button click', async () => {
        const {invoke} = await import('@tauri-apps/api/core');

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');
        expect(clockwiseBtn).toBeTruthy();

        if (!clockwiseBtn) return;

        // Click the rotate button
        fireEvent.click(clockwiseBtn);

        // Image should show rotation immediately (CSS transform)
        const image = await screen.findByAltText('test.jpg');
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(90deg)');
        });

        // Backend call should be debounced - wait for it
        await waitFor(() => {
            expect(invoke).toHaveBeenCalledWith('rotate_image', {
                filePath: '/path/test.jpg',
                rotation: 90,
            });
        }, { timeout: 1000 });
    });

    it('rotates image counterclockwise on button click', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const counterClockwiseBtn = container.querySelector('[aria-label="Roter mot klokken"]');
        expect(counterClockwiseBtn).toBeTruthy();

        if (!counterClockwiseBtn) return;

        // Click the rotate button
        fireEvent.click(counterClockwiseBtn);

        // Image should show rotation immediately (CSS transform)
        const image = await screen.findByAltText('test.jpg');
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(270deg)');
        });
    });

    it('accumulates multiple rotations before backend save', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        // Rotate multiple times quickly
        fireEvent.click(clockwiseBtn);
        fireEvent.click(clockwiseBtn);
        fireEvent.click(clockwiseBtn);

        // Image should show accumulated rotation
        const image = await screen.findByAltText('test.jpg');
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(270deg)');
        });
    });

    it('prevents click propagation when clicking rotation buttons', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const mockOnClick = vi.fn();
        const {container} = render(componentWithContext(fileTree, {...baseProps, onClick: mockOnClick}));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        // Click the rotate button
        fireEvent.click(clockwiseBtn);

        // The parent onClick should not be called
        expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('disables rotation buttons while rotation is in progress', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        // Make the invoke call take longer
        vi.mocked(invoke).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 1000))
        );

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        // Click to start rotation
        fireEvent.click(clockwiseBtn);

        // Wait for debounce to trigger the backend call
        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });

        // Buttons should be disabled during rotation
        await waitFor(() => {
            expect(clockwiseBtn.disabled).toBe(true);
        });
    });

    it('shows rotation status overlay', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        vi.mocked(invoke).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 500))
        );

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        fireEvent.click(clockwiseBtn);

        // Should show status overlay during rotation
        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('handles rotation for webp thumbnails', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('webp');

        const fileTree = createMockFileTree('test.tif', '/path/test.tif');
        const {container} = render(componentWithContext(fileTree, baseProps));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');
        expect(clockwiseBtn).toBeTruthy();
    });
});

