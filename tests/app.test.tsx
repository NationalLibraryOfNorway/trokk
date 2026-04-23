import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import App from '../src/App';
import type {StoredError} from '../src/model/error-log-entry';

const mockGetErrorLogEntries = vi.fn<() => Promise<StoredError[]>>();
const mockSetErrorLogEntries = vi.fn<(entries: StoredError[]) => Promise<void>>();
const mockWriteText = vi.fn<(value: string) => Promise<void>>();
const mockMinimize = vi.fn<() => Promise<void>>();
const mockToggleMaximize = vi.fn<() => Promise<void>>();
const mockClose = vi.fn<() => Promise<void>>();
const mockIsMaximized = vi.fn<() => Promise<boolean>>();
const mockOnResized = vi.fn<() => Promise<() => void>>();

vi.mock('../src/context/auth-context.tsx', () => ({
    useAuth: () => ({
        authResponse: {userInfo: {givenName: 'Testbruker'}},
        loggedOut: false,
        isLoggingIn: false,
        isRefreshingToken: false,
        fetchSecretsError: null,
        login: vi.fn(),
        logout: vi.fn(),
    }),
    AuthProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/secret-context.tsx', () => ({
    useSecrets: () => ({
        getSecrets: vi.fn().mockResolvedValue(undefined),
    }),
    SecretProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/version-context.tsx', () => ({
    useVersion: () => ({
        startupVersionMessage: null,
        startupVersionError: null,
        isCheckingStartupVersion: false,
        isStartupBlocking: false,
        retryStartupVersionCheck: vi.fn().mockResolvedValue(undefined),
        hasCheckedStartupVersion: true,
    }),
    VersionProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/setting-context.tsx', () => ({
    useSettings: () => ({
        scannerPath: '/scanner/path',
    }),
    SettingProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/trokk-files-context.tsx', () => ({
    TrokkFilesProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/selection-context.tsx', () => ({
    SelectionProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/rotation-context.tsx', () => ({
    RotationProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/context/upload-progress-context.tsx', () => ({
    UploadProgressProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));

vi.mock('../src/components/layouts/main-layout.tsx', () => ({
    default: () => <div>Mock Main Layout</div>,
}));

vi.mock('../src/hooks/use-text-size-shortcuts.tsx', () => ({
    useTextSizeShortcuts: vi.fn(),
}));

vi.mock('../src/hooks/use-toolbar-offset', () => ({
    useToolbarOffset: vi.fn(),
}));

vi.mock('../src/tauri-store/setting-store.ts', () => ({
    settings: {
        getErrorLogEntries: () => mockGetErrorLogEntries(),
        setErrorLogEntries: (entries: StoredError[]) => mockSetErrorLogEntries(entries),
    },
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        minimize: mockMinimize,
        toggleMaximize: mockToggleMaximize,
        close: mockClose,
        isMaximized: mockIsMaximized,
        onResized: mockOnResized,
    }),
}));

const renderApp = () => {
    render(<App />);
};

describe('App utility error handling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetErrorLogEntries.mockResolvedValue([]);
        mockSetErrorLogEntries.mockResolvedValue();
        mockWriteText.mockResolvedValue(undefined);
        mockMinimize.mockResolvedValue(undefined);
        mockToggleMaximize.mockResolvedValue(undefined);
        mockClose.mockResolvedValue(undefined);
        mockIsMaximized.mockResolvedValue(false);
        mockOnResized.mockResolvedValue(() => undefined);

        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText,
            },
        });
    });

    it('shows a shared error and no copied tooltip when scanner-path copy fails', async () => {
        mockWriteText.mockRejectedValueOnce(new Error('Clipboard denied'));

        renderApp();

        fireEvent.click(screen.getByTitle('Klikk for å kopiere'));

        const dialog = await screen.findByRole('dialog');

        expect(within(dialog).getByText(/^Kunne ikke kopiere mappestien\.$/i)).toBeDefined();
        expect(within(dialog).getByText(/Kilde: Frontend/i)).toBeDefined();
        expect(screen.queryByText(/Mappesti kopiert til utklippstavle/i)).toBeNull();
    });

    it('replaces the live utility error with the latest failing window-control action', async () => {
        mockMinimize.mockRejectedValueOnce(new Error('Minimize denied'));
        mockToggleMaximize.mockRejectedValueOnce(new Error('Resize denied'));
        mockClose.mockRejectedValueOnce(new Error('Close denied'));

        renderApp();

        fireEvent.click(screen.getByTitle('Minimer'));

        await waitFor(() => {
            expect(screen.getByText(/^Kunne ikke minimere vinduet\.$/i)).toBeDefined();
        });

        fireEvent.click(screen.getByTitle('Maksimer'));

        await waitFor(() => {
            expect(screen.getByText(/^Kunne ikke endre vindusstørrelsen\.$/i)).toBeDefined();
            expect(screen.queryByText(/^Kunne ikke minimere vinduet\.$/i)).toBeNull();
        });

        fireEvent.click(screen.getByTitle('Avslutt'));

        await waitFor(() => {
            expect(screen.getByText(/^Kunne ikke lukke vinduet\.$/i)).toBeDefined();
            expect(screen.queryByText(/^Kunne ikke endre vindusstørrelsen\.$/i)).toBeNull();
        });

        expect(screen.getByText('Mock Main Layout')).toBeDefined();
    });
});
