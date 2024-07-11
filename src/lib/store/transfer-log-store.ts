import {type Writable, writable} from 'svelte/store';
import type {TransferLog} from '../model/transfer-log';

export const transferLogs: Writable<TransferLog[]> = writable([]);
