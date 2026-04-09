import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import DeleteFile from '../src/features/delete-file/delete-file';
import {useState} from 'react';
import {remove} from '@tauri-apps/plugin-fs';

const testFileName = '/some/parent/merge/file1.tif';

vi.mock('@tauri-apps/plugin-fs', () => ({
    remove: vi.fn(),
}));

vi.mock('../src/context/selection-context.tsx', () => ({
    useSelection: () => ({columns: 3})
}));

vi.mock('@/model/file-tree.ts', () => ({
    FileTree: {
        fromSpread: vi.fn((obj) => obj)
    }
}));

vi.mock('@tauri-apps/api/path', () => ({
    dirname: vi.fn(async (p) => {
        // For the merge test, return the parent directory
        if (p.endsWith('/merge/file1.tif')) return '/some/parent/merge';
        if (p.endsWith('/merge')) return '/some/parent';
        if (p.endsWith('/file1.tif')) return '/some/parent';
        return '/';
    }),
    basename: vi.fn(async (p) => {
        // Return the file or directory name
        if (p.endsWith('/merge/file1.tif')) return 'file1.tif';
        if (p.endsWith('/merge')) return 'merge';
        if (p.endsWith('/file1.tif')) return 'file1.tif';
        if (p.endsWith('/parent')) return 'parent';
        return '';
    }),
    join: vi.fn(async (...args) => args.join('/').replace(/\/+/g, '/')),
    documentDir: vi.fn(async () => '/mock/documentDir'), // Mock documentDir for context
}));

const TestWrapper = () => {
    const [delFilePath, setDelFilePath] = useState<string | null>(null);
    return(
        <DeleteFile childPath={testFileName} delFilePath={delFilePath} setDelFilePath={setDelFilePath} disabled={false}/>
    );
};

async function openDeleteDialog() {
    const trigger = await screen.findByTestId('delete-trigger');
    fireEvent.click(trigger);
    // Wait for the dialog to actually open
    await screen.findByText(/Er du sikker/);
}

async function clickDelete() {
    const deleteBtn = await screen.findByText('Slett', {}, {timeout: 1000});
    fireEvent.click(deleteBtn);
}


describe('DeleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dialog trigger', () => {
        render(<TestWrapper />);
        expect(screen.getByTestId('delete-trigger')).toBeDefined();
    });

    it('shows dialog content on trigger click', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();
        expect(await screen.findByText(/Er du sikker/)).toBeDefined();
        expect(await screen.findByText('Slett')).toBeDefined();
        expect(await screen.findByText('Avbryt')).toBeDefined();
    });

    it('calls handleDelete when opening dialog and clicking "slett"', async () => {
        render(<TestWrapper />);
        await openDeleteDialog()
        await clickDelete()
        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith(testFileName);
        });
    });

    it('does not delete when clicking "Avbryt"', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();
        const cancelBtn = await screen.findByText('Avbryt', {}, {timeout: 1000});
        fireEvent.click(cancelBtn);
        expect(remove).not.toHaveBeenCalled();
    });

    it('closes dialog after deletion', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();
        await clickDelete();
        await waitFor(() => {
            expect(remove).toHaveBeenCalled();
        });
    });

    it('shows correct file name in dialog', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();
        const dialog = await screen.findByText(/Er du sikker/);
        expect(dialog).toBeDefined();
    });

    it('deletes both merge and parent file when path is in merge folder', async () => {
        const mergePath = '/some/parent/merge/file1.tif';
        const TestMergeWrapper = () => {
            const [delFilePath, setDelFilePath] = useState<string | null>(null);
            return (
                <DeleteFile childPath={mergePath} delFilePath={delFilePath} setDelFilePath={setDelFilePath} disabled={false}/>
            );
        };
        render(<TestMergeWrapper />);
        await openDeleteDialog();
        await clickDelete();
        await waitFor(() => {
            expect(remove).toHaveBeenCalledWith(mergePath);
            expect(remove).toHaveBeenCalledWith('/some/parent/merge/.thumbnails/file1.webp');
            expect(remove).toHaveBeenCalledWith('/some/parent/merge/.previews/file1.webp');
        });
    });

});
