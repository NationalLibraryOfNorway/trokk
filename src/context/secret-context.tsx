import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import * as Sentry from '@sentry/react';
import {SecretVariables} from '../model/secret-variables.ts';
import {getErrorMessage} from '@/lib/utils.ts';

interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    getSecrets: () => Promise<void>;
}

const SecretContext = createContext<SecretContextType | null>(null);

export const SecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets, setSecrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError, setFetchSecretsError] = useState<string | null>(null);
    const [isFetchingSecrets, setIsFetchingSecrets] = useState<boolean>(false);

    const getSecrets = useCallback(async () => {
        setIsFetchingSecrets(true);
        let fetchError: string | undefined;

        Sentry.addBreadcrumb({
            category: 'external.secrets',
            message: 'Secret fetch started',
            level: 'info',
            data: { command: 'get_secret_variables' },
        });
        await invoke<SecretVariables>('get_secret_variables')
            .then((fetchedSecrets) => {
                const safeSecrets = (fetchedSecrets ?? {}) as SecretVariables;
                setSecrets(safeSecrets);
                setFetchSecretsError(null);
            }).catch((error) => {
                console.error(error);
                fetchError = getErrorMessage(error);
                setFetchSecretsError(fetchError);
                throw error;
            })
            .finally(() => {
                setIsFetchingSecrets(false);
                Sentry.captureMessage(
                    `Secret fetch ${fetchError ? 'failed' : 'completed'}`,
                    {
                        level: fetchError ? 'error' : 'info',
                        tags: { category: 'external.secrets' },
                        extra: {
                            command: 'get_secret_variables',
                            ...(fetchError && { error: fetchError }),
                        },
                    },
                );
            });
    }, []);

    useEffect(() => {
        let mounted = true;

        // Run on next tick so tests can render without immediate async state updates.
        Promise.resolve()
            .then(() => (mounted && !secrets && !isFetchingSecrets ? getSecrets() : undefined))
            .catch(() => {
                // getSecrets already sets error state; ignore here.
            });

        return () => {
            mounted = false;
        };
    }, [secrets, isFetchingSecrets, getSecrets]);

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
