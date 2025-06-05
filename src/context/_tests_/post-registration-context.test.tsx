import { act, renderHook } from '@testing-library/react';
import { usePostRegistration } from '../post-registration-context.tsx';
import { settings } from '../../tauri-store/setting-store.ts';
import { uploadToS3 } from '../../features/registration/upload-to-s3.tsx';
import { invoke } from '@tauri-apps/api/core';
import { MaterialType } from '../../model/registration-enums.ts';
import { AuthContextType } from '../auth-context.tsx';
import { RegistrationFormProps } from '../../features/registration/registration-form-props.tsx';

jest.mock('@tauri-apps/api/app', () => ({
    getVersion: jest.fn(() => Promise.resolve('1.0.0')),
}));
jest.mock('../../features/registration/upload-to-s3.tsx', () => ({
    uploadToS3: jest.fn(),
}));
jest.mock('../trokk-files-context.tsx', () => ({
    useTrokkFiles: () => ({ state: { current: { path: '/some/path' } } })
}));
jest.mock('../message-context.tsx', () => ({
    useMessage: () => ({
        handleError: mockHandleError,
        clearError: mockClearError,
        displaySuccessMessage: mockDisplaySuccessMessage
    })
}));
jest.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: jest.fn().mockReturnValue(null),
}));
jest.mock('../upload-progress-context.tsx', () => ({
    useUploadProgress: () => ({
        setAllUploadProgress: jest.fn()
    })
}));
jest.mock('../../tauri-store/setting-store.ts', () => ({
    settings: {
        getAuthResponse: jest.fn()
    }
}));
jest.mock('@tauri-apps/api/core', () => ({
    invoke: jest.fn()
}));

const mockHandleError = jest.fn();
const mockClearError = jest.fn();
const mockDisplaySuccessMessage = jest.fn();

const registration: RegistrationFormProps = {
    materialType: MaterialType.PERIODICAL,
    font: 'ANTIQUA',
    language: 'NOB',
    workingTitle: 'Test Title'
};

const auth: AuthContextType = {
    loggedOut: false,
    authResponse: null,
    isLoggingIn: false,
    fetchSecretsError: null,
    login: async () => {},
    logout: async () => {}
};

const mockCommonSetup = () => {
    (settings.getAuthResponse as jest.Mock).mockResolvedValue({ userInfo: { name: 'Test User' } });
    (uploadToS3 as jest.Mock).mockResolvedValue(3);
    (invoke as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd === 'get_papi_access_token') return Promise.resolve('access-token');
        if (cmd === 'delete_dir') return Promise.resolve();
    });
};


describe('usePostRegistration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('successfully posts a registration', async () => {
        mockCommonSetup();

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ id: '123' })
        }) as jest.Mock;

        const { result } = renderHook(() => usePostRegistration());

        await act(async () => {
            await result.current.postRegistration(
                'TestMachine',
                registration,
                'https://papi',
                '123',
                auth
            );
        });

        expect(uploadToS3).toHaveBeenCalled();
        expect(invoke).toHaveBeenCalledWith('get_papi_access_token');
        expect(fetch).toHaveBeenCalledWith('https://papi/v2/item', expect.any(Object));
    });

    it('handles not logged in', async () => {
        (settings.getAuthResponse as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() => usePostRegistration());

        await expect(
            result.current.postRegistration(
                'TestMachine',
                registration,
                'https://papi',
                '123',
                { loggedOut: false } as AuthContextType
            )
        ).rejects.toEqual('Not logged in');
    });

    it('handles upload-error', async () => {
        const error = new Error('upload failed');
        (settings.getAuthResponse as jest.Mock).mockResolvedValue({
            userInfo: { name: 'Test User' }
        });
        (uploadToS3 as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => usePostRegistration());

        await expect(
            result.current.postRegistration(
                'TestMachine',
                registration,
                'https://papi',
                '123',
                auth
            )
        ).rejects.toThrow('upload failed');
    });

    it('handles different API error statuses correctly', async () => {
        const errorCases = [
            { status: 401, message: 'Du er ikke logget inn eller tilgangstokenet er utløpt', statusText: 'Unauthorized' },
            { status: 403, message: 'Du har ikke tilgang til å registrere dette objektet', statusText: 'Forbidden' },
            { status: 409, message: 'Objektet finnes allerede i databasen', statusText: 'Conflict' },
            { status: 500, message: 'Serverfeil ved lagring av objektet', statusText: 'Internal Server Error' },
        ];

        for (const { status, message, statusText } of errorCases) {
            mockCommonSetup();

            global.fetch = jest.fn().mockResolvedValue({
                ok: false,
                status,
                statusText,
                json: () => Promise.resolve({ message: statusText }),
            }) as jest.Mock;

            const { result } = renderHook(() => usePostRegistration());

            await act(async () => {
                await result.current.postRegistration(
                    'TestMachine',
                    registration,
                    'https://papi',
                    '123',
                    auth
                );
            });

            expect(mockHandleError).toHaveBeenCalledWith(
                expect.stringContaining(message),
                status
            );

            jest.clearAllMocks();
        }
    });
});
