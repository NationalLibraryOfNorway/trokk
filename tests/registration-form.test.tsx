import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { useEffect } from 'react';
import '@testing-library/jest-dom';
import { SelectionProvider, useSelectionContext } from '../context/selection-context';
import RegistrationForm from './../features/registration/registration-form.tsx';
import { SecretProvider } from '../context/secret-context';
import { AuthProvider } from '../context/auth-context';
import { TransferLogProvider } from '../context/transfer-log-context';
import { UploadProgressProvider } from '../context/upload-progress-context';

vi.mock('@tauri-apps/api/path', () => ({
    documentDir: async () => '/mocked/path',
    sep: () => '/',
}));

vi.mock('../context/auth-context', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useAuth: () => ({ user: null, login: vi.fn() }),
}));

vi.mock('../context/secret-context', () => ({
    SecretProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSecrets: () => ({ secret: 'mock-secret' }),
}));

vi.mock('../context/upload-progress-context', () => ({
    UploadProgressProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useUploadProgress: () => ({
        progress: 0,
        setProgress: vi.fn(),
        dir: { '/mock/path': {} },
    }),
}));

vi.mock('../context/transfer-log-context', () => ({
    TransferLogProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useTransferLog: () => ({ logs: [], addLog: vi.fn() }),
}));

function RegistrationFormWrapper({ checkedItems }: { checkedItems: string[] }) {
    return (
        <SecretProvider>
            <AuthProvider>
                <TransferLogProvider>
                    <UploadProgressProvider>
                        <SelectionProvider>
                            <SetSelection checkedItems={checkedItems} />
                            <RegistrationForm />
                        </SelectionProvider>
                    </UploadProgressProvider>
                </TransferLogProvider>
            </AuthProvider>
        </SecretProvider>
    );
}

function SetSelection({ checkedItems }: { checkedItems: string[] }) {
    const { setCheckedItems } = useSelectionContext();

    useEffect(() => {
        setCheckedItems(checkedItems);
    }, [checkedItems]);

    return null;
}

describe('RegistrationForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    it('displays correct count based on selected items', async () => {
        const { rerender } = render(<RegistrationFormWrapper checkedItems={[]} />);
        expect(screen.getByText(/0 forsider valgt/i)).toBeInTheDocument();

        rerender(<RegistrationFormWrapper checkedItems={['id1']} />);
        await waitFor(() =>
            expect(screen.getByText(/1 forside valgt/i)).toBeInTheDocument()
        );

        rerender(<RegistrationFormWrapper checkedItems={['id1', 'id2']} />);
        await waitFor(() =>
            expect(screen.getByText(/2 forsider valgt/i)).toBeInTheDocument()
        );
    });
});
