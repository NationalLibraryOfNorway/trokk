import {beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import RegistrationForm from '../src/features/registration/registration-form';
import {UploadProgressProvider} from '../src/context/upload-progress-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {SecretProvider} from '../src/context/secret-context';
import {SelectionProvider, useSelection} from '../src/context/selection-context';
import {RotationProvider} from '../src/context/rotation-context';
import {AuthProvider} from '../src/context/auth-context';
import {useEffect} from 'react';
import {MessageProvider} from '../src/context/message-context';

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
        getScannerPath: vi.fn(() => Promise.resolve('/scanner'))
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

vi.mock('@/context/auth-context.tsx', () => ({
    useAuth: () => ({loggedOut: false}),
    AuthProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

const mockPostRegistration = vi.fn();
vi.mock('@/context/post-registration-context.tsx', () => ({
    usePostRegistration: () => ({ postRegistration: mockPostRegistration })
}));

// Don't mock SelectionProvider - use the real one to allow state updates

let mockUploadVersionBlocking = false;
let mockUploadVersionMessage: string | null = null;
const mockCheckUploadVersionGate = vi.fn(async () => false);

vi.mock('@/context/secret-context.tsx', () => ({
    useSecrets: () => ({
        secrets: {papiPath: 'http://mock-papi'}
    }),
    SecretProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

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
        progress: 0,
        setProgress: vi.fn(),
        dir: { '/mock/path': {} },
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
        setCheckedItems(checkedItems);
    }, [checkedItems]);

    return null;
}

describe('RegistrationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
        mockUploadVersionBlocking = false;
        mockUploadVersionMessage = null;
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
        vi.doMock('@/context/trokk-files-context.tsx', () => ({
            useTrokkFiles: () => ({
                state: {
                    current: {
                        path: undefined,
                        name: 'Test File'
                    }
                }
            })
        }));

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
});
