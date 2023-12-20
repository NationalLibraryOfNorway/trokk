import {describe, test, expect, beforeEach} from "vitest";
import {render, type RenderResult} from "@testing-library/svelte";
import Settings from "../lib/Settings.svelte";


describe('Settings.svelte', () => {
    let container: RenderResult<Settings>
    beforeEach(() => {
        container = render(Settings, {props: {donePath: '/done', scannerPath: '/scan'}})
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })
})
