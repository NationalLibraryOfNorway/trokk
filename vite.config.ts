import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'path'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST;

const cargoToml = fs.readFileSync(path.resolve(__dirname, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
const appVersion = cargoVersionMatch?.[1] ?? '0.0.0';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 1421
            }
            : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ['**/src-tauri/**']
        }
    },
    build: {
        target: 'ES2022'
    }
}));
