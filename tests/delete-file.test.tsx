import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import DeleteFile from '../src/features/delete-file/delete-file';
import {useState} from 'react';
import {remove} from '@tauri-apps/plugin-fs';

const testFileName = 'file1';

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

const TestWrapper = () => {
    const [delFilePath, setDelFilePath] = useState<string | null>(null);
    return(
        <DeleteFile childPath={testFileName} delFilePath={delFilePath} setDelFilePath={setDelFilePath}/>
    );
};

describe('DeleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dialog trigger', () => {
        render(<TestWrapper />);
        expect(screen.getByText('✕')).toBeDefined();
    });

    it('shows dialog content on trigger click', async () => {
        render(<TestWrapper />);
        fireEvent.click(screen.getByText('✕'));
        expect(await screen.findByText(/Er du sikker/)).toBeDefined();
        expect(screen.getByText('Slett')).toBeDefined();
        expect(screen.getByText('Avbryt')).toBeDefined();
    });

    it('calls handleDelete when opening dialog and clicking "slett"', async () => {
        render(<TestWrapper />);
        fireEvent.click(screen.getByText('✕'));
        fireEvent.click(screen.getByText('Slett'));
        expect(remove).toHaveBeenCalledWith(testFileName);
    });
});
