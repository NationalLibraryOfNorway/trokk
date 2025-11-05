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

    it('should initialize with no rotations', () => {
        const {result} = renderHook(() => useRotation(), {wrapper});
        expect(result.current.getRotation('/test/image.jpg')).toBe(0);
    });

    it('should update rotation immediately in UI', () => {
        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(result.current.getRotation('/test/image.jpg')).toBe(90);
    });

    it('should debounce multiple rotations', async () => {
        const {result} = renderHook(() => useRotation(), {wrapper});

        // First rotation
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });
        expect(result.current.getRotation('/test/image.jpg')).toBe(90);

        // Second rotation (resets debounce timer)
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });
        expect(result.current.getRotation('/test/image.jpg')).toBe(180);

        // Third rotation (resets debounce timer again)
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(result.current.getRotation('/test/image.jpg')).toBe(270);
        expect(invoke).not.toHaveBeenCalled();

        // Fast forward the debounce timer
        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        // Should only invoke once with the final rotation
        expect(invoke).toHaveBeenCalledTimes(1);
        expect(invoke).toHaveBeenCalledWith('rotate_image', {
            filePath: '/test/image.jpg',
            rotation: 270,
        });
    });

    it('should prevent rotation while one is in progress', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockImplementation(() =>
            new Promise(resolve => setTimeout(resolve, 1000))
        );

        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Fast forward debounce
        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        // Try to rotate again while first rotation is still in progress
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Should still be at 90 degrees since second rotation was prevented
        expect(result.current.getRotation('/test/image.jpg')).toBe(90);
    });

    it('should handle rotation errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Rotation failed'));

        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // Fast forward debounce
        await act(async () => {
            vi.advanceTimersByTime(500);
        });

        // Wait a bit for the promise to reject
        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });

    it('should reset rotation to 0 after successful save', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(result.current.getRotation('/test/image.jpg')).toBe(90);

        // Fast forward debounce (500ms) and all subsequent delays
        await act(async () => {
            vi.advanceTimersByTime(500);
            await Promise.resolve(); // Let invoke complete
            vi.advanceTimersByTime(1100); // File system write (300ms) + reload (700ms)
            await vi.runAllTimersAsync(); // Run any remaining timers
        });

        // After successful rotation, UI rotation should reset to 0 since file is now rotated
        expect(result.current.getRotation('/test/image.jpg')).toBe(0);
    });

    it('should handle counterclockwise rotation', () => {
        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'counterclockwise');
        });

        expect(result.current.getRotation('/test/image.jpg')).toBe(270);
    });

    it('should wrap rotation around 360 degrees', () => {
        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });
        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        // 4 * 90 = 360, should wrap to 0
        expect(result.current.getRotation('/test/image.jpg')).toBe(0);
    });

    it('should track image status correctly', async () => {
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        const {result} = renderHook(() => useRotation(), {wrapper});

        act(() => {
            result.current.rotateImage('/test/image.jpg', 'clockwise');
        });

        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);

        // Fast forward debounce (500ms)
        await act(async () => {
            vi.advanceTimersByTime(500);
            await Promise.resolve(); // Let invoke start
        });

        // Should be rotating or reloading (invoke completes immediately in test)
        const statusAfterInvoke = result.current.getImageStatus('/test/image.jpg');
        expect(['rotating', 'reloading'].includes(statusAfterInvoke as string)).toBe(true);

        // Fast forward all remaining delays
        await act(async () => {
            vi.advanceTimersByTime(1100); // 300ms + 700ms delays
            await vi.runAllTimersAsync(); // Run any remaining timers
        });

        // Status should be cleared after all delays
        expect(result.current.getImageStatus('/test/image.jpg')).toBe(null);
    });
});

