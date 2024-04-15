import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import Settings from '../lib/Settings.svelte';
import { settings } from '../lib/util/settings';


describe('Settings.svelte', () => {
    let container: RenderResult<Settings>
    beforeEach(() => {
        vi.spyOn(settings, 'scannerPath', 'get').mockReturnValue(Promise.resolve('/scan'))
        vi.spyOn(settings, 'donePath', 'get').mockReturnValue(Promise.resolve('/done'))
        container = render(Settings)
    })

    test('component mounts', () => {
        expect(container).toBeTruthy()
        expect(container.component).toBeTruthy()
    })
})
