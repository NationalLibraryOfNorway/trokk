import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {RotationProvider, useRotation} from '@/context/rotation-context.tsx';
import {ReactNode} from 'react';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

const {invoke} = await import('@tauri-apps/api/core');

const wrapper = ({children}: {children: ReactNode}) => (
    <RotationProvider>{children}</RotationProvider>
);

describe('RotationContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should initialize with no rotating images', () => {
        const {result} = renderHook(() => useRotation(), {wrapper});
        expect(result.current.isRotating('/test/image.jpg')).toBe(false);
        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);
    });

    it('should set rotating status when rotation starts', () => {
        (invoke as ReturnType<typeof vi.fn>).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 1000))
        );

        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Should immediately set rotating status
        expect(result.current.isRotating('/test/image.jpg')).toBe(true);
        expect(result.current.getImageStatus('/test/image.jpg')).toBe('rotating');
    });

    it('should invoke rotate_image with correct parameters for clockwise rotation', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
            await vi.runAllTimersAsync();
        });

        expect(invoke).toHaveBeenCalledWith('rotate_image', {
            filePath: '/test/image.jpg',
            direction: 'clockwise',
        });
    });

    it('should invoke rotate_image with correct parameters for counterclockwise rotation', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'counterclockwise');
            await vi.runAllTimersAsync();
        });

        expect(invoke).toHaveBeenCalledWith('rotate_image', {
            filePath: '/test/image.jpg',
            direction: 'counterclockwise',
        });
    });

    it('should prevent concurrent rotations on the same image', async () => {
        const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
        let resolveRotation: (() => void) | null = null;
        (invoke as ReturnType<typeof vi.fn>).mockImplementation(() =>
            new Promise(resolve => {
                resolveRotation = resolve as () => void;
            })
        );

        const {result} = renderHook(() => useRotation(), {wrapper});

        // Start first rotation
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(result.current.isRotating('/test/image.jpg')).toBe(true);
        expect(invoke).toHaveBeenCalledTimes(1);

        // Try to start second rotation while first is in progress
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Second rotation should be prevented, not queued
        expect(invoke).toHaveBeenCalledTimes(1);
        expect(consoleDebugSpy).toHaveBeenCalledWith('Rotation already in progress for:', '/test/image.jpg');

        // Resolve first rotation
        await act(async () => {
            resolveRotation?.();
            await vi.runAllTimersAsync();
        });

        // After first completes, we can start a new rotation
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(invoke).toHaveBeenCalledTimes(2);

        consoleDebugSpy.mockRestore();
    });

    it('should handle rotation errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Rotation failed'));

        const {result} = renderHook(() => useRotation(), {wrapper});

        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
            await vi.runAllTimersAsync();
        });

        // Error should be logged
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Status should be cleared after error
        expect(result.current.isRotating('/test/image.jpg')).toBe(false);
        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);

        consoleErrorSpy.mockRestore();
    });

    it('should update cache buster after successful rotation', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        const initialCacheBuster = result.current.getFileCacheBuster('/test/image.jpg');

        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
            vi.advanceTimersByTime(500); // Wait for file operations
            await vi.runAllTimersAsync();
        });

        // Cache buster should be updated to force image reload
        const newCacheBuster = result.current.getFileCacheBuster('/test/image.jpg');
        expect(newCacheBuster).toBeGreaterThan(initialCacheBuster);

        // Status should be cleared
        expect(result.current.isRotating('/test/image.jpg')).toBe(false);
    });

    it('should track multiple rotating images with hasAnyRotating', () => {
        (invoke as ReturnType<typeof vi.fn>).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 1000))
        );

        const {result} = renderHook(() => useRotation(), {wrapper});

        expect(result.current.hasAnyRotating()).toBe(false);

        act(() => {
            result.current.rotateImage('/test/image1.jpg', 'clockwise');
        });

        expect(result.current.hasAnyRotating()).toBe(true);

        act(() => {
            result.current.rotateImage('/test/image2.jpg', 'clockwise');
        });

        expect(result.current.hasAnyRotating()).toBe(true);
        expect(result.current.isRotating('/test/image1.jpg')).toBe(true);
        expect(result.current.isRotating('/test/image2.jpg')).toBe(true);
    });

    it('should invoke rotation for each click separately', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        // First rotation
        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
            await vi.runAllTimersAsync();
        });

        expect(invoke).toHaveBeenCalledTimes(1);
        expect(invoke).toHaveBeenCalledWith('rotate_image', {
            filePath: '/test/image.jpg',
            direction: 'clockwise',
        });

        // Second rotation - backend handles accumulation via EXIF
        await act(async () => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
            await vi.runAllTimersAsync();
        });

        expect(invoke).toHaveBeenCalledTimes(2);
        // Frontend always sends the delta (90°), backend accumulates via EXIF
    });

    it('should track image status correctly throughout rotation lifecycle', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        // Initially no status
        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);

        // Start rotation
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Immediately shows rotating status
        expect(result.current.getImageStatus('/test/image.jpg')).toBe('rotating');

        // Complete rotation
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        // Status should be cleared after rotation completes
        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);
        expect(result.current.isRotating('/test/image.jpg')).toBe(false);
    });
});

