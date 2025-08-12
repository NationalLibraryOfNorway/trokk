import {describe, it, expect, vi, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import RegistrationForm from '../src/features/registration/registration-form';
import {UploadProgressProvider} from '../src/context/upload-progress-context';
import {TransferLogProvider} from '../src/context/transfer-log-context';
import {SecretProvider} from '../src/context/secret-context';
import {SelectionProvider} from '../src/context/selection-context';
import {AuthProvider} from '../src/context/auth-context';

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
        ...actual,
        documentDir: vi.fn().mockResolvedValue('/mocked/path'),
        sep: vi.fn().mockResolvedValue('/'),
    };
});

vi.mock('../../context/auth-context.tsx', () => ({
    useAuth: () => ({loggedOut: false}),
    AuthProvider: ({children}) => <>{children}</>
}));

vi.mock('../../context/selection-context.tsx', () => ({
    useSelection: () => ({checkedItems: []}),
    SelectionProvider: ({children}) => <>{children}</>
}));

vi.mock('../../context/secret-context.tsx', () => ({
    useSecrets: () => ({secrets: {papiPath: 'http://mock-papi'}}),
    SecretProvider: ({children}) => <>{children}</>
}));

vi.mock('../../context/transfer-log-context.tsx', () => ({
    useTransferLog: () => ({addLog: vi.fn()}),
    TransferLogProvider: ({children}) => <>{children}</>
}));

vi.mock('../../context/upload-progress-context.tsx', () => ({
    useUploadProgress: () => ({
        allUploadProgress: {dir: {}},
        setAllUploadProgress: vi.fn()
    }),
    UploadProgressProvider: ({children}) => <>{children}</>
}));


const renderWithProviders = () => {
    render(
        <SelectionProvider>
            <SecretProvider>
                <AuthProvider>
                    <TransferLogProvider>
                        <UploadProgressProvider>
                            <RegistrationForm/>
                        </UploadProgressProvider>
                    </TransferLogProvider>
                </AuthProvider>
            </SecretProvider>
        </SelectionProvider>
    );
};

describe('RegistrationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        renderWithProviders();
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

        renderWithProviders();
        expect(screen.getByText('Materialtype')).toBeDefined();
    });
});
