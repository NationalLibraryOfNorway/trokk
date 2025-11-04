import React, {useState} from 'react';
import {FolderOpen, User} from 'lucide-react';
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
                <Button className={'w-[150px] h-[75px] text-2xl'} onClick={login}>Logg inn</Button>
            </div>
        );
    }

    if (isLoggingIn && !authResponse) {
        return (
            <div className={'w-screen h-screen flex flex-col justify-center items-center text-center'}>
                <img alt={'Trøkk logo'} src="/banner.png" className={'w-96 pb-10'}></img>
                <h2 className={'h-[75px]'}>Nytt innloggingsvindu åpnet, vennligst logg inn der...</h2>
            </div>
        );
    }

    if (!authResponse) {
        return (
            <div className={'w-screen h-screen flex flex-col justify-center items-center text-center'}>
                <img alt={'Trøkk logo'} src="/banner.png" className={'w-96 pb-10'}></img>
                <Button className={'w-[150px] h-[75px] text-2xl'} onClick={login}>Logg inn</Button>
            </div>
        );
    }

    return (
        <div className="relative h-full flex-col">
            <div className="grid grid-cols-3 py-2 px-3 sticky w-full z-10 top-0 bg-stone-700 border-2 border-stone-800 items-center">
                <h2 className="text-xl flex items-center">
                    <FolderOpen size="32" className="mb-1 mr-1 flex-shrink-0"/>{scannerPath}
                </h2>
                <h1 className="text-4xl text-center">Trøkk</h1>
                <div className="flex justify-end items-center gap-2">
                    <div className="flex items-center pr-2 gap-1">
                        <div className="bg-stone-600 rounded-full p-1.5 mb-1 mr-1 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <p>{authResponse.userInfo.givenName}</p>
                    </div>
                    <Button onClick={() => setOpenSettings(!openSettings)}>Innstillinger</Button>
                    <Button onClick={logout}>Logg&nbsp;ut</Button>
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
