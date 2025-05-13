import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, type WindowOptions } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { settings } from '../tauri-store/setting-store.ts';
import { Event } from '@tauri-apps/api/event';
import { AuthenticationResponse } from '../model/authentication-response.ts';
import { useSecrets } from './secret-context.tsx';

const IS_MOCK_AUTH: boolean =  process.env.USE_MOCK_AUTH == 'true';

export interface AuthContextType {
    authResponse: AuthenticationResponse | null;
    loggedOut: boolean;
    isLoggingIn: boolean;
    fetchSecretsError: string | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    isMockAuth: boolean; 
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

const createMockAuthResponse = (): AuthenticationResponse => {
    const now = new Date().getTime();
    return {
        tokenResponse: {
            accessToken: 'mock-access-token-' + Math.random().toString(36).substring(7),
            refreshToken: 'mock-refresh-token-' + Math.random().toString(36).substring(7),
            refreshExpiresIn:90000,
            expiresIn: now + 3600000,
            tokenType: 'Bearer',
            idToken: 'mock-id-token',
            notBeforePolicy: 1,
            sessionState: 'mock-session-state',
            scope: 'mock-scope'
        },
        expireInfo: {
            expiresAt: now + 3600000,
            refreshExpiresAt: now + 86400000
        },
        userInfo: {
            sub: 'sub-mock',
            name: 'mock-name',
            groups: [],
            preferredUsername: 'preferred-mock-username',
            givenName: 'mock-given-name',
            familyName: 'mock-family-name',
            email: 'mock-email',
        }
    };
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [authResponse, setAuthResponse] = useState<AuthenticationResponse | null>(null);
    const [loggedOut, setLoggedOut] = useState(false);
    const refreshIntervalId = useRef<number | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
    const appWindow = getCurrentWindow();

    const { secrets, getSecrets, fetchSecretsError } = useSecrets();

    useEffect(() => {

        const logInOnSecretChange = async () => {
            try {
                if (await isLoggedIn() && await canRefresh()) {
                    await refreshAccessToken();
                    await setRefreshAccessTokenInterval(null);
                    setAuthResponse(await settings.getAuthResponse());
                } else if (secrets || IS_MOCK_AUTH) {
                    await login();
                }
            } catch (error) {
                console.error('Error logging in: ', error);
            }
        };
        void logInOnSecretChange();
    }, [secrets]);
    const loginWithMock = async () => {
        await new Promise(resolve => setTimeout(resolve,800));

        const mockAuthResponse = createMockAuthResponse();
        setAuthResponse(mockAuthResponse);
        await settings.setAuthResponse(mockAuthResponse);
        await setRefreshAccessTokenInterval(mockAuthResponse);

        setLoggedOut(false);
        setIsLoggingIn(false);
    }

    const loginWithReal = async () => {
        if (IS_MOCK_AUTH) {
            console.warn('Attempted to use real login in mock mode. Skipping...');
            return;
        }
        if (isLoggingIn) return;
        setIsLoggingIn(true);

        if (!secrets?.oidcClientSecret) {
            await getSecrets();
        }
        const port = await invoke<number>('log_in');
        if (secrets && 'oidcBaseUrl' in secrets) {
            try {
                const loginWebView =
                    new WebviewWindow('Login', {
                        url: `${secrets.oidcBaseUrl}/auth?scope=openid&response_type=code&client_id=${secrets.oidcClientId}&redirect_uri=http://localhost:${port}`,
                        title: 'NBAuth innlogging',
                        visible: true,
                        visibleOnAllWorkspaces: true,
                        alwaysOnTop: true,
                        closable: false,
                        focus: true,
                        center: true
                    } as WindowOptions);
                void loginWebView.show();

                await appWindow.once<AuthenticationResponse>('token_exchanged', handleTokenExchangedEvent(loginWebView));
            } catch (e) {
                console.error(e);
            }
        }
    };

    const login = async () => {
        setAuthResponse(null);
        if(isLoggingIn) return;
        setIsLoggingIn(true);

        if(IS_MOCK_AUTH) {
            await loginWithMock();
        }else if(!IS_MOCK_AUTH) {
            await loginWithReal();
        }
    }
    const handleTokenExchangedEvent = (loginWebView: WebviewWindow) => async (event: Event<AuthenticationResponse>) => {
        const authResponse = event.payload as AuthenticationResponse;
        setAuthResponse(authResponse);
        await settings.setAuthResponse(authResponse);
        await setRefreshAccessTokenInterval(authResponse);
        await loginWebView.clearAllBrowsingData(); // Clear cookies to avoid issues with keycloak login not redirecting properly.
        await loginWebView.destroy(); // Use destroy() instead of close() to avoid issue with keycloak login not redirecting properly.
        setLoggedOut(false);
        setIsLoggingIn(false);

        if (await appWindow.isMinimized()) await appWindow.unminimize();
        if (!(await appWindow.isVisible())) await appWindow.show();
    };

    const logout = async () => {
        await settings.setAuthResponse(null);
        setAuthResponse(null);
        setLoggedOut(true);
        setIsLoggingIn(false);
        clearInterval(refreshIntervalId.current as number);
        refreshIntervalId.current = 0;
    };

    const refreshAccessToken = async () => {

        if (IS_MOCK_AUTH) {
            if (await canRefresh() && authResponse) {
                const mockAuthResponse = createMockAuthResponse();
                await settings.setAuthResponse(mockAuthResponse);
                setAuthResponse(mockAuthResponse);
            } else {
                await login();
                throw new Error('Refresh token expired');
            }
        }else {
            const authResponse = await settings.getAuthResponse();
            if(await canRefresh() && authResponse) {
                const res = await invoke<AuthenticationResponse>('refresh_token', {refreshToken: authResponse.tokenResponse.refreshToken});
                await settings.setAuthResponse(res);
            }else {
                await login();
                throw new Error('Refresh token expired');
            }
        }
    }

    const setRefreshAccessTokenInterval = async (authRes: null | AuthenticationResponse) => {
        const authResponse = authRes ?? await settings.getAuthResponse();
        if (!authResponse) throw new Error('Cannot set refresh token interval: User not logged in');

        refreshIntervalId.current = window.setInterval(async () => {
            await refreshAccessToken();
        }, authResponse.tokenResponse.expiresIn * 1000 - 10000);
    };

    const canRefresh = async () => {
        const authResponse = await settings.getAuthResponse();
        if (!authResponse) return false;
        return authResponse.expireInfo.refreshExpiresAt > new Date().getTime();
    };

    const isLoggedIn = async () => {
        const authResponse = await settings.getAuthResponse();
        if (!authResponse) return false;
        return authResponse.expireInfo.expiresAt > new Date().getTime();
    };

    return (
        <AuthContext.Provider value={{ authResponse, loggedOut, isLoggingIn, fetchSecretsError, login, logout, isMockAuth: IS_MOCK_AUTH }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};