import React, { useState, useEffect } from "react";
import { FolderOpen, User } from "lucide-react";
import { documentDir } from "@tauri-apps/api/path";
import { settings } from "./tauri-store/settings";
import { path } from "@tauri-apps/api";
import "./App.css";
import {AuthProvider, AuthContextType, useAuth} from "./context/auth-context.tsx";
import {TrokkFilesProvider} from "./context/trokk-files-context.tsx";
import MainLayout from "./components/layouts/main-layout.tsx";
import Modal from "./components/ui/modal.tsx";
import SettingsForm from "./features/settings/settings.tsx";
import { UploadProgressProvider } from "./context/upload-progress-context.tsx";
import Button from "./components/ui/button.tsx";

function App() {
    const [scannerPath, setScannerPath] = useState<string>("");
    const [openSettings, setOpenSettings] = useState<boolean>(false);

    useEffect(() => {
        const initializeSettings = async () => {
            try {
                await settings.init();
                const savedScanPath = await settings.getScannerPath();
                if (savedScanPath) {
                    setScannerPath(savedScanPath);
                } else {
                    const defaultPath = await documentDir() + path.sep() + "trokk" + path.sep() + "files";
                    await settings.setScannerPath(defaultPath);
                    setScannerPath(defaultPath);
                }
            } catch (error) {
                console.error("Error initializing settings:", error);
            }
        };

        void initializeSettings();
    }, []);

    return (
        <AuthProvider>
            <main className="mainContainer">
                <Content
                    scannerPath={scannerPath}
                    openSettings={openSettings}
                    setOpenSettings={setOpenSettings}
                />
            </main>
            <Modal isOpen={openSettings} onClose={() => setOpenSettings(false)}>
                <SettingsForm />
            </Modal>
        </AuthProvider>
    );
}

interface ContentProps {
    scannerPath: string;
    openSettings: boolean;
    setOpenSettings: React.Dispatch<React.SetStateAction<boolean>>
}

const Content: React.FC<ContentProps> = ({ scannerPath, openSettings, setOpenSettings }) => {
    const { authResponse, loggedOut, isLoggingIn, fetchSecretsError, login, logout } = useAuth() as AuthContextType;

    if (fetchSecretsError) {
        return (
            <>
                <div className="topBar">
                    <p></p>
                    <h1>Trøkk</h1>
                    <p></p>
                </div>
                <div className="vaultError errorColor">
                    <h1>Feil ved innhenting av hemmeligheter</h1>
                    <p>{fetchSecretsError}</p>
                </div>
            </>
        );
    }

    if (loggedOut && !isLoggingIn) {
        return (
            <div className={`w-screen h-screen flex flex-col justify-center items-center text-center`}>
                <img alt={`Trøkk logo`} src="banner.png" className={`w-96 pb-10`}></img>
                <Button className={`w-[150px] h-[75px] text-2xl`} onClick={login}>Logg inn</Button>
            </div>
        );
    }

    if (isLoggingIn && !authResponse) {
        return (
            <div className={`w-screen h-screen flex flex-col justify-center items-center text-center`}>
                <img alt={`Trøkk logo`} src="banner.png" className={`w-96 pb-10`}></img>
                <h2 className={`h-[75px]`}>Nytt innloggingsvindu åpnet, vennligst logg inn der...</h2>
            </div>
        );
    }

    if (!authResponse) {
        return (
            <div className={`w-screen h-screen flex flex-col justify-center items-center text-center`}>
                <img alt={`Trøkk logo`} src="banner.png" className={`w-96 pb-10`}></img>
                <Button className={`w-[150px] h-[75px] text-2xl`} onClick={login}>Logg inn</Button>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-3 mt-2 sticky top-0">
                <h2 className="text-xl flex items-center pl-4">
                    <FolderOpen size="32" className="-ml-3 mr-1 mb-2 flex-shrink-0"/>{scannerPath}
                </h2>
                <h1 className="text-4xl content-end">Trøkk</h1>
                <div className="flex justify-end gap-2">
                    <div className="flex pr-2 pt-3">
                        <User />
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