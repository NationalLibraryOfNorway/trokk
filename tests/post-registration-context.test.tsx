import { act, renderHook } from '@testing-library/react';
import {deleteDirFromProgressState, usePostRegistration} from '../src/context/post-registration-context';
import { settings } from '../src/tauri-store/setting-store';
import { uploadToS3 } from '../src/features/registration/upload-to-s3';
import { MaterialType } from '../src/model/registration-enums';
import { RegistrationFormProps } from '../src/features/registration/registration-form-props';
import { vi, type Mock } from 'vitest';
import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import {AuthProvider} from '../src/context/auth-context';
import {SecretProvider} from '../src/context/secret-context';
import {SelectionProvider} from '../src/context/selection-context';
import { groupFilesByCheckedItems } from '../src/context/post-registration-context';
import { TransferProgress } from '@/model/transfer-progress';

const mockHandleError = vi.fn();
const mockHandleBackendError = vi.fn();
const mockClearError = vi.fn();
const mockDisplaySuccessMessage = vi.fn();
const mockTrokkDispatch = vi.fn();
let mockUploadVersionBlocking = false;

vi.mock('@tauri-apps/api/app', () => ({
    getVersion: vi.fn(() => Promise.resolve('1.0.0')),
}));

vi.mock('../src/context/auth-context', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: () => ({ authResponse: {}, loggedOut: false, isLoggingIn: true, fetchSecretsError: '', login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../src/context/secret-context', () => ({
    SecretProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSecrets: () => ({
        secrets: {papiPath: 'https://papi',oidcClientSecret: 'mock', oidcClientId: 'mockId', oidcBaseUrl: 'mock'}
    }),
    useTransferLog: () => ({
        useSecrets: () => ({}),
    }),
}));

vi.mock('../src/context/version-context', () => ({
    useVersion: () => ({
        uploadVersionBlocking: mockUploadVersionBlocking
    }),
    VersionProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: vi.fn().mockReturnValue(null),
}));

vi.mock('../src/features/registration/upload-to-s3', () => ({
    uploadToS3: vi.fn(),
}));

vi.mock('../src/context/trokk-files-context', () => ({
    useTrokkFiles: () => ({
        state: { current: { path: '/some/path' } },
        dispatch: mockTrokkDispatch,
    }),
}));

vi.mock('../src/context/message-context', () => ({
    useMessage: () => ({
        handleError: mockHandleError,
        handleBackendError: mockHandleBackendError,
        clearError: mockClearError,
        displaySuccessMessage: mockDisplaySuccessMessage,
    }),
}));

vi.mock('../src/context/upload-progress-context', () => ({
    useUploadProgress: () => ({
        setAllUploadProgress: vi.fn(),
    }),
}));

vi.mock('../src/tauri-store/setting-store', () => ({
    settings: {
        getAuthResponse: vi.fn(),
    },
}));


vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn((url: string, init?: RequestInit) => {
        const typedFetch = global.fetch as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
        return typedFetch(url, init);
    }),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    remove: vi.fn(),
}));

const progressItem = {} as TransferProgress;

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
        <SecretProvider>
            <SelectionProvider>
                {children}
            </SelectionProvider>
        </SecretProvider>
    </AuthProvider>
);

const registration: RegistrationFormProps = {
    materialType: MaterialType.PERIODICAL,
    font: 'ANTIQUA',
    language: 'NOB',
    workingTitle: 'Test Title',
};

const mockCommonSetup = () => {
    (settings.getAuthResponse as Mock).mockResolvedValue({ userInfo: { name: 'Test User' } });
    (uploadToS3 as Mock).mockResolvedValue(3);
    (invoke as Mock).mockImplementation((cmd: string) => {
        switch (cmd) {
            case 'get_papi_access_token':
                return Promise.resolve('access-token');
            case 'delete_dir':
                return Promise.resolve();
            case 'get_secret_variables':
                return Promise.resolve({});
            default:
                return Promise.resolve();
        }
    });
};

