import React, { useEffect, useState } from 'react';
import { MaterialType } from '../../model/registration-enums';
import { fetch } from '@tauri-apps/plugin-http';
import { TextInputDto } from '../../model/text-input-dto';
import { invoke } from '@tauri-apps/api/core';
import { settings } from '../../tauri-store/settings';
import { uuidv7 } from 'uuidv7';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAuth} from "../../context/auth-context.tsx";
import { AllTransferProgress, TransferProgress } from '../../model/transfer-progress';
import {useTrokkFiles} from "../../context/trokk-files-context.tsx";
import { useUploadProgress } from '../../context/upload-progress-context.tsx';
import type { Event } from '@tauri-apps/api/event';
import {TextItemResponse} from "../../model/text-input-response.ts";
import {useTransferLog} from "../../context/transfer-log-context.tsx";
import {SecretVariables} from "../../model/secret-variables.ts";

const appWindow = getCurrentWebviewWindow();

const RegistrationForm: React.FC = () => {
    const { state } = useTrokkFiles();
    const { allUploadProgress, setAllUploadProgress } = useUploadProgress();
    const { addLog } = useTransferLog();
    const auth = useAuth();
    const loggedOut = auth?.loggedOut
    const [disabled, setDisabled] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [barWidth, setBarWidth] = useState(0);
    const [materialType, setMaterialType] = useState(MaterialType.NEWSPAPER);
    const [fraktur, setFraktur] = useState(false);
    const [sami, setSami] = useState(false);
    const [name, setName] = useState('');
    const [papiPath, setPapiPath] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const initialize = async () => {
            const secrets = await invoke<SecretVariables>('get_secret_variables');
            setPapiPath(secrets.papiPath);
            setDisabled(state.current?.path === undefined);
        };

        void initialize();

        const unlistenProgress = appWindow.listen('transfer_progress', (event: Event<TransferProgress>) => {
            setAllUploadProgress(progress => ({
                ...progress,
                dir: {
                    ...progress.dir,
                    [event.payload.directory]: event.payload
                }
            }))
        });

        return () => {
            unlistenProgress.then((unlisten) => unlisten());
        };
    }, []);

    useEffect(() => {
        if (state.current?.path === undefined) {
            setDisabled(true);
        } else {
            const currentUploadProgress = allUploadProgress.dir[state.current.path];
            if (currentUploadProgress) {
                setBarWidthFromProgress(allUploadProgress);
                setDisabled(true);
            }
        }
        setDisabled(state.current?.path === undefined)
        setName(state.current ? state.current.name : "")
        setSuccessMessage('')
        setErrorMessage('')
        setBarWidth(0)
    }, [state.current])

    useEffect(() => {
        setBarWidthFromProgress(allUploadProgress)
    }, [allUploadProgress])

    const handleSubmit = async (e: React.FormEvent) => {
        setIsSubmitting(true);
        setDisabled(true);
        e.preventDefault();
        await invoke<string>('get_hostname')
            .then(async hostname => await postRegistration(hostname))
            .catch(error => {
                console.error(error)
            })
            .finally(() => setIsSubmitting(false));
    };

    const postRegistration = async (machineName: string) => {
        if (!state.current?.path) return;
        const pushedDir = state.current?.path;
        const auth = await settings.getAuthResponse();
        if (!auth || loggedOut) return Promise.reject('Not logged in');

        const id = uuidv7().toString();

        const transfer = uploadToS3(id).catch(error => {
            handleError('Fikk ikke lastet opp filene', undefined, error);
            return Promise.reject(error);
        });

        const numberOfPagesTransferred = await transfer;

        const accessToken = await invoke('get_papi_access_token').catch(error => {
            handleError('Kunne ikke hente tilgangsnøkkel for å lagre objektet i databasen.', undefined, error);
            return Promise.reject(error);
        });

        const materialTypeDTO = Object.keys(MaterialType).find((key: string) => MaterialType[key as keyof typeof MaterialType] === materialType)

        return await fetch(`${papiPath}/v2/item`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(new TextInputDto(
                id,
                materialTypeDTO!,
                auth.userInfo.name,
                fraktur ? 'FRAKTUR' : 'ANTIQUA',
                sami ? 'SME' : 'NOB',
                machineName,
                name,
                numberOfPagesTransferred
            ))
        })
            .then(async response => {
                if (response.ok) {
                    void deleteDir(pushedDir);
                    removeErrorMessage();
                    displaySuccessMessage(await response.json() as TextItemResponse); // TODO check
                } else {
                    console.error(response);
                    handleError(undefined, response.status);
                }
            })
            .catch(error => {
                handleError();
                return Promise.reject(error);
            });
    };

    const uploadToS3 = async (id: string): Promise<number> => {
        const filesPath = await settings.getScannerPath();
        if (filesPath === state.current?.path) {
            return Promise.reject('Cannot move files from scanner dir');
        }

        const materialTypeEnum = Object.keys(MaterialType).find(key => MaterialType[key as keyof typeof MaterialType] === materialType);

        return invoke('upload_directory_to_s3', {
            directoryPath: state.current!.path,
            objectId: id,
            materialType: materialTypeEnum,
            appWindow: appWindow
        });
    };

    const deleteDir = async (path: string): Promise<void> => {
        return invoke('delete_dir', { dir: path });
    };

    const handleError = (extra_text?: string, code?: string | number, error?: Error) => {
        let tmpErrorMessage = 'Kunne ikke TRØKKE dette videre.';
        if (extra_text) tmpErrorMessage += ` ${extra_text}`;
        tmpErrorMessage += ' Kontakt tekst-teamet om problemet vedvarer.';
        if (code) tmpErrorMessage += ` (Feilkode ${code})`;

        console.error(tmpErrorMessage, error);
        setErrorMessage(tmpErrorMessage);
    };

    const removeErrorMessage = () => {
        setErrorMessage('');
    };

    function displaySuccessMessage(item: TextItemResponse) {
        setSuccessMessage(`Item "${item.scanInformation.tempName}" sendt til produksjonsløypen med id ${item.id}`);
        const parsedItem = new TextItemResponse(
            item.id,
            item.materialType,
            item.publicationType,
            item.scanInformation,
            item.statistics
        );
        addLog(parsedItem.toTransferLogItem());
    }

    const setBarWidthFromProgress = (progress: AllTransferProgress) => {
        if (!state.current?.path || !progress.dir[state.current?.path]) {
            setBarWidth(0);
            return;
        }
        const currentProgress = progress.dir[state.current!.path];
        if (currentProgress) {
            setBarWidth((currentProgress.pageNr / currentProgress.totalPages) * 100);
        }
        if (barWidth === 100) {
            const usedPath = state.current!.path;
            setIsSubmitting(false);
            setTimeout(() => delete progress.dir[usedPath], 5000);
        }
    };

    return (
        <form className="flex flex-col w-80 m-4" onSubmit={handleSubmit}>
            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label htmlFor="materialType" className="text-stone-100">Materialtype</label>
                <select
                    disabled={disabled}
                    name="materialType"
                    id="materialType"
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                    style={{color: '#000000'}}
                    className={'bg-amber-600'}
                >
                    {Object.values(MaterialType).map((type) => (
                        <option
                            key={type}
                            value={type}
                            className="bg-stone-800 text-amber-500 hover:bg-amber-600 hover:text-stone-900"
                        >
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            <div className={`flex flex-row mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label>
                    <input
                        disabled={disabled}
                        type="radio"
                        checked={!fraktur}
                        onChange={() => setFraktur(false)}
                        className="accent-amber-400"
                    />{' '}
                    Antiqua
                </label>
                <label>
                    <input
                        disabled={disabled}
                        type="radio"
                        checked={fraktur}
                        onChange={() => setFraktur(true)}
                        className="accent-amber-400"
                    />{' '}
                    Fraktur
                </label>
            </div>

            <div className={`flex flex-row mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label>
                    <input
                        disabled={disabled}
                        type="radio"
                        checked={!sami}
                        onChange={() => setSami(false)}
                        className="accent-amber-400"
                    />{' '}
                    Norsk
                </label>
                <label>
                    <input
                        disabled={disabled}
                        type="radio"
                        checked={sami}
                        onChange={() => setSami(true)}
                        className="accent-amber-400"
                    />{' '}
                    Samisk
                </label>
            </div>

            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label htmlFor="workingTitle">Arbeidstittel (Blir ikke brukt i produksjon)</label>
                <input
                    disabled={disabled}
                    type="text"
                    name="workingTitle"
                    id="workingTitle"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>

            <div className={`flex ${disabled ? 'opacity-30' : ''}`}>
                <button disabled={disabled || isSubmitting} type="submit" className="w-full flex items-center justify-center">
                    {isSubmitting ? (
                        <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        ) : (
                            'TRØKK!'
                        )
                    }
                </button>
            </div>

            <div className="mt-2 w-full h-full flex flex-col relative mb-4">
                <span className="absolute z-10 flex justify-center items-center w-full h-6">
                  {barWidth.toFixed(0)}%
                </span>
                <div className="absolute z-0 w-full rounded-full bg-stone-800 h-6 overflow-hidden">
                    <div
                        className="bg-amber-600 h-6 transition-width duration-500"
                        style={{width: `${barWidth}%`}}
                    ></div>
                </div>
            </div>

            {successMessage && <p className="text-green-500 mt-4">{successMessage}</p>}
            {errorMessage && <p className="text-red-600 mt-4">{errorMessage}</p>}
        </form>
    );
};

export default RegistrationForm;