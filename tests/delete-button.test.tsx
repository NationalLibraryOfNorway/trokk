import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import DeleteButton from '../src/features/delete-button/delete-button';

const dispatchMock = vi.fn();

vi.mock('../src/context/trokk-files-context.tsx', () => ({
    useTrokkFiles: () => ({
        state: {
            fileTrees: [{path: 'file1', children: []}],
            current: {path: 'file1', children: []}
        },
        dispatch: dispatchMock
    })
}));

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

describe('DeleteButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders dialog trigger', () => {
        render(<DeleteButton childPath="file1" />);
        expect(screen.getByText('✕')).toBeDefined();
    });

    it('shows dialog content on trigger click', async () => {
        render(<DeleteButton childPath="file1" />);
        fireEvent.click(screen.getByText('✕'));
        expect(await screen.findByText(/Er du sikker/)).toBeDefined();
        expect(screen.getByText('Slett')).toBeDefined();
        expect(screen.getByText('Avbryt')).toBeDefined();
    });

    it('calls handleDelete and dispatch on delete', async () => {
        const {invoke} = await import('@tauri-apps/api/core');
        render(<DeleteButton childPath="file1" />);
        fireEvent.click(screen.getByText('✕'));
        fireEvent.click(screen.getByText('Slett'));
        expect(invoke).toHaveBeenCalledWith('delete_image', {fileName: 'file1'});
        expect(dispatchMock).toHaveBeenCalled();
    });
});
