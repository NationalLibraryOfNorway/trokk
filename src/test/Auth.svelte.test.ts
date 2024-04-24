import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest';
import { render, type RenderResult, waitFor } from '@testing-library/svelte';
import Auth, { canRefresh, isLoggedIn, refreshAccessToken, setRefreshAccessTokenInterval } from '../lib/Auth.svelte';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { settings } from '../lib/util/settings';
import { authenticationResponseMock, secretVariablesMock } from './mock-data.mock';
import { getAll } from '@tauri-apps/api/window';
import { awaitNthTicks } from './util/util';

describe('Auth.svelte', () => {
    vi.mock('@tauri-apps/api/event');
    beforeEach(() => {
        mockIPC((cmd, args) => {
            switch (cmd) {
                case 'log_in':
                    return Promise.resolve(9999);
                case 'get_secret_variables':
                    return Promise.resolve(secretVariablesMock);
                case 'refresh_token':
                    return Promise.resolve(authenticationResponseMock);
            }
        });
    });

    describe('component', () => {
        let container: RenderResult<Auth>;
        let setAuthResponseSpy: MockInstance<[Promise<AuthenticationResponse | null>], void>;

        beforeEach(async () => {
            setAuthResponseSpy = vi
                .spyOn(settings, 'authResponse', 'set')
                .mockReturnValue();
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
            vi.restoreAllMocks();
        });

        test('component mounts', () => {
            container = render(Auth, {
                props: { authResponse: null, loggedOut: false }
            });
            expect(container).toBeTruthy();
            expect(container.component).toBeTruthy();
        });

        test('login works from launch', async () => {
            mockWindows('main', 'Login');
            let loginWindowMock = getAll().filter((w) => w.label === 'Login')[0];
            const loginWindowCloseSpy = vi.spyOn(loginWindowMock, 'close');
            const getEmptyAuthSpy = vi
                .spyOn(settings, 'authResponse', 'get')
                .mockReturnValue(Promise.resolve(null));
            const tauriIpcSpy = vi.spyOn(window, '__TAURI_IPC__');

            container = render(Auth, {
                props: { authResponse: null, loggedOut: false }
            });

            // Wait for login to be initiated
            await waitFor(async () => {
                // For some reason, we must await many ticks, even when using waitFor
                await awaitNthTicks(50);
                expect(tauriIpcSpy).toHaveBeenCalledWith(
                    expect.objectContaining({ cmd: 'log_in' })
                );
            });

            // Since we cannot trigger the event from the component in tests, we need to call the event handler directly
            container.component
                .handleTokenExchangedEvent(loginWindowMock)
                .call(null, {
                    payload: authenticationResponseMock,
                    event: 'token_exchanged',
                    windowLabel: 'main',
                    id: 0
                });

            await waitFor(() =>
                expect(setAuthResponseSpy).toHaveBeenCalledWith(
                    authenticationResponseMock
                )
            );

            // Expect canRefresh() check and isLoggedIn() check
            expect.soft(getEmptyAuthSpy).toHaveBeenCalledTimes(2);
            // Expect the refresh interval to be set
            expect.soft(vi.getTimerCount()).toBe(1);
            // Expect the login window to be closed
            expect(loginWindowCloseSpy).toHaveBeenCalled();
        });

        test('should use saved login on launch', async () => {
            const getAuthSpy = vi
                .spyOn(settings, 'authResponse', 'get')
                .mockReturnValue(Promise.resolve(authenticationResponseMock));
            const tauriIpcSpy = vi.spyOn(window, '__TAURI_IPC__');
            expect(tauriIpcSpy).not.toHaveBeenCalled();
            expect(vi.getTimerCount()).toBe(0);
            container = render(Auth, {
                props: { authResponse: null, loggedOut: false }
            });

            await waitFor(async () => {
                await awaitNthTicks(50);
                expect(setAuthResponseSpy).toHaveBeenCalledWith(
                    authenticationResponseMock
                );
            });

            // Expect the refresh interval to be set
            expect(vi.getTimerCount()).toBe(1);
            // Expect a refresh token call
            expect(tauriIpcSpy).toHaveBeenCalledWith(
                expect.objectContaining({ cmd: 'refresh_token' })
            );
            // Expect every call to get the authResponse
            expect(getAuthSpy).toHaveBeenCalledTimes(5);
        });
    });

    describe('module', () => {
        beforeEach(() => {
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authenticationResponseMock)
            );
            vi.spyOn(settings, 'authResponse', 'set').mockReturnValue();
        });

        test('refresh should invoke refresh_token', async () => {
            const refreshSpy = vi.spyOn(window, '__TAURI_IPC__');
            expect(refreshSpy).not.toHaveBeenCalled();

            await refreshAccessToken();
            expect(refreshSpy).toHaveBeenCalledWith(
                expect.objectContaining({ cmd: 'refresh_token' })
            );
        });

        test('refresh should save new token', async () => {
            const authResponseSpy = vi.spyOn(settings, 'authResponse', 'set');
            expect(authResponseSpy).not.toHaveBeenCalled();

            await refreshAccessToken();
            expect(authResponseSpy).toHaveBeenCalledWith(authenticationResponseMock);
        });

        test('refresh should throw error if refreshtoken has expired', async () => {
            const authMock = structuredClone(authenticationResponseMock);
            authMock.expireInfo.refreshExpiresAt = 0;
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authMock)
            );

            await expect(refreshAccessToken()).rejects.toThrow(
                new Error('Refresh token expired')
            );
        });

        test('set refresh token should start interval for refresh', async () => {
            vi.useFakeTimers();

            expect(vi.getTimerCount()).toBe(0);
            await setRefreshAccessTokenInterval();
            expect(vi.getTimerCount()).toBe(1);

            vi.useRealTimers();
        });

        test('canRefresh should return true if refresh token is not expired', async () => {
            const authMock = structuredClone(authenticationResponseMock);
            authMock.expireInfo.refreshExpiresAt = new Date().getTime() + 100000;
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authMock)
            );

            expect(await canRefresh()).toBe(true);
        });

        test('canRefresh should return false if refresh token has expired', async () => {
            const authMock = structuredClone(authenticationResponseMock);
            authMock.expireInfo.refreshExpiresAt = 0;
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authMock)
            );

            expect(await canRefresh()).toBe(false);
        });

        test('isLoggedIn should return true if token is not expired', async () => {
            const authMock = structuredClone(authenticationResponseMock);
            authMock.expireInfo.expiresAt = new Date().getTime() + 100000;
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authMock)
            );

            expect(await isLoggedIn()).toBe(true);
        });

        test('isLoggedIn should return false if refresh token has expired', async () => {
            const authMock = structuredClone(authenticationResponseMock);
            authMock.expireInfo.expiresAt = 0;
            vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
                Promise.resolve(authMock)
            );

            expect(await isLoggedIn()).toBe(false);
        });
    });
});
