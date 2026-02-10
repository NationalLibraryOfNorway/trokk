import React, {useEffect, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {readDir} from '@tauri-apps/plugin-fs';
import {useSettings} from '@/context/setting-context.tsx';
import WindowControlButton from '@/components/ui/window-control-button.tsx';
import {ALargeSmall, X} from 'lucide-react';
import {Separator} from '@/components/ui/separator.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Input} from '@/components/ui/input.tsx';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select.tsx';

interface SettingsFormProps {
    setOpen: (open: boolean) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({setOpen}) => {
    const {
        scannerPath,
        setScannerPathSetting,
        version,
        textSize,
        setTextSize,
        thumbnailSizeFraction,
        previewSizeFraction,
        setThumbnailSizeFraction,
        setPreviewSizeFraction
    } = useSettings();
    const [scanPathError, setScanPathError] = useState<string | undefined>(undefined);
    const [scanPathSuccess, setScanPathSuccess] = useState<string | undefined>(undefined);
    const [deletePreviewsStatus, setDeletePreviewsStatus] = useState<string | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [isSavingSizeFractions, setIsSavingSizeFractions] = useState<boolean>(false);
    const [sizeFractionsStatus, setSizeFractionsStatus] = useState<string | undefined>(undefined);

    const [scannerPathEdit, setScannerPathEdit] = useState<string>(scannerPath);
    const [thumbnailSizeFractionEdit, setThumbnailSizeFractionEdit] = useState<number>(thumbnailSizeFraction);
    const [previewSizeFractionEdit, setPreviewSizeFractionEdit] = useState<number>(previewSizeFraction);

    useEffect(() => {
        setScannerPathEdit(scannerPath);
    }, [scannerPath]);

    useEffect(() => {
        setThumbnailSizeFractionEdit(thumbnailSizeFraction);
        setPreviewSizeFractionEdit(previewSizeFraction);
    }, [thumbnailSizeFraction, previewSizeFraction]);

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

    const getFractionText = (fraction: number): string => {
        return `1/${fraction}`;
    };
    const fractionOptions = Array.from({length: 16}, (_, index) => index + 1);

    const handleSaveImageSizeFractions = async () => {
        const hasChanged = thumbnailSizeFractionEdit !== thumbnailSizeFraction
            || previewSizeFractionEdit !== previewSizeFraction;

        if (!hasChanged) {
            setSizeFractionsStatus('Ingen endringer å lagre.');
            setTimeout(() => setSizeFractionsStatus(undefined), 5000);
            return;
        }

        setIsSavingSizeFractions(true);
        setSizeFractionsStatus(undefined);

        try {
            setThumbnailSizeFraction(thumbnailSizeFractionEdit);
            setPreviewSizeFraction(previewSizeFractionEdit);
            await invoke('set_image_size_fractions', {
                thumbnailFraction: thumbnailSizeFractionEdit,
                previewFraction: previewSizeFractionEdit
            });

            if (!scannerPath) {
                setSizeFractionsStatus('Lagret, men ingen skanner mappe valgt for sletting.');
                return;
            }

            const deletedCount = await invoke<number>('delete_all_previews_and_thumbnails', {
                directoryPath: scannerPath
            });
            setSizeFractionsStatus(
                `Lagret. Slettet ${deletedCount} forhåndsvisninger og miniatyrbilder.`
            );
            setDeletePreviewsStatus(undefined);
        } catch (error) {
            console.error('Failed to save size fractions:', error);
            setSizeFractionsStatus(`Feil ved lagring: ${error}`);
        } finally {
            setIsSavingSizeFractions(false);
            setTimeout(() => setSizeFractionsStatus(undefined), 5000);
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
                    <Button type="button" variant="outline" className='w-[24px] h-[24px] p-0' onClick={() => setTextSize(75)} >
                        <ALargeSmall className="!w-[24px] !h-[24px]"/>
                    </Button>

                    <Button type="button" variant="outline" className='w-[32px] h-[32px] p-0' onClick={() => setTextSize(100)} >
                        <ALargeSmall className="!w-[32px] !h-[32px]"/>
                    </Button>

                    <Button type="button" variant="outline" className='w-[40px] h-[40px] p-0' onClick={() => setTextSize(125)} >
                        <ALargeSmall className="!w-[40px] !h-[40px]"/>
                    </Button>

                    <Button type="button" variant="outline" className='w-[48px] h-[48px] p-0' onClick={() => setTextSize(150)} >
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
                <label htmlFor="thumbnailSizeFraction" className="w-32">Miniatyrstørrelse</label>
                <Select
                    value={thumbnailSizeFractionEdit.toString()}
                    onValueChange={(value) => setThumbnailSizeFractionEdit(Number(value))}
                >
                    <SelectTrigger id="thumbnailSizeFraction" className="ml-2 w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {fractionOptions.map((fraction) => (
                            <SelectItem key={`thumbnail-fraction-${fraction}`} value={fraction.toString()}>
                                {getFractionText(fraction)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex mb-2 items-center">
                <label htmlFor="previewSizeFraction" className="w-32">Forhåndsvisning</label>
                <Select
                    value={previewSizeFractionEdit.toString()}
                    onValueChange={(value) => setPreviewSizeFractionEdit(Number(value))}
                >
                    <SelectTrigger id="previewSizeFraction" className="ml-2 w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {fractionOptions.map((fraction) => (
                            <SelectItem key={`preview-fraction-${fraction}`} value={fraction.toString()}>
                                {getFractionText(fraction)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveImageSizeFractions}
                    disabled={isSavingSizeFractions}
                    className="ml-2"
                >
                    {isSavingSizeFractions ? 'Lagrer...' : 'Lagre størrelser'}
                </Button>
                {sizeFractionsStatus && (
                    <p className={`ml-2 ${sizeFractionsStatus.startsWith('Feil') ? 'text-red-500' : 'text-green-500'}`}>
                        {sizeFractionsStatus}
                    </p>
                )}
            </div>

            <div className="flex mb-6 ml-32">
                <span className="ml-2 text-xs text-muted-foreground">
                    Ved endring av disse størrelsene slettes alle eksisterende forhåndsvisninger og miniatyrbilder automatisk.
                </span>
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
