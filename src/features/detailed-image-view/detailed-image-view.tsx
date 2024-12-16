import React, {useEffect} from 'react';

interface DetailedImageViewProps {
    imageSrc?: string;
    displayTitle: boolean;
    onClose: () => void;
}

export default function DetailedImageView({imageSrc, displayTitle, onClose}: DetailedImageViewProps) {
    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
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
            {displayTitle && <p className="text-xl text-center py-4">{imageSrc?.split('%2F').pop() ?? ''}</p>}
            <button
                onClick={onClose}
                className="absolute top-0 right-0 m-4 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 text-white"
            >
                x
            </button>
            <img src={imageSrc} alt="Image in full size" className="p-2.5 max-h-screen w-full object-contain" />
        </div>
    );
}