describe('usePostRegistration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUploadVersionBlocking = false;
    });

    it('successfully posts a registration', async () => {
        mockCommonSetup();

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve([{ id: '123' }]),
        }) as Mock;

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await act(async () => {
            await result.current.postRegistration('TestMachine', registration);
        });

        expect(uploadToS3).toHaveBeenCalled();
        expect(invoke).toHaveBeenCalledWith('get_papi_access_token');
        expect(fetch).toHaveBeenCalledWith('https://papi/v2/item/batch', expect.any(Object));
    });

    it('handles not logged in', async () => {
        (settings.getAuthResponse as Mock).mockResolvedValue(null);

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await expect(result.current.postRegistration('TestMachine', registration)).rejects.toEqual('Not logged in');
        expect(mockHandleError).toHaveBeenCalledWith(expect.stringContaining('Du må logge inn'));
    });

    it('handles upload-error', async () => {
        const error = new Error('upload failed');
        (settings.getAuthResponse as Mock).mockResolvedValue({ userInfo: { name: 'Test User' } });
        (uploadToS3 as Mock).mockRejectedValue(error);

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await expect(result.current.postRegistration('TestMachine', registration)).rejects.toThrow('upload failed');
    });

    it('blocks posting when version is blocking', async () => {
        mockUploadVersionBlocking = true;

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await expect(result.current.postRegistration('TestMachine', registration)).rejects.toEqual('Version blocked');
        expect(uploadToS3).not.toHaveBeenCalled();
        expect(mockHandleError).toHaveBeenCalledWith(
            expect.stringContaining('Ny versjon kreves før opplasting')
        );
    });

    it('handles different API error statuses correctly', async () => {
        const errorCases = [
            {
                status: 401,
                message: 'Kunne ikke lagre objektet fordi innloggingen ikke lenger er gyldig.',
                statusText: 'Unauthorized',
            },
            {
                status: 403,
                message: 'Kunne ikke lagre objektet fordi du ikke har tilgang.',
                statusText: 'Forbidden',
            },
            {
                status: 409,
                message: 'Kunne ikke lagre objektet fordi objektet allerede finnes.',
                statusText: 'Conflict',
            },
            {
                status: 500,
                message: 'Kunne ikke lagre objektet på grunn av en serverfeil.',
                statusText: 'Internal Server Error',
            },
        ];

        for (const { status, message, statusText } of errorCases) {
            mockCommonSetup();

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status,
                statusText,
                json: () => Promise.resolve({ message: statusText, status }),
            }) as Mock;

            const { result } = renderHook(() => usePostRegistration(), { wrapper });

            await act(async () => {
                await result.current.postRegistration('TestMachine', registration);
            });

            expect(mockHandleBackendError).toHaveBeenCalledWith(expect.objectContaining({
                message,
                fallbackMessage: 'Kunne ikke lagre objektet.',
                code: status,
                detail: JSON.stringify({ message: statusText, status }),
            }));

            vi.clearAllMocks();
        }
    });

    it('handles access token fetch failure as a backend-aware save error', async () => {
        mockCommonSetup();
        (invoke as Mock).mockImplementation((cmd: string) => {
            if (cmd === 'get_papi_access_token') {
                return Promise.reject(new Error('token expired'));
            }
            return Promise.resolve();
        });

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await act(async () => {
            await result.current.postRegistration('TestMachine', registration);
        });

        expect(uploadToS3).toHaveBeenCalled();
        expect(mockHandleBackendError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.',
            fallbackMessage: 'Kunne ikke lagre objektet i databasen.',
            detail: 'token expired',
        }));
    });

    it('handles network save failure with backend diagnostics', async () => {
        mockCommonSetup();
        global.fetch = vi.fn().mockRejectedValue(new Error('nettverket er nede')) as Mock;

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await act(async () => {
            await result.current.postRegistration('TestMachine', registration);
        });

        expect(mockHandleBackendError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Nettverksfeil ved lagring av objektet.',
            fallbackMessage: 'Kunne ikke lagre objektet.',
            detail: 'nettverket er nede',
        }));
    });

    it('clears a previous save error when a retry succeeds', async () => {
        mockCommonSetup();
        global.fetch = vi.fn()
            .mockRejectedValueOnce(new Error('midlertidig nettverksfeil'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([{ id: '123' }]),
            }) as Mock;

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await act(async () => {
            await result.current.postRegistration('TestMachine', registration);
        });

        expect(mockHandleBackendError).toHaveBeenCalledTimes(1);

        mockHandleBackendError.mockClear();
        mockClearError.mockClear();
        mockDisplaySuccessMessage.mockClear();

        await act(async () => {
            await result.current.postRegistration('TestMachine', registration);
        });

        expect(mockHandleBackendError).not.toHaveBeenCalled();
        expect(mockClearError).toHaveBeenCalledTimes(1);
        expect(mockDisplaySuccessMessage).toHaveBeenCalledTimes(1);
    });

    it('groupFilesByCheckedItems returns a batchMap in correct format', async () => {
        const accessFiles = [
            { path: '/merge/file1.pdf' },
            { path: '/merge/file2.pdf' },
            { path: '/merge/file3.pdf' },
            { path: '/merge/file4.pdf' },
            { path: '/merge/file5.pdf' }
        ] as never;

        const checkedItems = ['/merge/file1.pdf', '/merge/file3.pdf'];
        const batchMap = groupFilesByCheckedItems(accessFiles, checkedItems);

        expect(batchMap.size).toBe(2);
        expect(batchMap).toBeInstanceOf(Map);

        const batches = Array.from(batchMap.values());
        expect(batches[0].primary).toEqual(['/file1.pdf', '/file2.pdf']);
        expect(batches[0].access).toEqual(['/merge/file1.pdf', '/merge/file2.pdf']);
        expect(batches[1].primary.length).toEqual(3);
        expect(batches[1].access.length).toEqual(3);
    });

    it('deletes the parent and merge folder', () => {
        const progress = {
            dir: {
                '/parent/merge': progressItem,
                '/parent': progressItem,
                '/other': progressItem
            }
        };

        const result = deleteDirFromProgressState(progress, '/parent/merge');

        expect(result.dir).toEqual({
            '/other': {}
        });
    });

    it('deletes only the specified folder if not merge', () => {
        const progress = {
            dir: {
                '/parent/merge': progressItem,
                '/parent': progressItem,
                '/other': progressItem
            }
        };

        const result = deleteDirFromProgressState(progress, '/other');

        expect(result.dir).toEqual({
            '/parent/merge': progressItem,
            '/parent': progressItem
        });
    });

    it('does not delete parent if the folder is not a merge folder', () => {
        const progress = {
            dir: {
                '/parent': progressItem,
                '/other': progressItem
            }
        };

        const result = deleteDirFromProgressState(progress, '/other');
        expect(result.dir).toEqual({
            '/parent': progressItem
        });
    });

});
