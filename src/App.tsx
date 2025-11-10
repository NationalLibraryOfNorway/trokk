import React, {useState} from 'react';
import {FolderOpen, User, X, Expand, Minimize, Minus, LogIn, LogOut, Settings} from 'lucide-react';
import './App.css';
import {AuthContextType, AuthProvider, useAuth} from './context/auth-context.tsx';
import {TrokkFilesProvider} from './context/trokk-files-context.tsx';
import MainLayout from './components/layouts/main-layout.tsx';
import Modal from './components/ui/modal.tsx';
import SettingsForm from './features/settings/settings.tsx';
import {UploadProgressProvider} from './context/upload-progress-context.tsx';
import Button from './components/ui/button.tsx';
import {SecretProvider} from './context/secret-context.tsx';
import {SettingProvider, useSettings} from './context/setting-context.tsx';
import {MessageProvider} from './context/message-context.tsx';
import {TransferLogProvider} from './context/transfer-log-context.tsx';
import {SelectionProvider} from './context/selection-context.tsx';
import {RotationProvider} from './context/rotation-context.tsx';
import {getCurrentWindow} from '@tauri-apps/api/window';
import WindowControlButton from './components/ui/window-control-button.tsx';
import {useTextSizeShortcuts} from './hooks/use-text-size-shortcuts.tsx';


function App() {
    // TODO figure out what is making that "Unhandled Promise Rejection: window not found" error
    window.addEventListener('unhandledrejection', function (event) {
        console.error('Unhandled rejection (promise: ', event.promise, ', reason: ', event.reason, ').');
        console.error(event);
        throw event;
    });

    const [openSettings, setOpenSettings] = useState<boolean>(false);

    return (
        <SecretProvider>
            <AuthProvider>
                <SettingProvider>
                    <main className="flex flex-col">
                        <Content
                            openSettings={openSettings}
                            setOpenSettings={setOpenSettings}
                        />
                    </main>
                    <Modal isOpen={openSettings} onClose={() => setOpenSettings(false)}>
                        <SettingsForm/>
                    </Modal>
                </SettingProvider>
            </AuthProvider>
        </SecretProvider>
    );
}

interface ContentProps {
    openSettings: boolean;
    setOpenSettings: React.Dispatch<React.SetStateAction<boolean>>;
}

