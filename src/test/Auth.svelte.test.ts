import {beforeEach, describe, expect, test, vi} from "vitest";
import {render, type RenderResult} from "@testing-library/svelte";
import Auth, {
    canRefresh,
    isLoggedIn,
    login,
    refreshAccessToken,
    setRefreshAccessTokenInterval
} from "../lib/Auth.svelte";
import {mockIPC} from "@tauri-apps/api/mocks";
import {settings} from "../lib/util/settings";
import {authenticationResponseMock, envVariablesMock} from "./mock-data.mock";


describe('Auth.svelte', () => {
    vi.mock('@tauri-apps/api/event');
    let container: RenderResult<Auth>

    beforeEach(() => {
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authenticationResponseMock))
        vi.spyOn(settings, 'authResponse', 'set').mockReturnValue()

        mockIPC((cmd, args) => {
            switch (cmd) {
                case 'log_in': return Promise.resolve(9999)
                case 'get_required_env_variables': return Promise.resolve(envVariablesMock)
                case 'refresh_token': return Promise.resolve(authenticationResponseMock)
            }
        })

        container = render(Auth)
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })

    test('login should invoke log_in', async () => {
        const logInSpy = vi.spyOn(window, '__TAURI_IPC__')
        expect(logInSpy).not.toHaveBeenCalled()

        await login()
        expect(logInSpy).toHaveBeenCalledWith(expect.objectContaining({cmd: 'log_in'}))
    })

    test('refresh should invoke refresh_token', async () => {
        const refreshSpy = vi.spyOn(window, '__TAURI_IPC__')
        expect(refreshSpy).not.toHaveBeenCalled()

        await refreshAccessToken()
        expect(refreshSpy).toHaveBeenCalledWith(expect.objectContaining({cmd: 'refresh_token'}))
    })

    test('refresh should save new token', async () => {
        const authResponseSpy = vi.spyOn(settings, 'authResponse', 'set')
        expect(authResponseSpy).not.toHaveBeenCalled()

        await refreshAccessToken()
        expect(authResponseSpy).toHaveBeenCalledWith(authenticationResponseMock)
    })

    test('refresh should throw error if refreshtoken has expired', async () => {
        const authMock = structuredClone(authenticationResponseMock)
        authMock.expireInfo.refreshExpiresAt = 0
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authMock))

        await expect(refreshAccessToken()).rejects.toThrow(new Error('Refresh token expired'))
    })

    test('set refresh token should start interval for refresh', async () => {
        vi.useFakeTimers()

        expect(vi.getTimerCount()).toBe(0)
        await setRefreshAccessTokenInterval()
        expect(vi.getTimerCount()).toBe(1)

        vi.useRealTimers()
    })

    test('canRefresh should return true if refresh token is not expired', async () => {
        const authMock = structuredClone(authenticationResponseMock)
        authMock.expireInfo.refreshExpiresAt = new Date().getTime() + 100000
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authMock))

        expect(await canRefresh()).toBe(true)
    })

    test('canRefresh should return false if refresh token has expired', async () => {
        const authMock = structuredClone(authenticationResponseMock)
        authMock.expireInfo.refreshExpiresAt = 0
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authMock))

        expect(await canRefresh()).toBe(false)
    })

    test('isLoggedIn should return true if token is not expired', async () => {
        const authMock = structuredClone(authenticationResponseMock)
        authMock.expireInfo.expiresAt = new Date().getTime() + 100000
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authMock))

        expect(await isLoggedIn()).toBe(true)
    })

    test('isLoggedIn should return false if refresh token has expired', async () => {
        const authMock = structuredClone(authenticationResponseMock)
        authMock.expireInfo.expiresAt = 0
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authMock))

        expect(await isLoggedIn()).toBe(false)
    })
})
