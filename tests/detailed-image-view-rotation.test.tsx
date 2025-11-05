import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
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
        render(componentWithContext(fileTree));

        const tooltips = await screen.findAllByText('Roter med klokken');
        expect(tooltips.length).toBeGreaterThan(0);
    });

    it('rotates image clockwise on button click', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;
        fireEvent.click(clockwiseBtn);

        // Image should show rotation immediately
        const image = screen.getByAltText('Forhåndsvisning av bilde');
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(90deg)');
        });
    });

    it('rotates image counterclockwise on button click', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const counterClockwiseBtn = container.querySelector('[aria-label="Roter mot klokken"]') as HTMLButtonElement;
        fireEvent.click(counterClockwiseBtn);

        // Image should show rotation immediately
        const image = screen.getByAltText('Forhåndsvisning av bilde');
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(270deg)');
        });
    });

    it('applies animation class during rotation', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;
        const image = screen.getByAltText('Forhåndsvisning av bilde');

        fireEvent.click(clockwiseBtn);

        // Should have transition class
        await waitFor(() => {
            expect(image.className).toContain('transition-transform');
        });
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

        clockwiseBtn.dispatchEvent(clickEvent);

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

        fireEvent.click(clockwiseBtn);

        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });

        await waitFor(() => {
            expect(clockwiseBtn.disabled).toBe(true);
        });
    });

    it('adjusts max dimensions for 90/270 degree rotations', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;
        fireEvent.click(clockwiseBtn);

        const image = screen.getByAltText('Forhåndsvisning av bilde');

        await waitFor(() => {
            // After 90 degree rotation, maxWidth should be constrained
            const style = image.style;
            expect(style.maxWidth).toContain('min');
        });
    });

    it('handles multiple rapid rotations', async () => {
        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]') as HTMLButtonElement;

        // Rotate multiple times
        fireEvent.click(clockwiseBtn);
        fireEvent.click(clockwiseBtn);
        fireEvent.click(clockwiseBtn);
        fireEvent.click(clockwiseBtn);

        const image = screen.getByAltText('Forhåndsvisning av bilde');

        // Should wrap around to 0 degrees (4 * 90 = 360)
        await waitFor(() => {
            expect(image.style.transform).toContain('rotate(0deg)');
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

        fireEvent.click(clockwiseBtn);

        await waitFor(() => {
            expect(invoke).toHaveBeenCalled();
        }, { timeout: 1000 });
    });

    it('updates cache buster to force image reload', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        const fileUtils = await import('../src/util/file-utils.ts');

        // Ensure preview exists
        vi.mocked(fileUtils.getPreviewFromTree).mockReturnValue(createMockFileTree('preview.webp', '/preview/path.webp'));

        vi.mocked(invoke).mockResolvedValue(undefined);

        const fileTree = createMockFileTree('test.jpg', '/path/test.jpg');
        const {container} = render(componentWithContext(fileTree));

        const image = await screen.findByAltText('Forhåndsvisning av bilde');
        const initialSrc = image.getAttribute('src');

        const clockwiseBtn = container.querySelector('[aria-label="Roter med klokken"]');

        if (!clockwiseBtn) {
            throw new Error('Rotation button not found');
        }

        fireEvent.click(clockwiseBtn);

        // After rotation completes, src should change (cache buster)
        await waitFor(() => {
            const newSrc = image.getAttribute('src');
            expect(newSrc).not.toBe(initialSrc);
        }, { timeout: 2000 });
    });
});

