import React from 'react';

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
            <div className={`w-6 h-6 border-2 rounded flex items-center justify-center
                border-gray-400 peer-checked:bg-amber-400 peer-checked:border-amber-400
                ${isFocused ? 'ring-2 ring-white' : ''}
            `}>
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
