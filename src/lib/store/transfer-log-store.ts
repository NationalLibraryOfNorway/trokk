import {type Writable, writable} from 'svelte/store';
import type {TransferLogMessage} from '../model/transfer-log-message';

export const transferLogMessages: Writable<TransferLogMessage[]> = writable([]);
