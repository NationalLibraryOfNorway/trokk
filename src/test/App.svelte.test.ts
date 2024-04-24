import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest';
import { render, type RenderResult, screen, waitFor } from '@testing-library/svelte';
import App from '../App.svelte';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { authenticationResponseMock, fileEntryListMock, secretVariablesMock } from './mock-data.mock';
import { settings } from '../lib/util/settings';
import { awaitNthTicks } from './util/util';

describe('App.svelte', () => {
    let container: RenderResult<App>;
    let setAuthResponseSpy: MockInstance<[Promise<AuthenticationResponse | null>], void>;

    beforeEach(async () => {
        setAuthResponseSpy = vi
            .spyOn(settings, 'authResponse', 'set')
            .mockReturnValue();
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(
            Promise.resolve(authenticationResponseMock)
        );
        vi.spyOn(settings, 'donePath', 'get').mockReturnValue(
            Promise.resolve('/done')
        );
        vi.spyOn(settings, 'scannerPath', 'get').mockReturnValue(
            Promise.resolve('/scanner')
        );
        vi.useFakeTimers();

        mockIPC((cmd: string, args: Record<string, any>) => {
            switch (cmd) {
                // readDir workaround for split-pane error
                case 'tauri': {
                    switch (args.message.cmd) {
                        case 'readDir':
                            return Promise.resolve(fileEntryListMock);
                        default:
                            return '';
                    }
                }
                case 'get_secret_variables':
                    return Promise.resolve(secretVariablesMock);
                default:
                    return '';
            }
        });

        mockWindows('main', 'Login');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    test('component mounts', async () => {
        await renderAppWithWait();

        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });

    test('should show users name', async () => {
        await renderAppWithWait();

        expect(screen.getByText('usersGivenName')).toBeTruthy();
    });

    test('logout should clear interval for refreshing token, show login, login should be invoked on click', async () => {
        const tauriIpcSpy = vi.spyOn(window, '__TAURI_IPC__');
        expect(vi.getTimerCount()).toBe(0);

        await renderAppWithWait();

        await waitFor(() => expect(screen.getByText('Logg ut')).toBeTruthy());

        expect(vi.getTimerCount()).toBe(1);

        const logoutButton = screen.getByText('Logg ut');
        expect(() => {
            screen.getByText('Logg inn');
        }).toThrow();
        logoutButton.click();

        expect(vi.getTimerCount()).toBe(0);

        await waitFor(() => expect(screen.getByText('Logg inn')).toBeTruthy());
        expect(() => {
            screen.getByText('Logg ut');
        }).toThrow();

        const loginButton = screen.getByText('Logg inn');
        expect(loginButton).toBeTruthy();
        loginButton.click();

        await waitFor(() =>
            expect(tauriIpcSpy).toHaveBeenCalledWith(
                expect.objectContaining({ cmd: 'log_in' })
            )
        );
    });

    async function renderAppWithWait() {
        container = render(App);

        // Await because of split-pane error
        await waitFor(async () => {
            await awaitNthTicks(50);
            expect(container.getByTestId('left-pane')).toBeTruthy();
        });
    }
});
