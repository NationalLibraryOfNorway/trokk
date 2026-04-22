import React, {useState} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import DeleteFile from '../src/features/delete-file/delete-file';
import {MessageProvider, useMessage} from '../src/context/message-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import ErrorModal from '../src/features/error-log/error-modal';
import type {StoredError} from '../src/model/error-log-entry';
import {remove} from '@tauri-apps/plugin-fs';

const testFileName = '/some/parent/merge/file1.tif';

const mockRemove = vi.mocked(remove);
const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();
const mockCaptureException = vi.fn();
const mockAddBreadcrumb = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
    remove: vi.fn(),
}));

vi.mock('../src/context/selection-context.tsx', () => ({
    useSelection: () => ({
        columns: 3,
        checkedItems: [],
        handleCheck: vi.fn(),
    }),
}));

vi.mock('../src/context/transfer-log-context', () => ({
    useTransferLog: () => ({
        addLog: vi.fn(),
    }),
    TransferLogProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/tauri-store/setting-store.ts', () => ({
    settings: {
        getErrorLogEntries: () => mockGetErrorLogEntries(),
        setErrorLogEntries: (entries: StoredError[]) => mockSetErrorLogEntries(entries),
    },
}));

vi.mock('@sentry/react', () => ({
    captureException: (error: unknown) => mockCaptureException(error),
    addBreadcrumb: (breadcrumb: unknown) => mockAddBreadcrumb(breadcrumb),
}));

vi.mock('@/model/file-tree.ts', () => ({
    FileTree: {
        fromSpread: vi.fn((obj) => obj),
    },
}));

vi.mock('@tauri-apps/api/path', () => ({
    dirname: vi.fn(async (p) => {
        if (p.endsWith('/merge/file1.tif')) return '/some/parent/merge';
        if (p.endsWith('/merge')) return '/some/parent';
        if (p.endsWith('/file1.tif')) return '/some/parent';
        return '/';
    }),
    basename: vi.fn(async (p) => {
        if (p.endsWith('/merge/file1.tif')) return 'file1.tif';
        if (p.endsWith('/merge')) return 'merge';
        if (p.endsWith('/file1.tif')) return 'file1.tif';
        if (p.endsWith('/parent')) return 'parent';
        return '';
    }),
    join: vi.fn(async (...args) => args.join('/').replace(/\/+/g, '/')),
    documentDir: vi.fn(async () => '/mock/documentDir'),
}));

const DeleteErrorInspector = () => {
    const {currentError, errorLogEntries, isErrorModalOpen} = useMessage();

    return (
        <div>
            <div data-testid="current-error-message">{currentError?.userMessage ?? ''}</div>
            <div data-testid="current-error-source">{currentError?.source ?? ''}</div>
            <div data-testid="error-log-count">{String(errorLogEntries.length)}</div>
            <div data-testid="latest-error-message">{errorLogEntries[0]?.userMessage ?? ''}</div>
            <div data-testid="modal-open">{String(isErrorModalOpen)}</div>
        </div>
    );
};

const TestWrapper = ({childPath = testFileName}: {childPath?: string}) => {
    const [delFilePath, setDelFilePath] = useState<string | null>(null);

    return (
        <TransferLogProvider>
            <MessageProvider>
                <DeleteFile childPath={childPath} delFilePath={delFilePath} setDelFilePath={setDelFilePath} disabled={false} />
                <ErrorModal />
                <DeleteErrorInspector />
            </MessageProvider>
        </TransferLogProvider>
    );
};

