import {RotateCw, Loader2, RefreshCw} from 'lucide-react';

export type StatusType = 'rotating' | 'reloading' | 'saving' | 'loading';

interface StatusConfig {
    icon: typeof RotateCw;
    text: string;
    spinAnimation?: boolean;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
    rotating: {
        icon: RotateCw,
        text: 'Roterer bilde...',
        spinAnimation: true
    },
    reloading: {
        icon: RefreshCw,
        text: 'Laster inn på nytt...',
        spinAnimation: true
    },
    saving: {
        icon: Loader2,
        text: 'Lagrer...',
        spinAnimation: true
    },
    loading: {
        icon: Loader2,
        text: 'Laster...',
        spinAnimation: true
    }
};

interface StatusOverlayProps {
    status?: StatusType | null;
    size?: 'small' | 'medium' | 'large';
    customText?: string;
}

export default function StatusOverlay({status, size = 'medium', customText}: StatusOverlayProps) {
    if (!status) return null;

    const config = statusConfigs[status];
    const Icon = config.icon;

    const sizeClasses = {
        small: 'px-2 py-1 text-xs',
        medium: 'px-4 py-2 text-sm',
        large: 'px-6 py-3 text-base'
    };

    const iconSizes = {
        small: 14,
        medium: 18,
        large: 24
    };

    return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white rounded-lg backdrop-blur-sm flex items-center gap-2 z-[5] ${sizeClasses[size]}`}>
            <Icon
                size={iconSizes[size]}
                className={config.spinAnimation ? 'animate-spin' : ''}
            />
            <span className="font-medium whitespace-nowrap">
                {customText || config.text}
            </span>
        </div>
    );
}

// Backward compatibility export
export {StatusOverlay as RotationStatusOverlay};

