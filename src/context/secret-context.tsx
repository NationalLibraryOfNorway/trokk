import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import * as Sentry from '@sentry/react';
import {SecretVariables} from '../model/secret-variables.ts';
import {useVersion} from './version-context.tsx';

interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    getSecrets: () => Promise<void>;
}

const SecretContext = createContext<SecretContextType | null>(null);

const getInvokeErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const invokeError = error as { message?: string; error?: string };
        if (invokeError.message) return invokeError.message;
        if (invokeError.error) return invokeError.error;
    }
    return String(error);
};

export const SecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets, setSecrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError, setFetchSecretsError] = useState<string | null>(null);
    const [isFetchingSecrets, setIsFetchingSecrets] = useState<boolean>(false);
    const {canFetchStartupSecrets} = useVersion();

    const getSecrets = useCallback(async () => {
        setIsFetchingSecrets(true);
        Sentry.addBreadcrumb({
            category: 'external.secrets',
            message: 'Secret fetch started',
            level: 'info',
            data: {
                command: 'get_secret_variables',
            },
        });
        Sentry.captureMessage('Secret fetch started', 'info');
        await invoke<SecretVariables>('get_secret_variables')
            .then((fetchedSecrets) => {
                const safeSecrets = (fetchedSecrets ?? {}) as SecretVariables;
                setSecrets(safeSecrets);
                setFetchSecretsError(null);
                Sentry.addBreadcrumb({
                    category: 'external.secrets',
                    message: 'Secret fetch completed',
                    level: 'info',
                    data: {
                        command: 'get_secret_variables',
                    },
                });
                Sentry.captureMessage('Secret fetch completed', 'info');
            }).catch((error) => {
                console.error(error);
                setFetchSecretsError(getInvokeErrorMessage(error));
                Sentry.addBreadcrumb({
                    category: 'external.secrets',
                    message: 'Secret fetch failed',
                    level: 'error',
                    data: {
                        command: 'get_secret_variables',
                        error: getInvokeErrorMessage(error),
                    },
                });
                Sentry.captureMessage('Secret fetch failed', 'error');
                throw error;
            })
            .finally(() => setIsFetchingSecrets(false));
    }, []);

    useEffect(() => {
        let mounted = true;

        // Run on next tick so tests can render without immediate async state updates.
        Promise.resolve()
            .then(() => (mounted && canFetchStartupSecrets && !secrets && !isFetchingSecrets ? getSecrets() : undefined))
            .catch(() => {
                // getSecrets already sets error state; ignore here.
            });

        return () => {
            mounted = false;
        };
    }, [canFetchStartupSecrets, secrets, isFetchingSecrets, getSecrets]);

    return (
        <SecretContext.Provider value={{
            secrets,
            fetchSecretsError,
            getSecrets
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
