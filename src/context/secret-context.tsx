import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SecretVariables } from '../model/secret-variables.ts';

interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    getSecrets: () => Promise<void>;
}

const SecretContext = createContext<SecretContextType | null>(null);

export const SecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets, setSecrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError, setFetchSecretsError] = useState<string | null>(null);

    const getSecrets = async () => {
        await invoke<SecretVariables>('get_secret_variables')
            .then((fetchedSecrets) => {
                setSecrets(fetchedSecrets);
                setFetchSecretsError(null);
            }).catch((error) => {
                console.error(error);
                setFetchSecretsError(error.toString());
                throw new Error('Failed to fetch secrets');
            });
    };

    useEffect(() => {
        void getSecrets();
    }, []);

    return (
        <SecretContext.Provider value={{ secrets, fetchSecretsError, getSecrets }}>
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