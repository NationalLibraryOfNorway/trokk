import { useEffect } from 'react';
import { useSettings } from '@/context/setting-context.tsx';

const TEXT_SIZE_STEP = 10; // 10% increment/decrement

export const useTextSizeShortcuts = () => {
    const { textSize, setTextSize } = useSettings();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl/Cmd key
            const isModifierPressed = e.ctrlKey || e.metaKey;

            if (!isModifierPressed) return;

            // Ctrl/Cmd + Plus/Equals (increase)
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setTextSize(textSize + TEXT_SIZE_STEP);
            }
            // Ctrl/Cmd + Minus (decrease)
            else if (e.key === '-') {
                e.preventDefault();
                setTextSize(textSize - TEXT_SIZE_STEP);
            }
            // Ctrl/Cmd + 0 (reset)
            else if (e.key === '0') {
                e.preventDefault();
                setTextSize(100);
            }
        };

        const handleWheel = (e: WheelEvent) => {
            // Only handle Ctrl/Cmd + wheel
            if (!e.ctrlKey && !e.metaKey) return;

            e.preventDefault();

            // deltaY is negative when scrolling up, positive when scrolling down
            if (e.deltaY < 0) {
                // Scroll up = increase size
                setTextSize(textSize + TEXT_SIZE_STEP);
            } else if (e.deltaY > 0) {
                // Scroll down = decrease size
                setTextSize(textSize - TEXT_SIZE_STEP);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleWheel);
        };
    }, [textSize, setTextSize]);
};

