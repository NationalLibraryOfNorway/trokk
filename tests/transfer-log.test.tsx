import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import TransferLog from '../src/features/transfer-log/transfer-log';
import {MessageProvider} from '../src/context/message-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import ErrorModal from '../src/features/error-log/error-modal';
import type {StoredError} from '../src/model/error-log-entry';

const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();
const mockWriteText = vi.fn<(value: string) => Promise<void>>();

vi.mock('../src/context/transfer-log-context', () => ({
    useTransferLog: () => ({
        logs: [
            {
                timestamp: new Date('2026-04-23T08:00:00.000Z'),
                uuid: 'transfer-123',
                pages: 4,
            },
        ],
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

const renderTransferLog = () => {
    render(
        <TransferLogProvider>
            <MessageProvider>
                <ErrorModal />
                <TransferLog />
            </MessageProvider>
        </TransferLogProvider>
    );
};

describe('TransferLog utility error handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetErrorLogEntries.mockResolvedValue([]);
        mockSetErrorLogEntries.mockResolvedValue();
        mockWriteText.mockResolvedValue(undefined);

        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });
    });

    it('shows a shared error and keeps the copied state idle when log-id copy fails', async () => {
        mockWriteText.mockRejectedValueOnce(new Error('Clipboard denied'));

        renderTransferLog();

        const copyCell = screen.getByTitle('Klikk for å kopiere');
        fireEvent.click(copyCell);

        const dialog = await screen.findByRole('dialog');

        expect(within(dialog).getByText(/^Kunne ikke kopiere logg-ID-en\.$/i)).toBeDefined();
        expect(within(dialog).getByText(/Kilde: Frontend/i)).toBeDefined();
        expect(copyCell.getAttribute('data-state')).toBe('idle');
    });
});
