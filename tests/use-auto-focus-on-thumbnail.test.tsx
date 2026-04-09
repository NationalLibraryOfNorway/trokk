import React, {createRef, MutableRefObject} from 'react';
import {renderHook} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, type Mock} from 'vitest';

import {useAutoFocusOnThumbnail} from '../src/hooks/use-auto-focus-on-thumbnail';
import * as selectionContext from '../src/context/selection-context';

vi.mock('../src/context/selection-context');

describe('useAutoFocusOnThumbnail', () => {
    let fileRefs: MutableRefObject<(HTMLDivElement | null)[]>;
    let containerRef: React.RefObject<HTMLDivElement>;
    let mockScrollTo: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        fileRefs = {current: []};
        containerRef = createRef<HTMLDivElement>();

        mockScrollTo = vi.fn();
    });

    function setupMocks(currentIndex = 0) {
        vi.mocked(selectionContext.useSelection).mockReturnValue({
            currentIndex,
        } as unknown as ReturnType<typeof selectionContext.useSelection>);
    }

    it('focuses on the current file element on mount when fully visible', async () => {
        setupMocks(0);

        const container = document.createElement('div');
        container.scrollTo = mockScrollTo;

        const fileEl = document.createElement('div');
        fileEl.focus = vi.fn();

        container.getBoundingClientRect = vi.fn(() => ({
            top: 0,
            bottom: 100,
            left: 0,
            right: 100,
            height: 100,
            width: 100,
            x: 0,
            y: 0,
            toJSON: () => {
            },
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
            toJSON: () => {
            },
        }));

        fileRefs.current = [fileEl];
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;

        renderHook(() => useAutoFocusOnThumbnail({fileRefs, containerRef, previewDialogOpen: false}));

        expect(mockScrollTo).not.toHaveBeenCalled();

        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                expect(fileEl.focus).toHaveBeenCalled();
                resolve();
            });
        });
    });


    it('scrolls container if file element is partially out of view', () => {
        setupMocks(0);

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
            toJSON: () => {
            },
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
            toJSON: () => {
            },
        }));

        fileRefs.current = [fileEl];
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;

        renderHook(() => useAutoFocusOnThumbnail({fileRefs, containerRef, previewDialogOpen: false}));

        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
                expect(mockScrollTo).toHaveBeenCalledWith({
                    top: 50 + 90,
                    behavior: 'auto',
                });

                expect(fileEl.focus).toHaveBeenCalled();
                resolve();
            });
        });
    });

    it('does nothing when previewDialogOpen is true', () => {
        setupMocks(0); // previewDialogOpen will be true

        const container = document.createElement('div');
        container.scrollTo = mockScrollTo;

        const fileEl = document.createElement('div');
        fileEl.focus = vi.fn();

        fileRefs.current = [fileEl];
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = container;

        renderHook(() => useAutoFocusOnThumbnail({fileRefs, containerRef, previewDialogOpen: true}));

        expect(mockScrollTo).not.toHaveBeenCalled();
        expect(fileEl.focus).not.toHaveBeenCalled();
    });
});
