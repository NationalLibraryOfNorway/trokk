import {beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import RegistrationForm from '../src/features/registration/registration-form';
import {UploadProgressProvider} from '../src/context/upload-progress-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {SecretProvider} from '@/context/secret-context.tsx';
import {SelectionProvider, useSelection} from '@/context/selection-context.tsx';
import {RotationProvider} from '../src/context/rotation-context';
import {AuthProvider} from '@/context/auth-context.tsx';
import {useEffect} from 'react';
import {MessageProvider} from '@/context/message-context.tsx';
import ErrorModal from '@/features/error-log/error-modal.tsx';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue({ oidcBaseUrl: 'http://mock-url' }),
}));

const mockStoreData: Record<string, unknown> = {};

type StoreValue = unknown;

vi.mock('@tauri-apps/plugin-store', () => ({
    load: vi.fn().mockResolvedValue({
        get: vi.fn(async (key: string) => (mockStoreData[key] as StoreValue) ?? null),
        set: vi.fn(async (key: string, val: StoreValue) => { mockStoreData[key] = val; }),
        save: vi.fn(async () => {}),
    }),
    Store: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn(() => Promise.resolve({ok: true, json: () => ({id: '123', scanInformation: {tempName: 'Test'}})}))
}));

vi.mock('uuidv7', () => ({
    uuidv7: () => 'mocked-uuid'
}));

vi.mock('@/tauri-store/setting-store.ts', () => ({
    settings: {
        getAuthResponse: vi.fn(() => Promise.resolve({userInfo: {name: 'Test User'}})),
        getScannerPath: vi.fn(() => Promise.resolve('/scanner')),
        getErrorLogEntries: vi.fn(() => Promise.resolve([])),
        setErrorLogEntries: vi.fn(() => Promise.resolve()),
    }
}));

vi.mock('@tauri-apps/api/path', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        actual,
        documentDir: vi.fn().mockResolvedValue('/mocked/path'),
        sep: vi.fn().mockResolvedValue('/'),
    };
});

