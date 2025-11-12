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
        const el = ref.current;
        if (!el) return;

        const root = document.documentElement;

        const set = () => {
            const h = el.getBoundingClientRect().height;
            if (Number.isFinite(h) && h > 0) {
                root.style.setProperty('--toolbar-h', `${h}px`);
            }
        };

        set();

        const ro = new ResizeObserver(() => set());
        ro.observe(el);
        // Update on viewport changes
        const onResize = () => set();
        window.addEventListener('resize', onResize);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, [ref]);
}
