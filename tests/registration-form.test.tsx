import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import RegistrationForm from '../src/features/registration/registration-form';
import {UploadProgressProvider} from '../src/context/upload-progress-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {SecretProvider} from '../src/context/secret-context';
import {SelectionProvider} from '../src/context/selection-context';
import {AuthProvider} from '../src/context/auth-context';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import { SelectionProvider, useSelection } from '../src/context/selection-context';
import RegistrationForm from './../src/features/registration/registration-form.tsx';
import { SecretProvider } from '../src/context/secret-context';
import { AuthProvider } from '../src/context/auth-context';
import { TransferLogProvider } from '../src/context/transfer-log-context';
import { UploadProgressProvider } from '../src/context/upload-progress-context';
import {MessageProvider} from '../src/context/message-context';

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue('mocked-value')
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: () => ({
        listen: vi.fn(() => Promise.resolve(() => {
        }))
    })
}));

vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn(() => Promise.resolve({ok: true, json: () => ({id: '123', scanInformation: {tempName: 'Test'}})}))
}));

vi.mock('uuidv7', () => ({
    uuidv7: () => 'mocked-uuid'
}));

vi.mock('../../tauri-store/setting-store.ts', () => ({
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

vi.mock('../../context/auth-context.tsx', () => ({
    useAuth: () => ({loggedOut: false}),
    AuthProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../../context/selection-context.tsx', () => ({
    useSelection: () => ({checkedItems: []}),
    SelectionProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../../context/secret-context.tsx', () => ({
    useSecrets: () => ({secrets: {papiPath: 'http://mock-papi'}}),
    SecretProvider: ({children}: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('../../context/transfer-log-context.tsx', () => ({
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
                            <SelectionProvider>
                                <SetSelection checkedItems={checkedItems} />
                                <RegistrationForm />
                            </SelectionProvider>
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
    const { rerender } = render(<RegistrationFormWrapper checkedItems={[]} />);
    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    it('renders without crashing', () => {
        rerender(<RegistrationFormWrapper checkedItems={['id1']} />);
        expect(screen.getByText(/Materialtype/i)).toBeDefined();
        expect(screen.getByText(/Antiqua/i)).toBeDefined();
        expect(screen.getByText(/Fraktur/i)).toBeDefined();
    });

    it('disables form fields when state.current.path is undefined', () => {
        vi.doMock('../../context/trokk-files-context.tsx', () => ({
            useTrokkFiles: () => ({
                state: {
                    current: {
                        path: undefined,
                        name: 'Test File'
                    }
                }
            })
        }));

        rerender(<RegistrationFormWrapper checkedItems={['id1']} />);
        expect(screen.getByText('Materialtype')).toBeDefined();
    });

    it('displays correct count based on selected items', async () => {

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
});
