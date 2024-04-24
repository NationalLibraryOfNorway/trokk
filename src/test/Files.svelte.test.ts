import { beforeEach, describe, expect, test } from 'vitest';
import { render, type RenderResult, screen, waitFor } from '@testing-library/svelte';
import Files from '../lib/Files.svelte';
import { mockIPC } from '@tauri-apps/api/mocks';
import { fileEntryListMock } from './mock-data.mock';
import { awaitNthTicks } from './util/util';


describe('Files.svelte', () => {
    let container: RenderResult<Files>;

    beforeEach(async () => {
        mockIPC((cmd: string, args: Record<string, any>) => {
            switch (cmd) {
            case 'tauri': {
                switch (args.message.cmd) {
                case 'readDir':
                    return Promise.resolve(fileEntryListMock);
                default:
                    return '';
                }
            }
            default:
                return '';
            }
        });
        container = render(Files, { props: { scannerPath: 'path' } });
        // Wait for the component to mount
        await waitFor(async () => {
            // Even with waitFor, we need to await many ticks to avoid 'left-pane' not being found
            await awaitNthTicks(50);
            expect(screen.getByTestId('left-pane')).toBeTruthy();
        });
    });

    test('component mounts', async () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });
});
