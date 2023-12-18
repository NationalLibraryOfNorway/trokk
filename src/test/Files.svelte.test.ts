import {beforeEach, describe, expect, test} from "vitest";
import {render, type RenderResult} from "@testing-library/svelte";
import Files from "../lib/Files.svelte";
import {mockIPC} from "@tauri-apps/api/mocks";
import {fileEntryListMock} from "./mock-data.mock";


describe('Files.svelte', () => {
    let container: RenderResult<Files>

    beforeEach(() => {
        mockIPC((cmd) => {
            switch (cmd) {
                case 'readDir': return Promise.resolve(fileEntryListMock)
                default: return ''
            }
        })
        container = render(Files, {props: {scannerPath: 'path'}})
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })
})
