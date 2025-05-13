import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SecretVariables } from '../model/secret-variables.ts';


interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    getSecrets: () => Promise<void>;
}

const getMockSecrets = ():SecretVariables  => {
    if (!process.env.PAPI_PATH || !process.env.OIDC_BASE_URL || !process.env.OIDC_CLIENT_ID || !process.env.OIDC_CLIENT_SECRET) {
        throw new Error('Required environment variables are not set');
    }
    return {
        papiPath: process.env.PAPI_PATH,
        oidcBaseUrl: process.env.OIDC_BASE_URL,
        oidcClientId: process.env.OIDC_CLIENT_ID,
        oidcClientSecret: process.env.OIDC_CLIENT_SECRET,
    };
};
const SecretContext = createContext<SecretContextType | null>(null);

export const SecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets, setSecrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError, setFetchSecretsError] = useState<string | null>(null);

    const getSecrets = async () => {
        console.log("hey")
        if(process.env.USE_MOCK_AUTH === 'true'){
                setSecrets(getMockSecrets);
                setFetchSecretsError(null);
        }else {
            await invoke<SecretVariables>('get_secret_variables')
                .then((fetchedSecrets) => {
                    setSecrets(fetchedSecrets);
                    setFetchSecretsError(null);
                }).catch((error) => {
                    console.error(error);
                    setFetchSecretsError(error.toString());
                    throw new Error('Failed to fetch secrets');
                });
        }
    };

    useEffect(() => {
        const initSecrets = async () => {
            try {
                if(process.env.NODE_ENV === 'development' && process.env.USE_MOCK_AUTH === 'true'){
                    console.log('Using mock secrets from environmental variables')
                    setSecrets(getMockSecrets());
                }
            }catch (error) {
                console.error('Failed to initialize secrets: ', error)
            }
        }
        initSecrets();
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