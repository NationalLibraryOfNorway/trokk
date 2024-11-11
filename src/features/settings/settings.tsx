import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { settings } from '../../tauri-store/settings';
import { readDir } from '@tauri-apps/plugin-fs';
import { getVersion } from '@tauri-apps/api/app';

const SettingsForm: React.FC = () => {
    const [scannerPath, setScannerPath] = useState<string>('');
    const [scanPathError, setScanPathError] = useState<string | undefined>(undefined);
    const [scanPathSuccess, setScanPathSuccess] = useState<string | undefined>(undefined);
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        const initialize = async () => {
            setScannerPath(await settings.getScannerPath() ?? '');
            setVersion(await getVersion());
        };
        void initialize();
    }, []);

    const pickScannerPath = async () => {
        try {
            const path = await invoke<string>('pick_directory', { startPath: scannerPath });
            saveScannerPath(path);
        } catch (error) {
            console.error(error);
            setScanPathError('Kunne ikke velge mappe');
        }
    };

    const saveScannerPath = (path: string) => {
        readDir(path)
            .then(async () => {
                setScanPathError(undefined);
                setScannerPath(path);
                await settings.setScannerPath(path)
                setScanPathSuccess('Lagret!');
                setTimeout(() => setScanPathSuccess(undefined), 5000);
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) setScanPathError('Dette er ikke en mappe');
                else setScanPathError('Mappen eksisterer ikke');
            });
    };


    return (
        <form className="flex flex-col">
            <div className="flex mb-2">
                <div className="flex-grow-0 ml-4 text-xs">versjon {version}</div>
            </div>

            <div className="flex mb-2">
                <label htmlFor="scannerPath" className="w-32 mt-3">Skanner kilde</label>
                <button type="button" onClick={pickScannerPath} className="ml-2">Velg mappe</button>
                <input
                    type="text"
                    id="scannerPath"
                    value={scannerPath}
                    onChange={(e) => setScannerPath(e.target.value)}
                    className="ml-2 w-80"
                />
                <button type="button" onClick={() => saveScannerPath(scannerPath)} className="ml-2">Lagre</button>
                {scanPathError && <p className="text-red-500 ml-2">{scanPathError}</p>}
                {scanPathSuccess && <p className="text-green-500 ml-2">{scanPathSuccess}</p>}
            </div>
        </form>
    );
};

export default SettingsForm;