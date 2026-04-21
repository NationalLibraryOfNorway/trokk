import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageProvider, useMessage } from '../src/context/message-context';
import { TextItemResponse } from '../src/model/text-input-response';
import { MaterialType, PublicationType } from '../src/model/registration-enums';
import React from 'react';
import { TransferLogProvider } from '../src/context/transfer-log-context';
import type { StoredError } from '../src/model/error-log-entry';

const addLogMock = vi.fn();
const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();

vi.mock('../src/context/transfer-log-context', () => ({
    useTransferLog: () => ({
        addLog: addLogMock,
    }),
    TransferLogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/tauri-store/setting-store.ts', () => ({
    settings: {
        getErrorLogEntries: () => mockGetErrorLogEntries(),
        setErrorLogEntries: (entries: StoredError[]) => mockSetErrorLogEntries(entries),
    },
}));

const renderWithContext = () => {
    render(
        <TransferLogProvider>
            <MessageProvider>
                <TestComponent />
            </MessageProvider>
        </TransferLogProvider>
    );
};

const TestComponent = () => {
    const {
        errorMessage,
        successMessage,
        currentError,
        errorLogEntries,
        isErrorModalOpen,
        handleError,
        handleBackendError,
        clearError,
        dismissErrorModal,
        handleSuccessMessage,
        removeMessages,
        displaySuccessMessage,
    } = useMessage();

    return (
        <div>
            <button onClick={() => handleError('Ekstra info', 404, 'Detaljert feil')}>Trigger Error</button>
            <button
                onClick={() => handleError('Ekstra info fra objekt', 400, '[object Object]')}
            >
                Trigger Objectish Error
            </button>
            <button
                onClick={() =>
                    handleBackendError({
                        message: 'Backend feilet',
                        fallbackMessage: 'Fallback feil',
                        code: 'E-500',
                        detail: 'Backend detalj',
                        stackTrace: 'Stack line 1',
                        logs: ['logg 1', '', '  logg 2  '],
                    })
                }
            >
                Trigger Backend Error
            </button>
            <button
                onClick={() =>
                    handleBackendError({
                        fallbackMessage: 'Fallback uten melding',
                        logs: [],
                    })
                }
            >
                Trigger Fallback Error
            </button>
            <button
                onClick={() =>
                    handleBackendError({
                        message: 'Ny backend-feil',
                        fallbackMessage: 'Ubrukt fallback',
                        code: 409,
                    })
                }
            >
                Trigger Replacement Error
            </button>
            <button onClick={() => handleSuccessMessage('Alt gikk bra!')}>Trigger Success</button>
            <button onClick={removeMessages}>Clear Messages</button>
            <button onClick={clearError}>Clear Error Only</button>
            <button onClick={dismissErrorModal}>Dismiss Modal</button>
            <button
                onClick={() =>
                    displaySuccessMessage(
                        new TextItemResponse(
                            '123',
                            '456',
                            MaterialType.MONOGRAPH,
                            PublicationType.MONOGRAPHIC,
                            { id: '123', tempName: 'TestDokument' },
                            {id: '123' ,numberOfPages: '10'}
                        )
                    )
                }
            >
                Display Success
            </button>
            <div data-testid="error">{errorMessage}</div>
            <div data-testid="success">{successMessage}</div>
            <div data-testid="current-error">{JSON.stringify(currentError)}</div>
            <div data-testid="modal-open">{String(isErrorModalOpen)}</div>
            <div data-testid="error-log-entries">{JSON.stringify(errorLogEntries)}</div>
        </div>
    );
};