const Content: React.FC<ContentProps> = ({openSettings, setOpenSettings}) => {
    const {authResponse, loggedOut, isLoggingIn, fetchSecretsError, login, logout} = useAuth() as AuthContextType;
    const {scannerPath} = useSettings();
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    // Enable keyboard shortcuts for text size control
    useTextSizeShortcuts();

    const copyPathToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(scannerPath);
            setShowCopiedTooltip(true);
            setTimeout(() => setShowCopiedTooltip(false), 2000);
        } catch (err) {
            console.error('Failed to copy path to clipboard:', err);
        }
    };

    const handleMinimize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.minimize();
        } catch (error) {
            console.error('Failed to minimize window:', error);
        }
    };

    const handleMaximize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.toggleMaximize();
            setIsMaximized(!isMaximized);
        } catch (error) {
            console.error('Failed to toggle maximize window:', error);
        }
    };

    const handleExit = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.close();
        } catch (error) {
            console.error('Failed to close window:', error);
        }
    };

    // Listen for window maximize/unmaximize events
    React.useEffect(() => {
        const appWindow = getCurrentWindow();

        const setupListeners = async () => {
            // Check initial state
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);

            // Listen for resize events
            const unlistenResize = await appWindow.onResized(async () => {
                const maximized = await appWindow.isMaximized();
                setIsMaximized(maximized);
            });

            return unlistenResize;
        };

        let unlisten: (() => void) | undefined;
        setupListeners().then(fn => {
            unlisten = fn;
        });

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    if (fetchSecretsError) {
        return (
            <>
                <div className="flex flex-row justify-between sticky top-0 h-[5vh]">
                    <p></p>
                    <h1 className={'text-center'}>Trøkk</h1>
                    <p></p>
                </div>
                <div className="flex flex-col justify-center items-center w-max self-center rounded-md p-2 errorColor">
                    <h1>Feil ved innhenting av hemmeligheter</h1>
                    <p>{fetchSecretsError}</p>
                </div>
            </>
        );
    }

    if (loggedOut && !isLoggingIn) {
        return (
            <div className={'w-screen h-screen flex flex-col justify-center items-center text-center'}>
                <img alt={'Trøkk logo'} src="/banner.png" className={'w-96 pb-10'}></img>
                <Button className={'w-[150px] h-[75px] text-2xl'} onClick={login}>Logg inn <LogIn/></Button>
            </div>
        );
    }

    if (isLoggingIn && !authResponse) {
        return (
            <div data-tauri-drag-region
                 className={'w-screen h-screen flex flex-col justify-center items-center text-center'}>
                <img data-tauri-drag-region alt={'Trøkk logo'} src="/banner.png" className={'w-96 pb-10'}></img>
                <h2 data-tauri-drag-region className={'h-[75px]'}>Nytt innloggingsvindu åpnet, vennligst logg inn
                    der...</h2>
            </div>
        );
    }

    if (!authResponse) {
        return (
            <div className={'w-screen h-screen flex flex-col justify-center items-center text-center'}>
                <img alt={'Trøkk logo'} src="/banner.png" className={'w-96 pb-10'}></img>
                <Button className={'w-[150px] h-[75px] text-2xl'} onClick={login}>Logg inn <LogIn/></Button>
            </div>
        );
    }

    return (
        <div className="relative h-full flex-col">
            <div data-tauri-drag-region
                 className="flex flex-row py-2 px-3 sticky w-full z-10 top-0 bg-stone-700 border-2 border-stone-800 items-center justify-between">
                <div className="flex-shrink-0">
                    <button onClick={copyPathToClipboard}
                            className="items-center px-2 hover:bg-stone-600 p-0 bg-stone-700 border-0 shadow-none rounded-md cursor-pointer flex"
                            title="Klikk for å kopiere">
                        <FolderOpen size="32" className=""/>
                        <span className="mt-1 ms-1 relative group hidden md:inline">
                            {scannerPath}
                        </span>
                    </button>
                </div>
                {showCopiedTooltip && (
                    <span
                        className="absolute left-0 top-full mt-1 ml-4 px-2 py-2 bg-stone-800 text-white text-sm rounded whitespace-nowrap z-50 shadow-lg">
                                Mappesti kopiert til utklippstavle
                            </span>
                )}
                <div data-tauri-drag-region className="text-4xl cursor-default overflow-hidden">
                <img data-tauri-drag-region src={'/banner.png'} alt="Trøkk Logo"
                     className="h-10 inline-block ms-2 sm:w-auto w-10 object-cover object-left"/>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <div data-tauri-drag-region className="flex items-center pr-2 gap-1">
                        <div data-tauri-drag-region
                             className="bg-stone-600 rounded-full cursor-default p-1.5 mb-1 mr-1 flex items-center justify-center"
                        >
                            <User data-tauri-drag-region size={20}/>
                        </div>
                        <p data-tauri-drag-region
                           className="cursor-default hidden md:inline">{authResponse.userInfo.givenName}</p>
                    </div>
                    <Button onClick={() => setOpenSettings(!openSettings)} className="flex items-center">
                        <span className="hidden lg:inline">Innstillinger</span>
                        <Settings className="lg:ms-2"/>
                    </Button>
                    <Button onClick={logout} className="flex items-center">
                        <span className="hidden lg:inline">Logg&nbsp;ut</span>
                        <LogOut className="lg:ms-2"/>
                    </Button>

                    <WindowControlButton
                        onClick={handleMinimize}
                        icon={Minus}
                        title="Minimer"
                    />
                    <WindowControlButton
                        onClick={handleMaximize}
                        icon={isMaximized ? Minimize : Expand}
                        title={isMaximized ? 'Gjenopprett' : 'Maksimer'}
                    />
                    <WindowControlButton
                        onClick={handleExit}
                        icon={X}
                        title="Avslutt"
                    />
                </div>
            </div>
            <TrokkFilesProvider scannerPath={scannerPath}>
                <SelectionProvider>
                    <RotationProvider>
                        <UploadProgressProvider>
                            <TransferLogProvider>
                                <MessageProvider>
                                    <MainLayout/>
                                </MessageProvider>
                            </TransferLogProvider>
                        </UploadProgressProvider>
                    </RotationProvider>
                </SelectionProvider>
            </TrokkFilesProvider>
        </div>
    );
};

export default App;
