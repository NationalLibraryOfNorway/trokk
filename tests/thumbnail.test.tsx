import { render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Thumbnail from '../src/features/thumbnail/thumbnail';
import {FileTree} from '../src/model/file-tree.ts';
import {useTrokkFiles} from '../src/context/trokk-files-context.tsx';
import {SelectionProvider} from '../src/context/selection-context';
import {SecretProvider} from '../src/context/secret-context';

vi.mock('../src/context/trokk-files-context.tsx', () => ({
    useTrokkFiles: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
    convertFileSrc: (path: string) => `mock-src/${path}`,
    invoke: vi.fn().mockResolvedValue('mocked-response'),
}));

vi.mock('../src/util/file-utils.ts', async () => {
    const actual = await vi.importActual<typeof import('../src/util/file-utils.ts')>(
        '../src/util/file-utils.ts'
    );
    return {
        ...actual,
        getFileExtension: (path: string) => path.split('.').pop() || '',
        formatFileNames: (name: string) => name.toUpperCase(),
        getThumbnailExtensionFromTree: vi.fn(() => 'unknown'),
        getThumbnailURIFromTree: vi.fn(() => 'mock-thumbnail-uri'),
        supportedFileTypes: ['jpg', 'png'],
    };
});

const mockDispatch = vi.fn();

const baseProps = {
    onClick: vi.fn(),
    isChecked: false,
    isFocused: false,
};

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
        sort(): void {
        },
        sortRecursive(): void {
        },
    };
}

const componentWithContext = (fileTree: FileTree, baseProps: any) => {
    return (
        <SelectionProvider>
            <SecretProvider>
                <Thumbnail fileTree={fileTree} {...baseProps} />
            </SecretProvider>
        </SelectionProvider>
    );
};

describe('Thumbnail', () => {
    beforeEach(() => {
        vi.mocked(useTrokkFiles).mockReturnValue({
            state: mockTrokkFilesState,
            dispatch: mockDispatch,
        });
    });

    it('renders an image if the file type is supported', async () => {
        const fileTree = createMockFileTree('example.jpg', '/mock/path/example.jpg');
        render(componentWithContext(fileTree, baseProps));
        expect(await screen.findByAltText('example.jpg')).toBeDefined();
    });

    it('renders a thumbnail if extension is webp', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('webp');
        const fileTree = createMockFileTree('example.other', '/mock/path/example.other');
        render(componentWithContext(fileTree, baseProps));
        expect(await screen.findByAltText('example.other')).toBeDefined();
    });

    it('does not render for system folders', async () => {
        const fileUtils = await import('../src/util/file-utils.ts');
        vi.mocked(fileUtils.getThumbnailExtensionFromTree).mockReturnValue('unknown');
        const fileTree = createMockFileTree('.thumbnails', 'docs/.thumbnails');
        render(componentWithContext(fileTree, baseProps));
        await expect(screen.findByAltText('.thumbnail')).rejects.toThrow();
        await expect(screen.findByAltText('docs/.thumbnails')).rejects.toThrow();
    });
});
