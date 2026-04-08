import React, {RefObject, useEffect} from 'react';
import {useSelection} from '../context/selection-context.tsx';

export function useAutoFocusOnThumbnail({fileRefs, containerRef, previewDialogOpen}: {
    fileRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    containerRef?: RefObject<HTMLDivElement>; // now optional
    previewDialogOpen: boolean;
}) {
    const {currentIndex} = useSelection();

    useEffect(() => {
        const currentFileElement = fileRefs.current[currentIndex];
        const container = containerRef?.current ?? document.documentElement;
        if (!previewDialogOpen) {
            if (currentFileElement && container) {
                const containerRect = container.getBoundingClientRect();
                const elementRect = currentFileElement.getBoundingClientRect();

                const isHidden =
                    elementRect.top <= containerRect.top ||
                    elementRect.bottom >= containerRect.bottom;

                if (isHidden) {
                    const scrollTop = container.scrollTop ?? window.scrollY;
                    container.scrollTo({
                        top: scrollTop + (elementRect.top - containerRect.top),
                        behavior: 'auto',
                    });
                }
            }
        }

        requestAnimationFrame(() => {
            currentFileElement?.focus();
        });
    }, [currentIndex, previewDialogOpen]);
}
