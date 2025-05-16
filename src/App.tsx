import React, { useState} from 'react';
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
        <>
            <div className="grid grid-cols-3 mt-2 sticky top-0">
                <h2 className="text-xl flex items-center pl-4">
                    <FolderOpen size="32" className="-ml-3 mr-1 mb-2 flex-shrink-0"/>{scannerPath}
                </h2>
                <h1 className="text-4xl content-end text-center">Trøkk</h1>
                <div className="flex justify-end gap-2">
                    <div className="flex pr-2 pt-3">
                        <User/>
                        <p className="pt-0.5">{authResponse!.userInfo.givenName}</p>
                    </div>
                    <Button onClick={() => setOpenSettings(!openSettings)}>Innstillinger</Button>
                    <Button onClick={logout}>Logg ut</Button>
                </div>
            </div>
            <TrokkFilesProvider scannerPath={scannerPath}>
                <UploadProgressProvider>
                    <MainLayout/>
                </UploadProgressProvider>
            </TrokkFilesProvider>
        </>
    );
};

export default App;