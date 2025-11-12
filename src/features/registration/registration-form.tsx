import React, {useEffect, useState} from 'react';
import {MaterialType} from '@/model/registration-enums';
import {invoke} from '@tauri-apps/api/core';
import {AllTransferProgress, TransferProgress} from '@/model/transfer-progress';
import {useTrokkFiles} from '@/context/trokk-files-context.tsx';
import {SubmitHandler, useForm} from 'react-hook-form';
import {RegistrationFormProps} from './registration-form-props.tsx';
import {usePostRegistration} from '@/context/post-registration-context.tsx';
import {useMessage} from '@/context/message-context.tsx';
import {useUploadProgress} from '@/context/upload-progress-context.tsx';
import type {Event} from '@tauri-apps/api/event';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import {useSecrets} from '@/context/secret-context.tsx';
import {useSelection} from '@/context/selection-context.tsx';
import {useRotation} from '@/context/rotation-context.tsx';
import {Button} from '@/components/ui/button.tsx';
import {Progress} from '@/components/ui/progress.tsx';
import {LoaderCircle} from 'lucide-react';

const RegistrationForm: React.FC = () => {
    const {state} = useTrokkFiles();
    const {allUploadProgress, setAllUploadProgress} = useUploadProgress();
    const {secrets} = useSecrets();
    const {checkedItems} = useSelection();
    const {postRegistration} = usePostRegistration();
    const {errorMessage, handleError, successMessage, removeMessages} = useMessage();
    const {hasAnyRotating} = useRotation();
    const [barWidth, setBarWidth] = useState(0);
    const appWindow = getCurrentWebviewWindow();
    const isAnyImageRotating = hasAnyRotating();

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
            removeMessages();
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
        <form className="flex flex-col w-full max-w-full px-4 py-4" onSubmit={handleSubmit(onSubmit)}>
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

            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label className="text-stone-100 mb-2">Skrifttype</label>
                <div className="flex flex-row flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type='radio'
                            {...register('font')}
                            className="accent-amber-400"
                            value={'ANTIQUA'}
                        />
                        Antiqua
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type='radio'
                            {...register('font')}
                            className="accent-amber-400"
                            value={'FRAKTUR'}
                        />
                        Fraktur
                    </label>
                </div>
            </div>

            <div className={`flex flex-col mb-4 ${disabled ? 'opacity-30' : ''}`}>
                <label className="text-stone-100 mb-2">Språk</label>
                <div className="flex flex-row flex-wrap gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type='radio'
                            {...register('language')}
                            className="accent-amber-400"
                            value={'NOB'}
                        />
                        Norsk
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type='radio'
                            {...register('language')}
                            className="accent-amber-400"
                            value={'SME'}
                        />
                        Samisk
                    </label>
                </div>
            </div>
            <p className="mb-4 font-semibold">
                {checkedItems.length} forside{checkedItems.length !== 1 ? 'r' : ''} valgt
            </p>
            <div className={`flex ${disabled || isAnyImageRotating ? 'opacity-30' : ''}`}>
                <Button
                    disabled={disabled || isSubmitting || isAnyImageRotating}
                    type='submit'
                    className="w-full flex items-center justify-center"
                >
                    {isSubmitting ? (
                        <LoaderCircle size={24} className='animate-spin' />
                    ) : (
                        'TRØKK!'
                    )}
                </Button>
            </div>
            {isAnyImageRotating && (
                <p className="text-amber-500 text-sm mt-2">Venter på at bilderotasjon fullføres...</p>
            )}

            <div className="mt-2 w-full h-full flex flex-col relative">
                <div className="flex items-center gap-2">
                    <Progress value={barWidth} className="[&>div]:bg-amber-600 bg-stone-900"/>
                    <div className='text-sm'>{barWidth.toFixed(0)}%</div>
                </div>
            </div>

            {successMessage && <p className="text-green-600 mt-4">{successMessage}</p>}
            {errorMessage && (
                <div className="mt-4">
                    {errorMessage.split('\n').map((line, idx) => (
                        <span key={idx} className="text-red-600 block">
                            {line}
                        </span>
                    ))}
                </div>
            )}
        </form>
    );
};

export default RegistrationForm;
