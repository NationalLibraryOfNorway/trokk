import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { readDir } from '@tauri-apps/plugin-fs';
import { useSettings } from '@/context/setting-context.tsx';

const SettingsForm: React.FC = () => {
    const { scannerPath, setScannerPathSetting, version } = useSettings();
    const [scanPathError, setScanPathError] = useState<string | undefined>(undefined);
    const [scanPathSuccess, setScanPathSuccess] = useState<string | undefined>(undefined);
    const [deletePreviewsStatus, setDeletePreviewsStatus] = useState<string | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

    const handleDeleteAllPreviews = async () => {
        if (!scannerPath) {
            setDeletePreviewsStatus('Ingen skanner mappe valgt');
            return;
        }

        if (!confirm('Er du sikker på at du vil slette alle forhåndsvisninger? Dette kan ikke angres.')) {
            return;
        }

        setIsDeleting(true);
        setDeletePreviewsStatus(undefined);

        try {
            const deletedCount = await invoke<number>('delete_all_previews_and_thumbnails', {
                directoryPath: scannerPath
            });
            setDeletePreviewsStatus(`Slettet ${deletedCount} forhåndsvisninger og miniatyrbilder.`);
            setTimeout(() => setDeletePreviewsStatus(undefined), 5000);
        } catch (error) {
            console.error('Failed to delete previews and thumbnails:', error);
            setDeletePreviewsStatus(`Feil: ${error}`);
        } finally {
            setIsDeleting(false);
        }
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

            <div className="flex mb-2 items-center">
                <label className="w-32 mt-3">Forhåndsvisninger</label>
                <button
                    type="button"
                    onClick={handleDeleteAllPreviews}
                    disabled={isDeleting || !scannerPath}
                    className="ml-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded"
                >
                    {isDeleting ? 'Sletter...' : 'Slett alle forhåndsvisninger'}
                </button>
                {deletePreviewsStatus && (
                    <p className={`ml-2 ${deletePreviewsStatus.startsWith('Feil') ? 'text-red-500' : deletePreviewsStatus.startsWith('Slettet') ? 'text-green-500' : 'text-yellow-500'}`}>
                        {deletePreviewsStatus}
                    </p>
                )}
            </div>
        </form>
    );
};

export default SettingsForm;
