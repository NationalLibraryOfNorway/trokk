import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import FileTreeItem from '../src/features/file-tree-item/file-tree-item';
import {FileTree} from '../src/model/file-tree';

const mockRemoveMessages = vi.fn();
const mockChangeViewDirectory = vi.fn();
const mockToggleFolderExpand = vi.fn();

vi.mock('../src/context/upload-progress-context.tsx', () => ({
    useUploadProgress: () => ({
        allUploadProgress: {
            dir: {},
        },
    }),
}));

vi.mock('../src/context/message-context.tsx', () => ({
    useMessage: () => ({
        removeMessages: mockRemoveMessages,
    }),
}));

const createFile = (name: string, path: string) => new FileTree(name, false, true, false, path);
const createFolder = (name: string, path: string, children: FileTree[] = []) =>
    new FileTree(name, true, false, false, path, false, children);

const renderItem = (file: FileTree, currentPath = '') => {
    render(
        <ul>
            <FileTreeItem
                file={file}
                toggleFolderExpand={mockToggleFolderExpand}
                changeViewDirectory={mockChangeViewDirectory}
                currentPath={currentPath}
            />
        </ul>
    );
};

describe('FileTreeItem folder summaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not show a pill for folders without workable images', () => {
        const folder = createFolder('Tom mappe', '/scanner/tom', [
            createFolder('under', '/scanner/tom/under'),
        ]);

        renderItem(folder);

        expect(screen.queryByLabelText('Antall bilder i Tom mappe: 0')).toBeNull();
    });

    it('shows a red odd-count pill for folders with an odd number of images', () => {
        const folder = createFolder('Odd', '/scanner/odd', [
            createFile('001.tif', '/scanner/odd/001.tif'),
            createFile('002.tif', '/scanner/odd/002.tif'),
            createFile('003.tif', '/scanner/odd/003.tif'),
        ]);

        renderItem(folder);

        const pill = screen.getByLabelText('Antall bilder i Odd: 3');
        expect(pill.textContent).toBe('3');
        expect(pill.className).toContain('bg-red-950');
    });

    it('shows a green ready pill for folders with a non-zero even number of images', () => {
        const folder = createFolder('Klar', '/scanner/klar', [
            createFile('001.tif', '/scanner/klar/001.tif'),
            createFile('002.tif', '/scanner/klar/002.tif'),
        ]);

        renderItem(folder);

        const pill = screen.getByLabelText('Antall bilder i Klar: 2');
        expect(pill.textContent).toBe('2');
        expect(pill.className).toContain('bg-emerald-950');
    });

    it('counts merge-folder images and opens the resolved target directory when clicked', () => {
        const mergeFolder = createFolder('merge', '/scanner/batch/merge', [
            createFile('001.tif', '/scanner/batch/merge/001.tif'),
            createFile('002.tif', '/scanner/batch/merge/002.tif'),
            createFile('003.tif', '/scanner/batch/merge/003.tif'),
        ]);
        const folder = createFolder('Batch A', '/scanner/batch', [
            createFile('ignored.tif', '/scanner/batch/ignored.tif'),
            mergeFolder,
        ]);

        renderItem(folder);

        fireEvent.click(screen.getByText('Batch A'));

        expect(screen.getByLabelText('Antall bilder i Batch A: 3').textContent).toBe('3');
        expect(mockChangeViewDirectory).toHaveBeenCalledWith(mergeFolder);
        expect(mockRemoveMessages).toHaveBeenCalled();
    });

    it('keeps the pill visible and truncates the folder name on one line', () => {
        const folder = createFolder('En veldig lang mappenavnstreng', '/scanner/lang', [
            createFile('001.tif', '/scanner/lang/001.tif'),
        ]);

        renderItem(folder);

        const label = screen.getByText('En veldig lang mappenavnstreng');
        const pill = screen.getByLabelText('Antall bilder i En veldig lang mappenavnstreng: 1');

        expect(label.className).toContain('truncate');
        expect(label.className).toContain('whitespace-nowrap');
        expect(pill.className).toContain('shrink-0');
    });

    it('does not show an empty-subfolder indicator when an expanded folder has no child folders', () => {
        const folder = createFolder('Bladnode', '/scanner/bladnode', [
            createFile('001.tif', '/scanner/bladnode/001.tif'),
        ]);
        folder.opened = true;

        renderItem(folder);

        expect(screen.queryByText(/Ingen mapper/i)).toBeNull();
        expect(screen.queryByText(/Ingen filer/i)).toBeNull();
        expect(screen.queryByText('001.tif')).toBeNull();
    });

    it('does not render file rows in the left tree', () => {
        renderItem(createFile('example.tif', '/scanner/example.tif'));

        expect(screen.queryByText('example.tif')).toBeNull();
    });
});
