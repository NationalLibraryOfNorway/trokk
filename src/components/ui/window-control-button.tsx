import React from 'react';
import {LucideIcon} from 'lucide-react';

interface WindowControlButtonProps {
    onClick: () => void;
    icon: LucideIcon;
    title: string;
    className?: string;
}

const WindowControlButton: React.FC<WindowControlButtonProps> = ({onClick, icon: Icon, title, className = ''}) => {
    return (
        <button
            onClick={onClick}
            className={`
                border-0
                w-[30px] 
                rounded-full 
                bg-stone-600 
                hover:bg-stone-500 
                flex 
                items-center 
                justify-center 
                ${className}
            `}
            title={title}
        >
            <Icon size={16} className="flex-shrink-0" />
        </button>
    );
};

export default WindowControlButton;

