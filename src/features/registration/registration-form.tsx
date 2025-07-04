import React, {useEffect, useState} from 'react';
import {MaterialType} from '../../model/registration-enums';
import {invoke} from '@tauri-apps/api/core';
import {AllTransferProgress, TransferProgress} from '../../model/transfer-progress';
import {useTrokkFiles} from '../../context/trokk-files-context.tsx';
import {SubmitHandler, useForm} from 'react-hook-form';
import {RegistrationFormProps} from './registration-form-props.tsx';
import {usePostRegistration} from '../../context/post-registration-context.tsx';
import LoadingSpinner from '../../components/ui/loading-spinner.tsx';
import {useMessage} from '../../context/message-context.tsx';
import {useUploadProgress} from '../../context/upload-progress-context.tsx';
import type {Event} from '@tauri-apps/api/event';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import {useSecrets} from '../../context/secret-context.tsx';
import {useSelection} from '../../context/selection-context.tsx';


const RegistrationForm: React.FC = () => {

    const {state} = useTrokkFiles();
    const { checkedItems } = useSelection();
    const {allUploadProgress, setAllUploadProgress} = useUploadProgress();
    const {postRegistration} = usePostRegistration();
    const {errorMessage, handleError, successMessage, removeMessages} = useMessage();
    const [barWidth, setBarWidth] = useState(0);
    const appWindow = getCurrentWebviewWindow();
    const {secrets} = useSecrets();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const {
        register,
        handleSubmit,
        setValue,
        resetField
    } = useForm<RegistrationFormProps>({
        disabled,
        defaultValues: {
            materialType: MaterialType.NEWSPAPER,
            font: 'ANTIQUA',
            language: 'NOB',
            workingTitle: ''
        }
    });


    useEffect(() => {
        if (checkedItems.length > 0) {
            handleError('');
        }
    }, [checkedItems]);

    useEffect(() => {
        setDisabled(state.current?.path === undefined);

        const unlistenProgress = appWindow.listen('transfer_progress', (event: Event<TransferProgress>) => {
            setAllUploadProgress(progress => ({
                ...progress,
                dir: {
                    ...progress.dir,
                    [event.payload.directory]: event.payload
                }
            }));
        });

        return () => {
            unlistenProgress.then((unlisten) => unlisten());
        };
    }, [secrets]);

    const onSubmit: SubmitHandler<RegistrationFormProps> = async (registration: RegistrationFormProps) => {
        if (checkedItems.length > 0) {
            setIsSubmitting(true);
            setDisabled(true);
            await invoke<string>('get_hostname')
                .then(async hostname => await postRegistration(hostname, registration))
                .catch(error => {
                    console.error(error);
                })
                .finally(() => setIsSubmitting(false));
        } else {
            handleError('Velg forsider før du kan gå videre!');
        }
    };

    useEffect(() => {
        if (state.current?.path === undefined) {
            setDisabled(true);
            resetField('materialType');
            resetField('font');
            resetField('language');
            setValue('workingTitle', state.current ? state.current.name : '');
            removeMessages();
            setBarWidth(0);
        } else {
            const currentUploadProgress = state.current?.path && allUploadProgress?.dir?.[state.current.path];
            if (currentUploadProgress) {
                setBarWidthFromProgress(allUploadProgress);
                setIsSubmitting(true);
                setDisabled(true);
            } else {
                setBarWidth(0);
                setIsSubmitting(false);
                setDisabled(false);
                resetField('materialType');
                resetField('font');
                resetField('language');
                setValue('workingTitle', state.current ? state.current.name : '');
            }
        }

    }, [state.current]);

    useEffect(() => {
        setBarWidthFromProgress(allUploadProgress);
    }, [allUploadProgress]);

    useEffect(() => {
        removeMessages();
    }, [state.current?.path]);

    const setBarWidthFromProgress = (progress: AllTransferProgress) => {
        if (!state.current?.path || !progress.dir[state.current?.path]) {
            setBarWidth(0);
            return;
        }
        const currentProgress = progress.dir[state.current.path];
        if (currentProgress) {
            setBarWidth((currentProgress.pageNr / currentProgress.totalPages) * 100);
        }
        if (barWidth === 100) {
            const usedPath = state.current.path;
            setIsSubmitting(false);
            setTimeout(() => delete progress.dir[usedPath], 5000);
        }
    };

    return (
        <form className="flex flex-col w-80 m-4" onSubmit={handleSubmit(onSubmit)}>
            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label className="text-stone-100">Materialtype</label>
                <select
                    {...register('materialType')}
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

            <div className={`flex flex-row mb-4 space-x-5 ${disabled ? 'opacity-30' : ''}`}>
                <label>
                    <input
                        type="radio"
                        {...register('font')}
                        className="accent-amber-400"
                        value={'ANTIQUA'}
                    />{' '}
                    Antiqua
                </label>
                <label>
                    <input
                        type="radio"
                        {...register('font')}
                        className="accent-amber-400"
                        value={'FRAKTUR'}
                    />{' '}
                    Fraktur
                </label>
            </div>

            <div className={`flex flex-row mb-4 space-x-5 ${disabled ? 'opacity-30' : ''}`}>
                <label>
                    <input
                        type="radio"
                        {...register('language')}
                        className="accent-amber-400"
                        value={'NOB'}
                    />{' '}
                    Norsk
                </label>
                <label>
                    <input
                        type="radio"
                        {...register('language')}
                        className="accent-amber-400"
                        value={'SME'}
                    />{' '}
                    Samisk
                </label>
            </div>

            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label htmlFor="workingTitle">Arbeidstittel (Blir ikke brukt i produksjon)</label>
                <input
                    type="text"
                    id="workingTitle"
                    {...register('workingTitle')}
                />
            </div>
            <p className="mb-4 font-semibold">
                {checkedItems.length} forside{checkedItems.length !== 1 ? 'r' : ''} valgt
            </p>
            <div className={`flex ${disabled ? 'opacity-30' : ''}`}>
                <button disabled={disabled || isSubmitting} type="submit"
                        className="w-full flex items-center justify-center">
                    {isSubmitting ? (
                        <LoadingSpinner size={24}/>
                    ) : (
                        'TRØKK!'
                    )}
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