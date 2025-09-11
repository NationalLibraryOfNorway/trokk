import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import DeleteFile from '../src/features/delete-file/delete-file';
import {DialogProvider} from '../src/context/dialog-context';

const handleDeleteMock = vi.fn();
const testFileName = 'file1';

vi.mock('../src/context/selection-context.tsx', () => ({
    useSelection: () => ({columns: 3})
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue('deleted')
}));

vi.mock('@/model/file-tree.ts', () => ({
    FileTree: {
        fromSpread: vi.fn((obj) => obj)
    }
}));

vi.mock('../src/context/dialog-context', () => ({
    useDialog: () => ({
        openDelDialog: vi.fn(),
        handleDelete: handleDeleteMock,
        delFilePath: testFileName
    }),
    DialogProvider: ({children}: any) => <>{children}</>
}));

const renderWithContext = () => {
    return render(
        <DialogProvider>
            <DeleteFile childPath={testFileName}/>
        </DialogProvider>
    );
};

describe('DeleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dialog trigger', () => {
        renderWithContext();
        expect(screen.getByText('✕')).toBeDefined();
    });

    it('shows dialog content on trigger click', async () => {
        renderWithContext();
        fireEvent.click(screen.getByText('✕'));
        expect(await screen.findByText(/Er du sikker/)).toBeDefined();
        expect(screen.getByText('Slett')).toBeDefined();
        expect(screen.getByText('Avbryt')).toBeDefined();
    });

    it('calls handleDelete when opening dialog and clicking "slett"', async () => {
        renderWithContext();
        fireEvent.click(screen.getByText('✕'));
        fireEvent.click(screen.getByText('Slett'));
        expect(handleDeleteMock).toHaveBeenCalled();
    });

    it('shows dialog content when pressing Delete key', async () => {
        renderWithContext();
        fireEvent.keyDown(document, {key: 'Delete', code: 'Delete'});
        expect(await screen.findByText(/Er du sikker/)).toBeDefined();
    });
});
