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
    const {handleError, handleBackendError} = useMessage();

    return (
        <div>
            <button onClick={() => handleError('Frontend-feil uten detaljer')}>Trigger Frontend Error</button>
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

    it('does not show a details action when no advanced diagnostics exist', async () => {
        renderErrorModal();

        fireEvent.click(screen.getByText('Trigger Frontend Error'));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
        });

        expect(screen.queryByRole('button', {name: /Vis detaljer/i})).toBeNull();
    });
});
