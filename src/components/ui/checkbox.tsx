import React from 'react';
import {cn} from '@/lib/utils.ts';

export interface CheckboxProps {
    isChecked: boolean;
    onChange: (checked: boolean) => void;
    isFocused: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ isChecked, onChange, isFocused }) => {
    return (
        <label className="inline-flex items-center space-x-2 cursor-pointer">
            <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onChange(e.target.checked)}
                className="peer sr-only"
            />
            <div className={cn(
                'w-8 h-8 border-2 rounded flex items-center justify-center',
                    'peer-checked:bg-amber-400',
                    'hover:bg-stone-400/30 hover:peer-checked:bg-amber-300',
                    isFocused ? 'border-blue-500' : isChecked ? 'border-amber-400' : 'border-stone-400',
                )}
            >
                {isChecked && (
                    <svg className="w-6 h-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fillRule="evenodd"
                            d="M6.293 9.293a1 1 0 011.414 0L10 11.586l5.293-5.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                )}
            </div>
        </label>
    );
};

export default Checkbox;
