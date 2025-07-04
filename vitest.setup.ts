import { vi } from 'vitest';

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        label: 'mock',
        hide: vi.fn(),
        show: vi.fn(),
        listen: vi.fn(() => Promise.resolve(() => {})),
    }),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: () => ({
        label: 'mockWebview',
        listen: vi.fn(() => Promise.resolve(() => {})),
    }),
}));

vi.mock('@tauri-apps/api/path', () => ({
    documentDir: async () => '/mocked/document/dir',
}));

class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

global.ResizeObserver = ResizeObserver;