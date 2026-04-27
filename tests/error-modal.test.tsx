import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {MessageProvider, useMessage} from '../src/context/message-context';
import ErrorModal from '../src/features/error-log/error-modal';
import type {StoredError} from '../src/model/error-log-entry';

const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();

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

const Harness = () => {
    const {handleError, handleFrontendError, handleBackendError} = useMessage();

    return (
        <div>
            <button onClick={() => handleError('Frontend-feil uten detaljer')}>Trigger Frontend Error</button>
            <button
                onClick={() =>
                    handleFrontendError({
                        message: 'Kunne ikke kopiere mappestien.',
                        fallbackMessage: 'Kunne ikke kopiere mappestien.',
                        detail: 'Clipboard denied',
                        stackTrace: 'Clipboard stack',
                        logs: ['clipboard log'],
                    })
                }
            >
                Trigger Structured Frontend Error
            </button>
            <button
                onClick={() =>
                    handleBackendError({
                        message: 'Backend-feil med detaljer',
                        fallbackMessage: 'Fallback',
                        code: '500',
                        detail: 'Detaljlinje',
                        stackTrace: 'Stacklinje',
                        logs: ['logg 1'],
                    })
                }
            >
                Trigger Backend Error
            </button>
        </div>
    );
};

const renderErrorModal = () => {
    render(
        <TransferLogProvider>
            <MessageProvider>
                <ErrorModal />
                <Harness />
            </MessageProvider>
        </TransferLogProvider>
    );
};

describe('ErrorModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetErrorLogEntries.mockResolvedValue([]);
        mockSetErrorLogEntries.mockResolvedValue();
    });

    it('opens for a live shared error and can be dismissed explicitly', async () => {
        renderErrorModal();

        fireEvent.click(screen.getByText('Trigger Frontend Error'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
            expect(screen.getByText(/Frontend-feil uten detaljer/i)).toBeDefined();
        });

        fireEvent.click(screen.getByRole('button', {name: /Lukk/i}));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    it('reveals advanced diagnostics only after the user asks for details', async () => {
        renderErrorModal();

        fireEvent.click(screen.getByText('Trigger Backend Error'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
            expect(screen.getByRole('button', {name: /Vis detaljer/i})).toBeDefined();
        });

        expect(screen.queryByText(/Detaljlinje/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: /Vis detaljer/i}));

        expect(screen.getByText(/Detaljlinje/i)).toBeDefined();
        expect(screen.getByText(/Stack trace/i)).toBeDefined();
        expect(screen.getByText(/logg 1/i)).toBeDefined();
    });

    it('shows frontend source metadata and reveals structured frontend diagnostics on demand', async () => {
        renderErrorModal();

        fireEvent.click(screen.getByText('Trigger Structured Frontend Error'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
            expect(screen.getByText(/Kunne ikke kopiere mappestien\./i)).toBeDefined();
            expect(screen.getByText(/Kilde: Frontend/i)).toBeDefined();
        });

        expect(screen.queryByText(/Clipboard denied/i)).toBeNull();

        fireEvent.click(screen.getByRole('button', {name: /Vis detaljer/i}));

        expect(screen.getByText(/Clipboard denied/i)).toBeDefined();
        expect(screen.getByText(/Clipboard stack/i)).toBeDefined();
        expect(screen.getByText(/clipboard log/i)).toBeDefined();
    });

    it('does not show a details action when no advanced diagnostics exist', async () => {
        renderErrorModal();

        fireEvent.click(screen.getByText('Trigger Frontend Error'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
        });

        expect(screen.queryByRole('button', {name: /Vis detaljer/i})).toBeNull();
    });
});
