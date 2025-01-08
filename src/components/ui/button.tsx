//import './button.scss';
import React from 'react';

interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

const Button: React.FC<ButtonProps> = ({onClick, children, className}) => {
    return (
        <button
            className={`
                rounded-lg
                border
                border-transparent
                px-3
                py-2
                text-base
                font-medium
                transition-colors
                duration-200
                shadow-md
                hover:border-blue-600
                active:border-blue-600
                text-white
                bg-stone-900
                active:bg-stone-800
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default Button;