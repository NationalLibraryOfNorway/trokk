import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { useSettings } from '../../context/setting-context.tsx';

const SettingsForm: React.FC = () => {
    const { scannerPath, setScannerPathSetting, version } = useSettings();
    const [scanPathError, setScanPathError] = useState<string | undefined>(undefined);
    const [scanPathSuccess, setScanPathSuccess] = useState<string | undefined>(undefined);

    const [scannerPathEdit, setScannerPathEdit] = useState<string>(scannerPath);

    const pickScannerPath = async () => {
        try {
            const path = await invoke<string>('pick_directory', { startPath: scannerPath });
            setScannerPathEdit(path);
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
                setScannerPathSetting(path);
                setScanPathSuccess('Lagret!');
                setTimeout(() => setScanPathSuccess(undefined), 5000);
            })
            .catch((e: string) => {
                if (e.includes('Not a directory')) setScanPathError('Dette er ikke en mappe');
                else setScanPathError('Mappen eksisterer ikke');
            });
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        saveScannerPath(scannerPathEdit);
    };


    return (
        <form className="flex flex-col" onSubmit={handleSubmit}>
            <div className="flex mb-2">
                <div className="flex-grow-0 ml-4 text-xs">versjon {version.current}</div>
            </div>

            <div className="flex mb-2">
                <label htmlFor="scannerPath" className="w-32 mt-3">Skanner kilde</label>
                <button type="button" onClick={pickScannerPath} className="ml-2">Velg mappe</button>
                <input
                    type="text"
                    id="scannerPath"
                    value={scannerPathEdit}
                    onChange={(e) => setScannerPathEdit(e.target.value)}
                    className="ml-2 w-80"
                />
                <button type="button" onClick={() => saveScannerPath(scannerPathEdit)} className="ml-2">Lagre</button>
                {scanPathError && <p className="text-red-500 ml-2">{scanPathError}</p>}
                {scanPathSuccess && <p className="text-green-500 ml-2">{scanPathSuccess}</p>}
            </div>
        </form>
    );
};

export default SettingsForm;