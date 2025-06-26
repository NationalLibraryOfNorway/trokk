import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageProvider, useMessage } from '../src/context/message-context';
import { TextItemResponse } from '../src/model/text-input-response';
import { MaterialType, PublicationType } from '../src/model/registration-enums';
import React from 'react';
import { TransferLogProvider } from '../src/context/transfer-log-context';

const addLogMock = vi.fn();

vi.mock('./src/context/transfer-log-context', () => ({
    useTransferLog: () => ({
        addLog: addLogMock,
    }),
    TransferLogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
        handleError,
        handleSuccessMessage,
        removeMessages,
        displaySuccessMessage,
    } = useMessage();

    return (
        <div>
            <button onClick={() => handleError('Ekstra info', 404, 'Detaljert feil')}>Trigger Error</button>
            <button onClick={() => handleSuccessMessage('Alt gikk bra!')}>Trigger Success</button>
            <button onClick={removeMessages}>Clear Messages</button>
            <button
                onClick={() =>
                    displaySuccessMessage(
                        new TextItemResponse(
                            '123',
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
        </div>
    );
};

describe('MessageProvider (Vitest)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('handles error message and clears success', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(screen.getByTestId('error').textContent).toMatch(/Kunne ikke TRØKKE dette videre\. Ekstra info/);
        expect(screen.getByTestId('success').textContent).toBe('');
    });

    it('handles success message and clears error', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Trigger Success'));

        expect(screen.getByTestId('success').textContent).toBe('Alt gikk bra!');
        expect(screen.getByTestId('error').textContent).toBe('');
    });

    it('clears both messages', () => {
        renderWithContext();
        fireEvent.click(screen.getByText('Trigger Success'));
        fireEvent.click(screen.getByText('Clear Messages'));

        expect(screen.getByTestId('success').textContent).toBe('');
        expect(screen.getByTestId('error').textContent).toBe('');
    });

    it('displays success message from TextItemResponse', () => {
        renderWithContext();

        fireEvent.click(screen.getByText('Display Success'));
        expect(screen.getByTestId('success').textContent).toBe('Item "TestDokument" sendt til produksjonsløypen med id 123');
    });
});
