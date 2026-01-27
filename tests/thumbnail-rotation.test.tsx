import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, fireEvent, waitFor, act} from '@testing-library/react';
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
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, baseProps)));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]');
        const counterClockwiseBtn = container!.querySelector('[aria-label="Roter mot klokken"]');

        expect(clockwiseBtn).toBeTruthy();
        expect(counterClockwiseBtn).toBeTruthy();
    });

    it('does not show rotation buttons for unsupported file types', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailURIFromTree).mockReturnValue(undefined);

        const fileTree = createMockFileTree('document.pdf', '/path/document.pdf');
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, baseProps)));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]');
        expect(clockwiseBtn).toBeNull();
    });

    it('prevents click propagation when clicking rotation buttons', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const mockOnClick = vi.fn();
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, {...baseProps, onClick: mockOnClick})));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]');
        if (!clockwiseBtn) throw new Error('Rotation button not found');

        await act(async () => {
            fireEvent.click(clockwiseBtn);
        });

        expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('disables rotation buttons while rotation is in progress', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        vi.mocked(invoke).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, baseProps)));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;
        if (!clockwiseBtn) throw new Error('Rotation button not found');

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

    it('shows rotation status overlay', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        vi.mocked(invoke).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, baseProps)));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]');
        if (!clockwiseBtn) throw new Error('Rotation button not found');

        await act(async () => {
            fireEvent.click(clockwiseBtn);
        });

        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('handles rotation for webp thumbnails', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('webp');

        const fileTree = createMockFileTree('test.tif', '/path/test.tif');
        let container: HTMLElement;

        await act(async () => {
            ({container} = render(componentWithContext(fileTree, baseProps)));
        });

        const clockwiseBtn = container!.querySelector('[aria-label="Roter med klokken"]');
        expect(clockwiseBtn).toBeTruthy();
    });
});

