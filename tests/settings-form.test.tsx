import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import SettingsForm from '../src/features/settings/settings';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {MessageProvider} from '../src/context/message-context';
import type {StoredError} from '../src/model/error-log-entry';

const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();

vi.mock('@/context/setting-context.tsx', () => ({
    useSettings: () => ({
        scannerPath: '/scanner',
        setScannerPathSetting: vi.fn(),
        version: {current: '1.2.3'},
        textSize: 100,
        setTextSize: vi.fn(),
        thumbnailSizeFraction: 8,
        previewSizeFraction: 4,
        workspacePaneSizes: [22, 48, 30],
        setThumbnailSizeFraction: vi.fn(),
        setPreviewSizeFraction: vi.fn(),
        setWorkspacePaneSizes: vi.fn(),
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

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    readDir: vi.fn(),
}));

const renderSettingsForm = () => {
    render(
        <TransferLogProvider>
            <MessageProvider>
                <SettingsForm setOpen={vi.fn()} />
            </MessageProvider>
        </TransferLogProvider>
    );
};

describe('SettingsForm error log', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSetErrorLogEntries.mockResolvedValue();
        mockGetErrorLogEntries.mockResolvedValue([
            {
                id: 'old-entry',
                occurredAt: '2026-04-21T10:00:00.000Z',
                userMessage: 'Eldre feil',
                source: 'frontend',
                logs: [],
            },
            {
                id: 'new-entry',
                occurredAt: '2026-04-21T12:00:00.000Z',
                userMessage: 'Nyeste feil',
                source: 'backend',
                detail: 'Detaljer for nyeste feil',
                stackTrace: 'Stacklinje',
                logs: ['logg 1'],
            },
        ] as StoredError[]);
    });

    it('reveals the retained error history from Feilsøking through Se feillogg', async () => {
        renderSettingsForm();

        fireEvent.click(screen.getByRole('button', {name: /Se feillogg/i}));

        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('heading', {name: /Feillogg/i})).toBeDefined();

        const listPanel = within(dialog).getByRole('heading', {name: /Siste feil/i}).closest('div')!;
        const detailHeading = within(dialog).getByRole('heading', {name: /Valgt feil/i});
        const detailPanel = detailHeading.parentElement?.parentElement as HTMLElement;

        await waitFor(() => {
            expect(within(listPanel).getByText(/Nyeste feil/i)).toBeDefined();
            expect(within(listPanel).getByText(/Eldre feil/i)).toBeDefined();
        });

        const logButtons = within(listPanel).getAllByRole('button').filter((button) => {
            return button.textContent?.includes('Nyeste feil') || button.textContent?.includes('Eldre feil');
        });

        expect(logButtons[0].textContent).toContain('Nyeste feil');
        expect(within(detailPanel).getByText(/^Nyeste feil$/i)).toBeDefined();
        expect(within(detailPanel).getByText(/^Detaljer for nyeste feil$/i)).toBeDefined();

        fireEvent.click(within(listPanel).getByRole('button', {name: /Eldre feil/i}));

        expect(within(detailPanel).getByText(/^Eldre feil$/i)).toBeDefined();
        expect(within(detailPanel).getByText(/Ingen avanserte detaljer lagret/i)).toBeDefined();

        fireEvent.click(within(dialog).getByRole('button', {name: /Lukk/i}));
        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    it('shows retained utility failure entries in the troubleshooting log without extra detail affordances', async () => {
        mockGetErrorLogEntries.mockResolvedValue([
            {
                id: 'utility-new',
                occurredAt: '2026-04-23T12:00:00.000Z',
                userMessage: 'Kunne ikke lukke vinduet.',
                source: 'frontend',
                logs: [],
            },
            {
                id: 'utility-old',
                occurredAt: '2026-04-23T10:00:00.000Z',
                userMessage: 'Kunne ikke kopiere mappestien.',
                source: 'frontend',
                logs: [],
            },
        ] as StoredError[]);

        renderSettingsForm();

        fireEvent.click(screen.getByRole('button', {name: /Se feillogg/i}));

        const dialog = await screen.findByRole('dialog');
        const listPanel = within(dialog).getByRole('heading', {name: /Siste feil/i}).closest('div')!;
        const detailHeading = within(dialog).getByRole('heading', {name: /Valgt feil/i});
        const detailPanel = detailHeading.parentElement?.parentElement as HTMLElement;

        await waitFor(() => {
            expect(within(listPanel).getByText(/Kunne ikke lukke vinduet\./i)).toBeDefined();
            expect(within(listPanel).getByText(/Kunne ikke kopiere mappestien\./i)).toBeDefined();
        });

        expect(within(detailPanel).getByText(/^Kunne ikke lukke vinduet\.$/i)).toBeDefined();
        expect(within(detailPanel).getByText(/Ingen avanserte detaljer lagret/i)).toBeDefined();
    });
});
