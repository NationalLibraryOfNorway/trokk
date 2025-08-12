import React, { RefObject, useEffect } from 'react';
import { useSelection } from '../context/selection-context.tsx';
import { useTrokkFiles } from '../context/trokk-files-context.tsx';

export function useAutoFocusOnThumbnail({
                                            fileRefs,
                                            containerRef,
                                        }: {
    fileRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    containerRef?: RefObject<HTMLDivElement>; // now optional
}) {
    const { currentIndex } = useSelection();
    const { state } = useTrokkFiles();

    useEffect(() => {
        if (state.preview) return;

        const currentFileElement = fileRefs.current[currentIndex];
        const container = containerRef?.current || document.documentElement;

        if (!currentFileElement || !container) return;

        const containerRect = container.getBoundingClientRect();
        const elementRect = currentFileElement.getBoundingClientRect();

        const isFullyVisible =
            elementRect.top >= containerRect.top &&
            elementRect.bottom <= containerRect.bottom;

        if (!isFullyVisible) {
            const scrollTop = container.scrollTop ?? window.scrollY;
            container.scrollTo({
                top: scrollTop + (elementRect.top - containerRect.top - 20),
                behavior: 'auto',
            });
        }

        requestAnimationFrame(() => {
            currentFileElement?.focus();
        });
    }, [currentIndex, state.preview]);
}