let mockLoggedOut = false;
let mockIsLoggingIn = false;
let mockCurrentPath: string | undefined = '/mock/path';
const mockSecrets = {papiPath: 'http://mock-papi'};
const mockUploadProgressState = { dir: {} as Record<string, unknown> };
const mockTrokkState: {
    current: {
        path: string;
        name: string;
    } | undefined;
} = {
    current: {
        path: '/mock/path',
        name: 'Test File',
    }
};
const mockLogin = vi.fn();
const mockAuthResponse = {tokenResponse: {accessToken: 'token'}};
vi.mock('@/context/auth-context.tsx', () => ({
    useAuth: () => ({
        loggedOut: mockLoggedOut,
        isLoggingIn: mockIsLoggingIn,
        login: mockLogin,
        authResponse: mockLoggedOut ? null : mockAuthResponse
    }),
    AuthProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

const mockPostRegistration = vi.fn();
vi.mock('@/context/post-registration-context.tsx', () => ({
    usePostRegistration: () => ({ postRegistration: mockPostRegistration })
}));

vi.mock('@/context/trokk-files-context.tsx', () => ({
    useTrokkFiles: () => ({
        state: mockTrokkState,
        dispatch: vi.fn(),
    })
}));

// Don't mock SelectionProvider - use the real one to allow state updates

vi.mock('@/context/secret-context.tsx', () => ({
    useSecrets: () => ({
        secrets: mockSecrets
    }),
    SecretProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

let mockUploadVersionBlocking = false;
let mockUploadVersionMessage: string | null = null;
const mockCheckUploadVersionGate = vi.fn(async () => false);

vi.mock('@/context/version-context.tsx', () => ({
    useVersion: () => ({
        uploadVersionBlocking: mockUploadVersionBlocking,
        uploadVersionMessage: mockUploadVersionMessage,
        checkUploadVersionGate: mockCheckUploadVersionGate
    }),
    VersionProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/context/transfer-log-context.tsx', () => ({
    useTransferLog: () => ({addLog: vi.fn()}),
    TransferLogProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../src/context/upload-progress-context', () => ({
    UploadProgressProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useUploadProgress: () => ({
        allUploadProgress: mockUploadProgressState,
        setAllUploadProgress: vi.fn(),
    }),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: () => ({
        listen: vi.fn(() => Promise.resolve(() => {})),
        once: vi.fn(() => Promise.resolve(() => {})),
    }),
    WebviewWindow: vi.fn(() => ({
        show: vi.fn(),
    })),
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        once: vi.fn(() => Promise.resolve(() => {})),
    }),
}));

vi.mock('../src/context/transfer-log-context', () => ({
    TransferLogProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useTransferLog: () => ({ logs: [], addLog: vi.fn() }),
}));

function RegistrationFormWrapper({ checkedItems }: { checkedItems: string[] }) {
    return (
        <SecretProvider>
            <AuthProvider>
                <TransferLogProvider>
                    <UploadProgressProvider>
                        <MessageProvider>
                            <ErrorModal />
                            <RotationProvider>
                                <SelectionProvider>
                                    <SetSelection checkedItems={checkedItems} />
                                    <RegistrationForm />
                                </SelectionProvider>
                            </RotationProvider>
                        </MessageProvider>
                    </UploadProgressProvider>
                </TransferLogProvider>
            </AuthProvider>
        </SecretProvider>
    );
}

function SetSelection({ checkedItems }: { checkedItems: string[] }) {
    const { setCheckedItems } = useSelection();

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setCheckedItems(checkedItems);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [checkedItems, setCheckedItems]);

    return null;
}

describe('RegistrationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
        mockUploadVersionBlocking = false;
        mockUploadVersionMessage = null;
        mockLoggedOut = false;
        mockIsLoggingIn = false;
        mockCurrentPath = '/mock/path';
        mockTrokkState.current = {
            path: mockCurrentPath,
            name: 'Test File',
        };
        mockPostRegistration.mockReset();
        mockLogin.mockReset();
        mockCheckUploadVersionGate.mockResolvedValue(false);
    });

    it('renders without crashing', async () => {
        render(<RegistrationFormWrapper checkedItems={['id1']}/>);

        await waitFor(() => {
            expect(screen.getByText(/Materialtype/i)).toBeDefined();
            expect(screen.getByText(/Antiqua/i)).toBeDefined();
            expect(screen.getByText(/Fraktur/i)).toBeDefined();
        });
    });

    it('disables submit button when state.current.path is undefined', async () => {
        mockCurrentPath = undefined;
        mockTrokkState.current = undefined;

        render(<RegistrationFormWrapper checkedItems={['id1']} />);
        await waitFor(() => {
            const button = screen.getByRole('button', { name: /TRØKK!/i });
            expect(button.hasAttribute('disabled')).toBe(true);
        });
    });

    it('displays correct count based on selected items', async () => {
        const { rerender } = render(<RegistrationFormWrapper checkedItems={[]} />);
        expect(screen.getByText(/0 forsider valgt/i)).toBeDefined();

        rerender(<RegistrationFormWrapper checkedItems={['id1']} />);
        await waitFor(() =>
            expect(screen.getByText(/1 forside valgt/i)).toBeDefined()
        );

        rerender(<RegistrationFormWrapper checkedItems={['id1', 'id2']} />);
        await waitFor(() =>
            expect(screen.getByText(/2 forsider valgt/i)).toBeDefined()
        );
    });

    it('disables submit button and shows side-panel message when version is blocking', async () => {
        mockUploadVersionBlocking = true;
        mockUploadVersionMessage = 'Ny delversjon er tilgjengelig. Oppdater appen før du kan TRØKKE.';

        render(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            const button = screen.getByRole('button', { name: /TRØKK!/i });
            expect(button.hasAttribute('disabled')).toBe(true);
            expect(screen.getByText(/Oppdater appen før du kan TRØKKE/i)).toBeDefined();
        });
    });

    it('shows a shared blocking error when submitting without selected fronts', async () => {
        render(<RegistrationFormWrapper checkedItems={[]} />);

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeDefined();
            expect(screen.getByText(/Velg forsider før du kan gå videre!/i)).toBeDefined();
        });
        expect(mockPostRegistration).not.toHaveBeenCalled();
        expect(within(screen.getByText(/Materialtype/i).closest('form')!).queryByText(/Velg forsider før du kan gå videre!/i)).toBeNull();
    });

    it('shows a shared blocking error and starts login when submitting while logged out', async () => {
        mockLoggedOut = true;
        mockLogin.mockResolvedValue(undefined);

        render(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            expect(screen.getByText(/1 forside valgt/i)).toBeDefined();
        });

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByText(/Du må logge inn før du kan TRØKKE\. Starter innlogging/i)).toBeDefined();
        });
        expect(mockLogin).toHaveBeenCalledTimes(1);
        expect(mockPostRegistration).not.toHaveBeenCalled();
    });

    it('replaces the login-required message with a more specific shared error when login start fails', async () => {
        mockLoggedOut = true;
        mockLogin.mockRejectedValueOnce(new Error('innlogging feilet'));

        render(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            expect(screen.getByText(/1 forside valgt/i)).toBeDefined();
        });

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByText(/Kunne ikke starte innlogging\./i)).toBeDefined();
        });
        expect(screen.queryByText(/Du må logge inn før du kan TRØKKE\. Starter innlogging/i)).toBeNull();
    });

    it('shows a shared upload-start error when the submit path cannot continue into registration processing', async () => {
        mockPostRegistration.mockRejectedValueOnce(new Error('opplasting feilet'));

        render(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            expect(screen.getByText(/1 forside valgt/i)).toBeDefined();
        });

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByText(/Kunne ikke starte opplasting\./i)).toBeDefined();
        });
    });

    it('clears a previous blocking error when the user corrects selection and retries the flow', async () => {
        const {rerender} = render(<RegistrationFormWrapper checkedItems={[]} />);

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByText(/Velg forsider før du kan gå videre!/i)).toBeDefined();
        });

        rerender(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });

    it('keeps the existing inline version-gate message out of the shared error area', async () => {
        mockUploadVersionMessage = 'Ny delversjon er tilgjengelig. Oppdater appen før du kan TRØKKE.';
        mockCheckUploadVersionGate.mockResolvedValueOnce(true);

        render(<RegistrationFormWrapper checkedItems={['id1']} />);

        await waitFor(() => {
            expect(screen.getByText(/1 forside valgt/i)).toBeDefined();
        });

        fireEvent.click(screen.getByRole('button', { name: /TRØKK!/i }));

        await waitFor(() => {
            expect(screen.getByText(/Oppdater appen før du kan TRØKKE/i)).toBeDefined();
        });
        expect(screen.queryByText(/Kunne ikke TRØKKE dette videre\./i)).toBeNull();
        expect(mockPostRegistration).not.toHaveBeenCalled();
    });

});
