import { vi } from 'vitest';

vi.mock('@tauri-apps/api/path', () => ({
    documentDir: async () => '/mocked/document/dir',
}));
class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = ResizeObserver;