describe('MessageProvider (Vitest)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetErrorLogEntries.mockResolvedValue([]);
        mockSetErrorLogEntries.mockResolvedValue();
    });

    it('handles success message and clears error', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Trigger Success'));

        expect(screen.getByTestId('success').textContent).toBe('Alt gikk bra!');
        expect(screen.getByTestId('error').textContent).toBe('');
        expect(screen.getByTestId('current-error').textContent).toBe('null');
    });

    it('stores structured frontend error details while preserving legacy message output', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Error'));

        expect(screen.getByTestId('error').textContent).toContain('Kunne ikke TRØKKE dette videre.');
        expect(screen.getByTestId('error').textContent).toContain('(Feilkode 404)');
        expect(screen.getByTestId('current-error').textContent).toContain('"source":"frontend"');
        expect(screen.getByTestId('current-error').textContent).toContain('"code":404');
        expect(screen.getByTestId('current-error').textContent).toContain('"detail":"Detaljert feil"');
        expect(screen.getByTestId('modal-open').textContent).toBe('true');
        expect(screen.getByTestId('error-log-entries').textContent).toContain('"source":"frontend"');
    });

    it('replaces an active frontend error with a newer backend error and keeps only the latest one', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Error'));
        expect(screen.getByTestId('current-error').textContent).toContain('"source":"frontend"');

        fireEvent.click(screen.getByText('Trigger Backend Error'));

        expect(screen.getByTestId('error').textContent).toBe('Backend feilet (Feilkode E-500)');
        expect(screen.getByTestId('current-error').textContent).toContain('"source":"backend"');
        expect(screen.getByTestId('current-error').textContent).not.toContain('Detaljert feil');
        expect(screen.getByTestId('error-log-entries').textContent).toContain('"source":"backend"');
    });

    it('normalizes non-string frontend detail values without breaking the shared error state', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Objectish Error'));

        expect(screen.getByTestId('error').textContent).toContain('Ekstra info fra objekt');
        expect(screen.getByTestId('current-error').textContent).toContain('"detail":"[object Object]"');
    });

    it('stores structured backend errors and normalizes diagnostics', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Backend Error'));

        expect(screen.getByTestId('error').textContent).toBe('Backend feilet (Feilkode E-500)');
        expect(screen.getByTestId('current-error').textContent).toContain('"source":"backend"');
        expect(screen.getByTestId('current-error').textContent).toContain('"code":"E-500"');
        expect(screen.getByTestId('current-error').textContent).toContain('"detail":"Backend detalj"');
        expect(screen.getByTestId('current-error').textContent).toContain('"stackTrace":"Stack line 1"');
        expect(screen.getByTestId('current-error').textContent).toContain('"logs":["logg 1","logg 2"]');
    });

    it('uses fallback messages and replaces the active structured error with the latest one', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Fallback Error'));
        expect(screen.getByTestId('error').textContent).toBe('Fallback uten melding');
        expect(screen.getByTestId('current-error').textContent).toContain('"userMessage":"Fallback uten melding"');

        fireEvent.click(screen.getByText('Trigger Replacement Error'));
        expect(screen.getByTestId('error').textContent).toBe('Ny backend-feil (Feilkode 409)');
        expect(screen.getByTestId('current-error').textContent).toContain('"userMessage":"Ny backend-feil (Feilkode 409)"');
        expect(screen.getByTestId('current-error').textContent).not.toContain('Fallback uten melding');
    });

    it('clears both messages', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Trigger Backend Error'));
        fireEvent.click(screen.getByText('Clear Messages'));

        expect(screen.getByTestId('success').textContent).toBe('');
        expect(screen.getByTestId('error').textContent).toBe('');
        expect(screen.getByTestId('current-error').textContent).toBe('null');
    });

    it('clears only the active error when clearError is triggered', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Backend Error'));
        fireEvent.click(screen.getByText('Clear Error Only'));

        expect(screen.getByTestId('error').textContent).toBe('');
        expect(screen.getByTestId('current-error').textContent).toBe('null');
        expect(screen.getByTestId('modal-open').textContent).toBe('false');
    });

    it('displays success message from TextItemResponse', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Display Success'));
        expect(screen.getByTestId('success').textContent).toBe('Suksess!');
        expect(screen.getByTestId('current-error').textContent).toBe('null');
    });

    it('dismisses the live modal without deleting the retained error history', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Trigger Backend Error'));
        fireEvent.click(screen.getByText('Dismiss Modal'));

        expect(screen.getByTestId('modal-open').textContent).toBe('false');
        expect(screen.getByTestId('current-error').textContent).toContain('"source":"backend"');
        expect(screen.getByTestId('error-log-entries').textContent).toContain('"source":"backend"');
    });

    it('keeps only the 100 newest retained error log entries', () => {
        renderWithContext();

        for (let index = 0; index < 101; index += 1) {
            fireEvent.click(screen.getByText('Trigger Backend Error'));
        }

        const retainedEntries = JSON.parse(screen.getByTestId('error-log-entries').textContent ?? '[]') as StoredError[];

        expect(retainedEntries).toHaveLength(100);
        expect(mockSetErrorLogEntries).toHaveBeenLastCalledWith(expect.arrayContaining(retainedEntries));
    });
});
