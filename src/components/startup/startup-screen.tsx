import React from 'react';
import {Loader2} from 'lucide-react';

interface StartupScreenProps {
    children: React.ReactNode;
    logoClassName?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({children, logoClassName = 'w-96 pb-10'}) => (
    <div data-tauri-drag-region className="w-screen h-screen flex flex-col justify-center items-center text-center">
        <img data-tauri-drag-region alt={'Trøkk logo'} src="/banner.png" className={logoClassName}></img>
        {children}
    </div>
);

interface StartupSpinnerProps {
    label: string;
}

export const StartupSpinner: React.FC<StartupSpinnerProps> = ({label}) => (
    <div data-tauri-drag-region className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" aria-label={label}/>
        <p data-tauri-drag-region className="text-xl">{label}</p>
    </div>
);

interface StartupMessageCardProps {
    title: string;
    message: string;
    className: string;
    children?: React.ReactNode;
}

export const StartupMessageCard: React.FC<StartupMessageCardProps> = ({title, message, className, children}) => (
    <div
        data-tauri-drag-region
        className={`flex max-w-2xl flex-col justify-center items-center rounded-md border p-4 m-4 ${className}`}>
        <h1>{title}</h1>
        <p>{message}</p>
        {children}
    </div>
);
