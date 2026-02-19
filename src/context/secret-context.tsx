import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SecretVariables, StartupVersionStatus } from '../model/secret-variables.ts';

interface DesktopVersionGateResponse {
    status: StartupVersionStatus;
    isBlocking: boolean;
    isPatch: boolean;
    message: string | null;
    currentVersion: string;
    latestVersion: string | null;
}

interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    startupVersionMessage: string | null;
    startupVersionStatus: StartupVersionStatus | null;
    autoLoginAllowed: boolean;
    uploadVersionBlocking: boolean;
    uploadVersionMessage: string | null;
    getSecrets: () => Promise<void>;
    checkUploadVersionGate: () => Promise<boolean>;
}

const SecretContext = createContext<SecretContextType | null>(null);

export const SecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets, setSecrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError, setFetchSecretsError] = useState<string | null>(null);
    const [startupVersionMessage, setStartupVersionMessage] = useState<string | null>(null);
    const [startupVersionStatus, setStartupVersionStatus] = useState<StartupVersionStatus | null>(null);
    const [autoLoginAllowed, setAutoLoginAllowed] = useState<boolean>(true);
    const [uploadVersionBlocking, setUploadVersionBlocking] = useState<boolean>(false);
    const [uploadVersionMessage, setUploadVersionMessage] = useState<string | null>(null);

    const getDesktopVersionUri = () => {
        const value = import.meta.env.VITE_PAPI_API_DESKTOP_VERSION_URI as string | undefined;
        return value?.trim() || null;
    };

    const getInvokeErrorMessage = (error: unknown): string => {
        if (typeof error === 'string') return error;
        if (error && typeof error === 'object') {
            const invokeError = error as { message?: string; error?: string };
            if (invokeError.message) return invokeError.message;
            if (invokeError.error) return invokeError.error;
        }
        return String(error);
    };

    const getSecrets = async () => {
        const desktopVersionUri = getDesktopVersionUri();
        await invoke<SecretVariables>('get_secret_variables', { desktopVersionUri })
            .then((fetchedSecrets) => {
                const safeSecrets = (fetchedSecrets ?? {}) as SecretVariables;
                setSecrets(safeSecrets);
                setFetchSecretsError(null);
                setStartupVersionMessage(safeSecrets.startupVersionMessage ?? null);
                setStartupVersionStatus(safeSecrets.startupVersionStatus ?? null);
                setAutoLoginAllowed(safeSecrets.autoLoginAllowed ?? true);
            }).catch((error) => {
                console.error(error);
                setFetchSecretsError(getInvokeErrorMessage(error));
                setStartupVersionMessage(null);
                setStartupVersionStatus(null);
                setAutoLoginAllowed(true);
                throw error;
            });
    };

    const checkUploadVersionGate = async (): Promise<boolean> => {
        const desktopVersionUri = getDesktopVersionUri();
        if (!desktopVersionUri) {
            setUploadVersionBlocking(false);
            setUploadVersionMessage('Mangler konfigurasjon for versjonssjekk.');
            return false;
        }

        return invoke<DesktopVersionGateResponse>('check_desktop_version_gate', { desktopVersionUri })
            .then((response) => {
                const safeResponse = response as DesktopVersionGateResponse;
                const isBlockingStatus =
                    safeResponse.status === 'MAJOR_BLOCKING' || safeResponse.status === 'MINOR_BLOCKING';
                setUploadVersionBlocking(isBlockingStatus);
                setUploadVersionMessage(safeResponse.message ?? null);
                return isBlockingStatus;
            })
            .catch((error) => {
                setUploadVersionBlocking(false);
                setUploadVersionMessage(`Kunne ikke sjekke versjon akkurat nå. ${getInvokeErrorMessage(error)}`);
                return false;
            });
    };

    useEffect(() => {
        let mounted = true;

        // Run on next tick so tests can render without immediate async state updates.
        Promise.resolve()
            .then(() => (mounted ? getSecrets() : undefined))
            .catch(() => {
                // getSecrets already sets error state; ignore here.
            });

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <SecretContext.Provider value={{
            secrets,
            fetchSecretsError,
            startupVersionMessage,
            startupVersionStatus,
            autoLoginAllowed,
            uploadVersionBlocking,
            uploadVersionMessage,
            getSecrets,
            checkUploadVersionGate
        }}>
            {children}
        </SecretContext.Provider>
    );
};

export const useSecrets = (): SecretContextType => {
    const context = useContext(SecretContext);
    if (!context) {
        throw new Error('useSecrets must be used within a SecretProvider');
    }
    return context;
};