async function openDeleteDialog() {
    const trigger = await screen.findByTestId('delete-trigger');

    fireEvent.click(trigger);

    await waitFor(() => {
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    await screen.findByRole('dialog');
    await screen.findByRole('button', {name: 'Slett'});
}

async function clickDelete() {
    fireEvent.click(await screen.findByRole('button', {name: 'Slett'}));
}

async function findSharedErrorDialog() {
    return await screen.findByRole('dialog');
}

describe('DeleteFile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetErrorLogEntries.mockResolvedValue([]);
        mockSetErrorLogEntries.mockResolvedValue();
        mockRemove.mockResolvedValue(undefined);
    });

    it('renders dialog trigger', () => {
        render(<TestWrapper />);
        expect(screen.getByTestId('delete-trigger')).toBeDefined();
    });

    it('shows dialog content on trigger click', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();

        expect(screen.getByText(/Er du sikker/i)).toBeDefined();
        expect(screen.getByRole('button', {name: 'Slett'})).toBeDefined();
        expect(screen.getByRole('button', {name: 'Avbryt'})).toBeDefined();
    });

    it('does not create a shared error when clicking "Avbryt"', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();

        fireEvent.click(screen.getByRole('button', {name: 'Avbryt'}));

        expect(mockRemove).not.toHaveBeenCalled();
        expect(screen.queryByText(/Noe gikk galt/i)).toBeNull();
        expect(screen.getByTestId('error-log-count').textContent).toBe('0');
        expect(screen.getByTestId('modal-open').textContent).toBe('false');
    });

    it('deletes the confirmed file on success', async () => {
        render(<TestWrapper />);
        await openDeleteDialog();
        await clickDelete();

        await waitFor(() => {
            expect(mockRemove).toHaveBeenCalledWith(testFileName);
        });

        expect(screen.queryByText(/Noe gikk galt/i)).toBeNull();
        expect(screen.getByTestId('error-log-count').textContent).toBe('0');
    });

    it('keeps merge cleanup behavior on successful delete', async () => {
        render(<TestWrapper childPath={testFileName} />);
        await openDeleteDialog();
        await clickDelete();

        await waitFor(() => {
            expect(mockRemove).toHaveBeenCalledWith(testFileName);
            expect(mockRemove).toHaveBeenCalledWith('/some/parent/merge/.thumbnails/file1.webp');
            expect(mockRemove).toHaveBeenCalledWith('/some/parent/merge/.previews/file1.webp');
        });
    });

    it('shows a shared error and retains history when confirmed deletion fails', async () => {
        mockRemove.mockRejectedValueOnce(new Error('Tilgang nektet'));

        render(<TestWrapper />);
        await openDeleteDialog();
        await clickDelete();

        const sharedErrorDialog = await findSharedErrorDialog();

        expect(within(sharedErrorDialog).getByText(/Noe gikk galt/i)).toBeDefined();
        expect(within(sharedErrorDialog).getByText(/^Kunne ikke slette bildet\.$/i)).toBeDefined();
        expect(screen.getByTestId('current-error-message').textContent).toBe('Kunne ikke slette bildet.');
        expect(screen.getByTestId('current-error-source').textContent).toBe('backend');
        expect(screen.getByTestId('error-log-count').textContent).toBe('1');
        expect(screen.getByTestId('latest-error-message').textContent).toBe('Kunne ikke slette bildet.');
        expect(screen.getByTestId('modal-open').textContent).toBe('true');
        expect(screen.getByTestId('delete-trigger')).toBeDefined();
        expect(mockCaptureException).toHaveBeenCalledTimes(1);
    });

    it('reveals delete diagnostics only on demand for a confirmed delete failure', async () => {
        mockRemove.mockRejectedValueOnce(new Error('Tilgang nektet'));

        render(<TestWrapper />);

        await openDeleteDialog();
        await clickDelete();

        const firstSharedErrorDialog = await findSharedErrorDialog();

        expect(within(firstSharedErrorDialog).getByText(/Noe gikk galt/i)).toBeDefined();
        expect(within(firstSharedErrorDialog).getByRole('button', {name: /Vis detaljer/i})).toBeDefined();

        expect(within(firstSharedErrorDialog).queryByText(/^Tilgang nektet$/i)).toBeNull();

        fireEvent.click(within(firstSharedErrorDialog).getByRole('button', {name: /Vis detaljer/i}));

        expect(within(firstSharedErrorDialog).getByText(/^Tilgang nektet$/i)).toBeDefined();
        expect(within(firstSharedErrorDialog).getByText(/Stack trace/i)).toBeDefined();
        expect(screen.getByTestId('error-log-count').textContent).toBe('1');
    });

    it('omits the details action when the confirmed delete failure has no normalized diagnostics', async () => {
        mockRemove.mockRejectedValueOnce({message: '   '});

        render(<TestWrapper />);

        await openDeleteDialog();
        await clickDelete();

        const sharedErrorDialog = await findSharedErrorDialog();

        expect(within(sharedErrorDialog).getByText(/Noe gikk galt/i)).toBeDefined();
        expect(within(sharedErrorDialog).queryByRole('button', {name: /Vis detaljer/i})).toBeNull();
        expect(screen.getByTestId('error-log-count').textContent).toBe('1');
    });

    it('treats non-missing optional cleanup failures as delete failures', async () => {
        mockRemove
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error('Kunne ikke slette forhåndsvisning'));

        render(<TestWrapper />);

        await openDeleteDialog();
        await clickDelete();

        const firstSharedErrorDialog = await findSharedErrorDialog();

        expect(within(firstSharedErrorDialog).getByText(/Noe gikk galt/i)).toBeDefined();
        fireEvent.click(within(firstSharedErrorDialog).getByRole('button', {name: /Vis detaljer/i}));
        expect(within(firstSharedErrorDialog).getByText(/^Kunne ikke slette forhåndsvisning$/i)).toBeDefined();
        expect(screen.getByTestId('error-log-count').textContent).toBe('1');
        expect(screen.getByTestId('current-error-message').textContent).toBe('Kunne ikke slette bildet.');
    });
});
