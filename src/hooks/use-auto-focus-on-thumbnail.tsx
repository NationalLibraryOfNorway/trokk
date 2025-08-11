import React, {RefObject, useEffect} from 'react';
import {useSelection} from '../context/selection-context.tsx';
import {useTrokkFiles} from '../context/trokk-files-context.tsx';

export function useAutoFocusOnFile({
    fileRefs,
    containerRef
} : { fileRefs: React.MutableRefObject<(HTMLDivElement | null)[]>, containerRef: RefObject<HTMLDivElement>}) {

    const {currentIndex} = useSelection();
    const {state} = useTrokkFiles();

    useEffect(() => {
        if (state.preview) return;
        const currentFileElement = fileRefs.current[currentIndex];
        const container = containerRef.current;

        if (currentFileElement && container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = currentFileElement.getBoundingClientRect();

            const isFullyVisible =
                elementRect.top >= containerRect.top &&
                elementRect.bottom <= containerRect.bottom;

            if (!isFullyVisible) {
                container.scrollTo({
                    top: container.scrollTop + (elementRect.top - containerRect.top - 20),
                    behavior: 'auto',
                });
            }
            requestAnimationFrame(() => {
                currentFileElement?.focus();
            });
        }
    }, [currentIndex, state.preview]);
}
