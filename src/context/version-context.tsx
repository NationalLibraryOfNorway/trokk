import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { fetch } from '@tauri-apps/plugin-http';
import { useSecrets } from './secret-context.tsx';

interface PapiVersionContextType {
    papiVersion: string | null;
    fetchPapiVersionError: string | null;
    fetchPapiVersion: () => Promise<void>;
    loadingPapiVersion: boolean;
}

interface PapiApplicationPapiVersion {
    application: string;
    version: string;
}

const PapiVersionContext = createContext<PapiVersionContextType | null>(null);

interface PapiVersionProviderProps {
    children: ReactNode;
}

export const PapiVersionProvider: React.FC<PapiVersionProviderProps> = ({ children }) => {
    const [papiVersion, setPapiPapiVersion] = useState<string | null>(null);
    const [fetchPapiVersionError, setFetchPapiVersionError] = useState<string | null>(null);
    const [loadingPapiVersion, setLoadingPapiVersion] = useState<boolean>(true);
    const secretContext = useSecrets();

    const fetchPapiVersion = async () => {
        setLoadingPapiVersion(true);
        try {
            const response = await fetch(`${secretContext.secrets?.papiPath}/TBD`, {
                method: 'GET'
            })
                .then(async (response) => {
                    if (!response.ok) {
                        setFetchPapiVersionError('Kunne ikke hente versjon');
                        throw new Error('Failed to fetch version');
                    } else {
                        return await response.json() as PapiApplicationPapiVersion;
                    }
                })
                .catch((error) => {
                    console.error('Error fetching version: ', error);
                    throw new Error('Failed to fetch version');
                });

            setPapiPapiVersion(response.version);
            setFetchPapiVersionError(null);
        } catch (error) {
            setFetchPapiVersionError('Failed to fetch version');
            console.error('Error fetching version: ', error);
        } finally {
            setLoadingPapiVersion(false);
        }
    };

    useEffect(() => {
        if (secretContext.secrets) {
            void fetchPapiVersion();
        }
    }, [secretContext.secrets]);

    return (
        <PapiVersionContext.Provider
            value={{
                papiVersion,
                fetchPapiVersionError,
                fetchPapiVersion,
                loadingPapiVersion
            }}>
            {children}
        </PapiVersionContext.Provider>
    );
};

export const usePapiVersion = () => {
    const context = useContext(PapiVersionContext);
    if (!context) {
        throw new Error('usePapiVersion must be used within a PapiVersionProvider');
    }
    return context;
};