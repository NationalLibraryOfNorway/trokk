//import './button.scss';
import React from 'react';

interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

const TrokkButton: React.FC<ButtonProps> = ({onClick, children, className}) => {
    return (
        <button
            className={`
                border-0
                rounded-lg
                px-3
                py-2
                text-base
                font-medium
                transition-colors
                duration-200
                shadow-md
                hover:bg-stone-800
                active:bg-stone-800
                text-white
                bg-stone-900
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </button>
    );
};

export default TrokkButton;
