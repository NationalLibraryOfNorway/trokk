import React, {useLayoutEffect} from 'react';

/**
 * A hook that sets a CSS variable (--toolbar-h) on the root element
 * to the height of the referenced toolbar element. This can be used
 * to offset content below a certain element.
 * @param ref
 * usage:
 * const toolbarRef = useRef<HTMLElement>(null);
 * useToolbarOffset(toolbarRef);
 * return <div ref={toolbarRef}>...</div>;
 */
export function useToolbarOffset(ref: React.RefObject<HTMLElement>) {
    useLayoutEffect(() => {
        const root = document.documentElement;
        let resizeObserver: ResizeObserver | null = null;
        let raf = 0;
        let resizeHandler: (() => void) | null = null;
        let cancelled = false;

        const init = () => {
            if (cancelled) return;
            const element = ref.current;
            if (!element) {
                // Wait for the element to mount
                raf = requestAnimationFrame(init);
                return;
            }

            const set = () => {
                // Use both getBoundingClientRect and offsetHeight as fallbacks
                const rectHeight = element.getBoundingClientRect().height;
                const height = rectHeight || (element as HTMLElement).offsetHeight || 0;
                if (height > 0) root.style.setProperty('--toolbar-h', `${Math.round(height)}px`);
            };

            set();

            if (typeof ResizeObserver !== 'undefined') {
                resizeObserver = new ResizeObserver(set);
                resizeObserver.observe(element);
            }

            resizeHandler = set;
            window.addEventListener('resize', resizeHandler);

            // Fonts/layout may settle after first paint; measure once more
            raf = requestAnimationFrame(set);
        };

        raf = requestAnimationFrame(init);

        return () => {
            cancelled = true;
            if (resizeObserver) resizeObserver.disconnect();
            if (resizeHandler) window.removeEventListener('resize', resizeHandler);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []); // run once on mount
}
