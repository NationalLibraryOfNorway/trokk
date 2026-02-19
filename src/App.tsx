import React, {useRef, useState} from 'react';
import {FolderOpen, User, X, Expand, Minimize, Minus, LogIn, LogOut, Settings} from 'lucide-react';
import './App.css';
import {AuthProvider, useAuth} from './context/auth-context.tsx';
import {TrokkFilesProvider} from './context/trokk-files-context.tsx';
import MainLayout from './components/layouts/main-layout.tsx';
import SettingsForm from './features/settings/settings.tsx';
import {UploadProgressProvider} from './context/upload-progress-context.tsx';
import {SecretProvider} from './context/secret-context.tsx';
import {SettingProvider, useSettings} from './context/setting-context.tsx';
import {MessageProvider} from './context/message-context.tsx';
import {TransferLogProvider} from './context/transfer-log-context.tsx';
import {SelectionProvider} from './context/selection-context.tsx';
import {RotationProvider} from './context/rotation-context.tsx';
import {useSecrets} from './context/secret-context.tsx';
import {getCurrentWindow} from '@tauri-apps/api/window';
import WindowControlButton from './components/ui/window-control-button.tsx';
import {useTextSizeShortcuts} from './hooks/use-text-size-shortcuts.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Dialog, DialogContent, DialogTrigger} from '@/components/ui/dialog.tsx';
import {useToolbarOffset} from '@/hooks/use-toolbar-offset';
import {StartupMessageCard, StartupScreen, StartupSpinner} from '@/components/startup/startup-screen.tsx';

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
                    <main className="h-screen w-screen flex flex-col overflow-hidden">
                        <Content
                            openSettings={openSettings}
                            setOpenSettings={setOpenSettings}
                        />
                    </main>

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
    const {authResponse, loggedOut, isLoggingIn, isRefreshingToken, fetchSecretsError, login, logout} = useAuth();
    const {scannerPath} = useSettings();
    const {startupVersionMessage, startupVersionStatus, getSecrets} = useSecrets();
    const [isRetryingStartup, setIsRetryingStartup] = useState(false);
    const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const startupWarningMessageClass = 'border-yellow-600 bg-yellow-950/40 text-yellow-100';
    useToolbarOffset(toolbarRef);

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

    const handleRetryStartup = async () => {
        setIsRetryingStartup(true);
        await getSecrets()
            .catch(() => undefined)
            .finally(() => setIsRetryingStartup(false));
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
        const startupErrorTitle = 'Feil ved oppstart';
        const startupMessageClass = 'border-destructive bg-destructive text-destructive-foreground';

        return (
            <StartupScreen logoClassName="w-96">
                <StartupMessageCard title={startupErrorTitle} message={fetchSecretsError} className={startupMessageClass}>
                </StartupMessageCard>
                <div className="flex items-center gap-3">
                    <Button onClick={handleRetryStartup} disabled={isRetryingStartup}>
                        {isRetryingStartup ? 'Prøver igjen...' : 'Prøv igjen'}
                    </Button>
                    <Button variant="secondary" onClick={handleExit}>
                        Lukk app
                    </Button>
                </div>
            </StartupScreen>
        );
    }

    if (isRefreshingToken && !authResponse) {
        return (
            <StartupScreen>
                <StartupSpinner label="Logger inn"/>
            </StartupScreen>
        );
    }

    if (loggedOut) {
        const isStartupBlocking =
            startupVersionStatus === 'MAJOR_BLOCKING' || startupVersionStatus === 'MINOR_BLOCKING';

        return (
            <StartupScreen>
                {startupVersionMessage && (
                    <p data-tauri-drag-region className={`mb-6 max-w-xl rounded-md border px-4 py-3 text-sm ${startupWarningMessageClass}`}>
                        {startupVersionMessage}
                    </p>
                )}
                {isLoggingIn ? (
                    <StartupSpinner label="Logger inn"/>
                ) : (
                    <div className="flex items-center gap-3">
                        {!isStartupBlocking && (
                            <Button size='lg' onClick={login}>
                                Logg inn <LogIn/>
                            </Button>
                        )}
                        {startupVersionMessage && isStartupBlocking && (
                            <Button size='lg' variant="secondary" onClick={handleExit}>
                                Lukk app
                            </Button>
                        )}
                    </div>
                )}
            </StartupScreen>
        );
    }

    if (isLoggingIn && !authResponse) {
        return (
            <StartupScreen>
                <h2 data-tauri-drag-region className={'h-[75px]'}>Nytt innloggingsvindu åpnet, vennligst logg inn
                    der...</h2>
            </StartupScreen>
        );
    }

    if (!authResponse) {
        return (
            <StartupScreen>
                <Button
                    className={'w-[150px] h-[75px] text-2xl'}
                    onClick={login}
                >
                    Logg inn <LogIn/>
                </Button>
            </StartupScreen>
        );
    }

    return (
        <div className="relative flex-1 w-full flex flex-col overflow-hidden min-h-0">
            <div data-tauri-drag-region ref={toolbarRef}
                className="flex flex-row py-2 px-3 w-full bg-stone-700 border-2 border-stone-800 items-center justify-between shrink-0">
                <div className="flex-shrink-0">
                    <Button onClick={copyPathToClipboard}
                            className="hover:bg-stone-600 p-0 bg-stone-700 border-0 shadow-none flex"
                            title="Klikk for å kopiere">
                        <FolderOpen size="32" className="ms-2"/>
                        <span className="mt-1 me-2 relative group hidden md:inline">
                            {scannerPath}
                        </span>
                    </Button>
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

                    <Dialog open={openSettings} onOpenChange={setOpenSettings} >
                        <DialogTrigger asChild>
                            <Button onClick={() => setOpenSettings(!openSettings)}>
                                <span className="hidden lg:inline">Innstillinger</span>
                                <Settings className="lg:ms-2"/>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='bg-stone-900 flex flex-col w-3/4 max-w-3xl'>
                            <SettingsForm setOpen={setOpenSettings}/>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={logout}>
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
            <div className="flex-1 min-h-0 flex flex-col">
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
        </div>
    );
};

export default App;
