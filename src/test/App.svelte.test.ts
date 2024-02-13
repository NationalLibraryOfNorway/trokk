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

        mockWindows('main', 'Login')
        container = render(App)
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })
})
