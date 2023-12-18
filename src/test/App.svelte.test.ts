import {beforeEach, describe, expect, test, vi} from "vitest";
import {render, type RenderResult} from "@testing-library/svelte";
import App from "../App.svelte";
import {mockIPC, mockWindows} from "@tauri-apps/api/mocks";
import {authenticationResponseMock} from "./mock-data.mock";
import {settings} from "../lib/util/settings";


describe('App.svelte', () => {
    let container: RenderResult<App>

    beforeEach(() => {
        vi.spyOn(settings, 'authResponse', 'get').mockReturnValue(Promise.resolve(authenticationResponseMock))
        vi.spyOn(settings, 'donePath', 'get').mockReturnValue(Promise.resolve('/done'))
        vi.spyOn(settings, 'scannerPath', 'get').mockReturnValue(Promise.resolve('/scanner'))

        mockIPC((cmd) => {
            switch (cmd) {
                case 'get_required_env_variables': return Promise.resolve({papiPath: 'test.papi'})
                case 'refresh_token': return Promise.resolve(authenticationResponseMock)
                case 'log_in': return Promise.resolve(9999)
                default: {
                    console.log(`unknown cmd: ${cmd}`)
                    return ''
                }
            }
        })

        mockWindows('main', 'Login')
        container = render(App)
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })
})
