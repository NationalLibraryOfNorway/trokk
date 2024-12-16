import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DetailedImageViewProps {
    imageSrc?: string;
    onClose: () => void;
}

export default function DetailedImageView(props: DetailedImageViewProps) {

    // Handle exit button click event
    const handleExit = () => {
        props.onClose();
    }

    // On Escape key press, close the detailed image view
    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            props.onClose();
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        }
    }, []);

    return (
        <div className="relative bg-gray-200 bg-opacity-25 dark:bg-gray-700 dark:bg-opacity-25">
            <button
                onClick={handleExit}
                className="absolute top-0 right-0 m-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white"
            >
                x
            </button>
            <img src={props.imageSrc} alt="Image in full size" className="max-h-screen w-full object-contain" />
        </div>
    );
}