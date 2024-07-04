import { beforeEach, describe, expect, test } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import FileTree from '../lib/FileTree.svelte';
import { fileTreeListMock } from './mock-data.mock';
import { writable } from 'svelte/store';
import type { AllTransferProgress } from '../lib/model/transfer-progress';


describe('FileTree.svelte', () => {
    let container: RenderResult<FileTree>;

    beforeEach(() => {
        container = render(FileTree, {
            props: {
                fileTree: fileTreeListMock,
                allUploadProgress: writable<AllTransferProgress>({ dir: {} })
            }
        });
    });

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });
});
