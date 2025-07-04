import { render, fireEvent } from '@testing-library/react';
import Checkbox from '../src/components/ui/checkbox';

describe('Checkbox component', () => {
    it('renders with amber color when checked is true', () => {
        const { container } = render(
            <Checkbox isChecked={true} onChange={() => {}} isFocused={false} />
        );

        const input = container.querySelector('input[type="checkbox"]');
        const visualBox = input?.nextSibling as HTMLElement;

        expect(visualBox).not.toBeNull();
        expect(visualBox.className.includes('bg-amber-400')).toBe(true);
        expect(visualBox.className.includes('border-amber-400')).toBe(true);
    });

    it('calls onChange when checkbox is clicked', () => {
        const handleChange = vi.fn();
        const { container } = render(
            <Checkbox isChecked={false} onChange={handleChange} isFocused={false} />
        );

        const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(input);

        expect(handleChange).toHaveBeenCalledWith(true);
    });
});
