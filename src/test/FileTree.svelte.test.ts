import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import FileTree from '../lib/FileTree.svelte';
import { fileTreeListMock } from './mock-data.mock';
import { writable } from 'svelte/store';
import type { AllTransferProgress } from '../lib/model/transfer-progress';


describe('FileTree.svelte', async () => {
    let container: RenderResult<FileTree>;
    const mockAllUploadProgressStore = writable({
        dir: {
            [fileTreeListMock[0].path]: {
                directory: fileTreeListMock[0].path,
                pageNr: 3,
                totalPages: 10
            }
        }
    });

    beforeEach(() => {
        container = render(FileTree, {
            props: {
                fileTree: fileTreeListMock,
                allUploadProgress: mockAllUploadProgressStore
            }
        });
    });

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });

    test('progress is calculated correctly', async () => {
        mockAllUploadProgressStore.update((value: AllTransferProgress) => {
            value.dir[fileTreeListMock[1].path] = {
                directory: fileTreeListMock[1].path,
                pageNr: 5,
                totalPages: 10
            };
            return value;
        });

        await vi.waitUntil(() => {
            try {
                container.getAllByTestId('progress-bar');
            } catch (e) {
                return false;
            }
            return true;
        }, 5000);

        const progressBars = container.getAllByTestId('progress-bar');

        // Files sorted by path, so from fileTreeListMock the order is different
        expect(progressBars[1].textContent).toContain('30%');
        expect(progressBars[0].textContent).toContain('50%');
    });
});
