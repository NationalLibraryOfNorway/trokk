import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import Settings from '../lib/Settings.svelte';
import { settings } from '../lib/util/settings';
import { mockIPC } from '@tauri-apps/api/mocks';


describe('Settings.svelte', () => {
    let container: RenderResult<Settings>;
    beforeEach(async () => {
        mockIPC((cmd: string, args: Record<string, any>) => {
            return '';
        });
    });

    beforeEach(() => {
        vi.spyOn(settings, 'scannerPath', 'get').mockReturnValue(Promise.resolve('/scan'));
        vi.spyOn(settings, 'donePath', 'get').mockReturnValue(Promise.resolve('/done'));
        vi.spyOn(settings, 'useS3', 'get').mockReturnValue(Promise.resolve(false));
        container = render(Settings);
    });

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });
});
