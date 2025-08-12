import React, {createRef, MutableRefObject} from 'react';
import {renderHook} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import {useAutoFocusOnThumbnail} from '../src/hooks/use-auto-focus-on-thumbnail';
import * as selectionContext from '../src/context/selection-context';
import * as trokkFilesContext from '../src/context/trokk-files-context';

vi.mock('../src/context/selection-context');
vi.mock('../src/context/trokk-files-context');

describe('useAutoFocusOnThumbnail', () => {
    let fileRefs: MutableRefObject<(HTMLDivElement | null)[]>;
    let containerRef: React.RefObject<HTMLDivElement>;
    let mockScrollTo: vi.Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        fileRefs = { current: [] };
        containerRef = createRef<HTMLDivElement>();

        mockScrollTo = vi.fn();
    });

    function setupMocks(currentIndex = 0, preview = false) {
        vi.mocked(selectionContext.useSelection).mockReturnValue({ currentIndex } as any);
        vi.mocked(trokkFilesContext.useTrokkFiles).mockReturnValue({ state: { preview } } as any);
    }

    it('does nothing if state.preview is true', () => {
        setupMocks(0, true);

        fileRefs.current = [document.createElement('div')];
        containerRef.current = document.createElement('div');
        containerRef.current.scrollTo = mockScrollTo;

        renderHook(() => useAutoFocusOnThumbnail({ fileRefs, containerRef }));

        // No scrolling or focusing should happen
        expect(mockScrollTo).not.toHaveBeenCalled();
    });

    it('focuses on current file element if fully visible', () => {
        setupMocks(0, false);

        const container = document.createElement('div');
        container.scrollTo = mockScrollTo;

        const fileEl = document.createElement('div');
        fileEl.focus = vi.fn();

        // Mock dimensions so fileEl is fully visible in container
        container.getBoundingClientRect = vi.fn(() => ({
            top: 0,
            bottom: 100,
            left: 0,
            right: 100,
            height: 100,
            width: 100,
            x: 0,
            y: 0,
            toJSON: () => {},
        }));

        fileEl.getBoundingClientRect = vi.fn(() => ({
            top: 10,
            bottom: 90,
            left: 0,
            right: 100,
            height: 80,
            width: 100,
            x: 0,
            y: 10,
            toJSON: () => {},
        }));

        fileRefs.current = [fileEl];
        containerRef.current = container;

        renderHook(() => useAutoFocusOnThumbnail({ fileRefs, containerRef }));

        // Should NOT scroll because element is fully visible
        expect(mockScrollTo).not.toHaveBeenCalled();

        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                expect(fileEl.focus).toHaveBeenCalled();
                resolve();
            });
        });
    });

    it('scrolls container if file element is partially out of view', () => {
        setupMocks(0, false);

        const container = document.createElement('div');
        container.scrollTop = 50;
        container.scrollTo = mockScrollTo;

        const fileEl = document.createElement('div');
        fileEl.focus = vi.fn();

        // Container visible area top=0, bottom=100
        container.getBoundingClientRect = vi.fn(() => ({
            top: 0,
            bottom: 100,
            left: 0,
            right: 100,
            height: 100,
            width: 100,
            x: 0,
            y: 0,
            toJSON: () => {},
        }));

        // File element partially below container bottom
        fileEl.getBoundingClientRect = vi.fn(() => ({
            top: 90,
            bottom: 130,
            left: 0,
            right: 100,
            height: 40,
            width: 100,
            x: 0,
            y: 90,
            toJSON: () => {},
        }));

        fileRefs.current = [fileEl];
        containerRef.current = container;

        renderHook(() => useAutoFocusOnThumbnail({ fileRefs, containerRef }));

        // It should scroll to new position = scrollTop + (element top - container top - 20)
        expect(mockScrollTo).toHaveBeenCalledWith({
            top: 50 + (90 - 0 - 20),
            behavior: 'auto',
        });

        // Focus should still be called
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                expect(fileEl.focus).toHaveBeenCalled();
                resolve();
            });
        });
    });

    it('does nothing if currentFileElement or container are missing', () => {
        setupMocks(0, false);

        // Missing currentFileElement
        fileRefs.current = [];
        containerRef.current = document.createElement('div');
        containerRef.current.scrollTo = mockScrollTo;

        renderHook(() => useAutoFocusOnThumbnail({ fileRefs, containerRef }));

        expect(mockScrollTo).not.toHaveBeenCalled();

        // Missing container
        fileRefs.current = [document.createElement('div')];
        containerRef.current = null;

        renderHook(() => useAutoFocusOnThumbnail({ fileRefs, containerRef }));

        expect(mockScrollTo).not.toHaveBeenCalled();
    });
});
