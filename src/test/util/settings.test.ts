import {describe, expect, test, vi} from 'vitest';
import {settings} from '../../lib/util/settings';
import {authenticationResponseMock} from '../mock-data.mock';

let store: Map<string, string | AuthenticationResponse> = new Map()


vi.mock('tauri-plugin-store-api', () => {
    const Store = vi.fn(() => ({
        set: vi.fn((a, b) => {
            store.set(a, b)
            return new Promise<void>(resolve => resolve())
        }),
        save: vi.fn(() => new Promise<void>(resolve => resolve())),
        get: vi.fn((a) => {
            return new Promise<string | AuthenticationResponse>(resolve => resolve(store.get(a) ?? ''))
        })
    }))
    return { Store }
})

describe('settings', () => {
    test('should set and get done path', async () => {
        settings.donePath = 'done'
        await expect(settings.donePath).resolves.toBe('done')
    })

    test('should set and get scanner path', async () => {
        settings.scannerPath = 'done'
        await expect(settings.scannerPath).resolves.toBe('done')
    })

    test('should set and get auth response', async () => {
        settings.authResponse = authenticationResponseMock
        await expect(settings.authResponse).resolves.toBe(authenticationResponseMock)
    })
})
