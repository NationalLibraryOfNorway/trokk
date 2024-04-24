import { beforeEach, describe, expect, test } from 'vitest';
import { render, type RenderResult } from '@testing-library/svelte';
import FileTree from '../lib/FileTree.svelte';
import { fileTreeListMock } from './mock-data.mock';


describe('FileTree.svelte', () => {
    let container: RenderResult<FileTree>;

    beforeEach(() => {
        container = render(FileTree, { props: { fileTree: fileTreeListMock } });
    });

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });
});
