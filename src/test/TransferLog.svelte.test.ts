import {beforeEach, describe, expect, test} from 'vitest';
import TransferLog from '../lib/TransferLog.svelte';
import {render, type RenderResult, waitFor} from '@testing-library/svelte';
import {transferLogs} from '../lib/store/transfer-log-store';
import type {TransferLogItem} from '../lib/model/transfer-log-item';

describe('TransferLog.svelte', async () => {
    let container: RenderResult<TransferLog>;

    beforeEach(() => {
        container = render(TransferLog);
        transferLogs.set([]);
    })

    test('component mounts', () => {
        expect(container).toBeTruthy();
        expect(container.component).toBeTruthy();
    });

    test('should display no messages if store is empty', async () => {
        await waitFor(() => {
            expect(container.queryAllByTestId('transfer-log-message')).toHaveLength(0);
        });
    });

    test('should display messages from store', async () => {
        transferLogs.update((value: TransferLogItem[]) => [
            {
                workingTitle: 'Hello world!',
                pages: 1,
                transferLocation: 'test',
                uuid: 'test',
                timestamp: new Date('2021-01-01T00:00:00Z')
            },
            ...value
        ]);

        await waitFor(() => {
            expect(container.queryAllByTestId('transfer-log-message')).toHaveLength(1);
        });

        const messages = container.getAllByTestId('transfer-log-message');
        expect(messages[0].textContent).toContain('Hello world!');
    });

    test('should display messages in reverse order of store', async () => {
        transferLogs.update((value: TransferLogItem[]) => [
            {
                workingTitle: 'Hello world!',
                pages: 1,
                transferLocation: 'test',
                uuid: 'test',
                timestamp: new Date('2021-01-01T00:00:00Z')
            },
            {
                workingTitle: 'Goodbye world!',
                pages: 1,
                transferLocation: 'test',
                uuid: 'test',
                timestamp: new Date('2021-01-01T00:00:01Z')
            },
            ...value
        ]);

        await waitFor(() => {
            expect(container.queryAllByTestId('transfer-log-message')).toHaveLength(2);
        });

        const messages = container.getAllByTestId('transfer-log-message');
        expect(messages[0].textContent).toContain('Goodbye world!');
        expect(messages[1].textContent).toContain('Hello world!');
    });
});

