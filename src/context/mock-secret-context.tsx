import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SecretVariables } from '../model/secret-variables.ts';

interface SecretContextType {
    secrets: SecretVariables | null;
    fetchSecretsError: string | null;
    getSecrets: () => Promise<void>;
}

const MockSecretContext = createContext<SecretContextType | null>(null);

export const MockSecretProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [secrets] = useState<SecretVariables | null>(null);
    const [fetchSecretsError] = useState<string | null>(null);

    const getSecrets = async () => {
    };

    useEffect(() => {
        void getSecrets();
    }, []);

    return (
        <MockSecretContext.Provider value={{ secrets, fetchSecretsError, getSecrets }}>
            {children}
        </MockSecretContext.Provider>
    );
};

export const useMockSecrets = (): SecretContextType => {
    const context = useContext(MockSecretContext);
    if (!context) {
        throw new Error('useSecrets must be used within a SecretProvider');
    }
    return context;
};