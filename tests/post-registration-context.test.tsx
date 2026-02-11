import { act, renderHook } from '@testing-library/react';
import { usePostRegistration } from '../src/context/post-registration-context.tsx';
import { settings } from '../src/tauri-store/setting-store.ts';
import { uploadToS3 } from '../src/features/registration/upload-to-s3.tsx';
import { MaterialType } from '../src/model/registration-enums.ts';
import { RegistrationFormProps } from '../src/features/registration/registration-form-props.tsx';
import { vi, type Mock } from 'vitest';
import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import {AuthProvider} from '../src/context/auth-context';
import {SecretProvider} from '../src/context/secret-context';
import {SelectionProvider} from '../src/context/selection-context';

const mockHandleError = vi.fn();
const mockClearError = vi.fn();
const mockDisplaySuccessMessage = vi.fn();

vi.mock('@tauri-apps/api/app', () => ({
    getVersion: vi.fn(() => Promise.resolve('1.0.0')),
}));

vi.mock('../src/context/auth-context', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: () => ({ authResponse: {}, loggedOut: false, isLoggingIn: true, fetchSecretsError: '', login: vi.fn(), logout: vi.fn() }),
}));

vi.mock('../src/context/secret-context', () => ({
    SecretProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSecrets: () => ({ secrets: {papiPath: 'https://papi',oidcClientSecret: 'mock', oidcClientId: 'mockId', oidcBaseUrl: 'mock'} }),
    useTransferLog: () => ({
        useSecrets: () => ({}),
    }),
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: vi.fn().mockReturnValue(null),
}));

vi.mock('../src/features/registration/upload-to-s3.tsx', () => ({
    uploadToS3: vi.fn(),
}));

vi.mock('../src/context/trokk-files-context.tsx', () => ({
    useTrokkFiles: () => ({ state: { current: { path: '/some/path' } } }),
}));

vi.mock('../src/context/message-context.tsx', () => ({
    useMessage: () => ({
        handleError: mockHandleError,
        clearError: mockClearError,
        displaySuccessMessage: mockDisplaySuccessMessage,
    }),
}));

vi.mock('../src/context/upload-progress-context.tsx', () => ({
    useUploadProgress: () => ({
        setAllUploadProgress: vi.fn(),
    }),
}));

vi.mock('../src/tauri-store/setting-store.ts', () => ({
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
    });

    it('successfully posts a registration', async () => {
        mockCommonSetup();

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: '123' }),
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
    });

    it('handles upload-error', async () => {
        const error = new Error('upload failed');
        (settings.getAuthResponse as Mock).mockResolvedValue({ userInfo: { name: 'Test User' } });
        (uploadToS3 as Mock).mockRejectedValue(error);

        const { result } = renderHook(() => usePostRegistration(), { wrapper });

        await expect(result.current.postRegistration('TestMachine', registration)).rejects.toThrow('upload failed');
    });

    it('handles different API error statuses correctly', async () => {
        const errorCases = [
            { status: 401, message: 'Not logged in or token expired', statusText: 'Unauthorized' },
            { status: 403, message: 'No access to register this object', statusText: 'Forbidden' },
            { status: 409, message: 'Object already exists', statusText: 'Conflict' },
            { status: 500, message: 'Server error while saving object', statusText: 'Internal Server Error' },
        ];

        for (const { status, message, statusText } of errorCases) {
            mockCommonSetup();

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status,
                statusText,
                json: () => Promise.resolve({ message: statusText }),
            }) as Mock;

            const { result } = renderHook(() => usePostRegistration(), { wrapper });

            await act(async () => {
                await result.current.postRegistration('TestMachine', registration);
            });

            expect(mockHandleError).toHaveBeenCalledWith(expect.stringContaining(message));

            vi.clearAllMocks();
        }
    });
});
