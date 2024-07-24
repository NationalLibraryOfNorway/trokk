import {type Writable, writable} from 'svelte/store';
import type {TransferLogItem} from '../model/transfer-log-item';

export const transferLogs: Writable<TransferLogItem[]> = writable([]);
