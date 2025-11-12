import React, {useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {readDir} from '@tauri-apps/plugin-fs';
import {useSettings} from '@/context/setting-context.tsx';
import WindowControlButton from '@/components/ui/window-control-button.tsx';
import {ALargeSmall, X} from 'lucide-react';
import {Separator} from '@/components/ui/separator.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Input} from '@/components/ui/input.tsx';

interface SettingsFormProps {
    setOpen: (open: boolean) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({setOpen}) => {
    const {scannerPath, setScannerPathSetting, version, textSize, setTextSize} = useSettings();
    const [scanPathError, setScanPathError] = useState<string | undefined>(undefined);
    const [scanPathSuccess, setScanPathSuccess] = useState<string | undefined>(undefined);
    const [deletePreviewsStatus, setDeletePreviewsStatus] = useState<string | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const [scannerPathEdit, setScannerPathEdit] = useState<string>(scannerPath);

    const pickScannerPath = async () => {
        try {
            const path = await invoke<string>('pick_directory', {startPath: scannerPath});
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
        <form className="flex flex-col w-full" onSubmit={handleSubmit}>


            <div className="flex flex-row w-full items-center">
                <div className="flex text-xl">Trøkk versjon {version.current}</div>
                <WindowControlButton
                    title='Lukk innstillinger'
                    onClick={() => setOpen(false)}
                    icon={X}
                    className="flex ml-auto mb-3"
                />
            </div>
            <Separator />

            <div className="flex mb-2 mt-4 items-center">
                <label htmlFor="textSize" className="w-32">Tekststørrelse</label>
                <div className="ml-2 flex items-center gap-2">
                    <Button variant="outline" className='w-[24px] h-[24px] p-0' onClick={() => setTextSize(75)} >
                        <ALargeSmall className="!w-[24px] !h-[24px]"/>
                    </Button>

                    <Button variant="outline" className='w-[32px] h-[32px] p-0' onClick={() => setTextSize(100)} >
                        <ALargeSmall className="!w-[32px] !h-[32px]"/>
                    </Button>

                    <Button variant="outline" className='w-[40px] h-[40px] p-0' onClick={() => setTextSize(125)} >
                        <ALargeSmall className="!w-[40px] !h-[40px]"/>
                    </Button>

                    <Button variant="outline" className='w-[48px] h-[48px] p-0' onClick={() => setTextSize(150)} >
                        <ALargeSmall  className="!w-[48px] !h-[48px]"/>
                    </Button>
                </div>
                <span className="ml-6 flex flex-row">Størrelse: {textSize}%</span>
            </div>
            <div className="flex mb-7 ml-32">
                <span className="ml-2 text-xs text-muted-foreground">
                    Eller juster med Ctrl +/- eller Ctrl + musehjul
                </span>
            </div>

            <div className="flex mb-7 items-center">
                <label htmlFor="scannerPath" className="w-32">Skanner kilde</label>
                <button type="button" onClick={pickScannerPath} className="ml-2">Velg mappe</button>
                <Input
                    type="text"
                    id="scannerPath"
                    value={scannerPathEdit}
                    onChange={(e) => setScannerPathEdit(e.target.value)}
                    className="ml-2 w-80"
                />
                <Button variant='secondary' type="button" onClick={() => saveScannerPath(scannerPathEdit)} className="ml-2">Lagre</Button>
                {scanPathError && <p className="text-red-500 ml-2">{scanPathError}</p>}
                {scanPathSuccess && <p className="text-green-500 ml-2">{scanPathSuccess}</p>}
            </div>

            <div className="flex mb-2 items-center">
                <label className="w-32">Forhåndsvisninger</label>
                <Button
                    type="button"
                    onClick={handleDeleteAllPreviews}
                    disabled={isDeleting || !scannerPath}
                    className="ml-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white "
                >
                    {isDeleting ? 'Sletter...' : 'Slett alle forhåndsvisninger'}
                </Button>
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
