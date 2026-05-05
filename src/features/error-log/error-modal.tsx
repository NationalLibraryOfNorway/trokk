import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog.tsx';
import {Button} from '@/components/ui/button.tsx';
import {useMessage} from '@/context/message-context.tsx';
import {hasAdvancedErrorDetails} from '@/model/error-log-entry.ts';
import {useEffect, useState} from 'react';

const sourceLabel: Record<'frontend' | 'backend', string> = {
    frontend: 'Frontend',
    backend: 'Backend',
};

const ErrorModal = () => {
    const {currentError, dismissErrorModal, isErrorModalOpen} = useMessage();
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        setShowDetails(false);
    }, [currentError?.id]);

    if (!currentError) {
        return null;
    }

    const canShowDetails = hasAdvancedErrorDetails(currentError);

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            dismissErrorModal();
            setShowDetails(false);
        }
    };

    return (
        <Dialog open={isErrorModalOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                className="max-w-2xl rounded-xl border border-red-900 bg-stone-900 text-stone-50"
                onEscapeKeyDown={() => setShowDetails(false)}
            >
                <DialogHeader className="gap-3">
                    <div className="inline-flex w-fit rounded-full border border-red-800 bg-red-950 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-200">
                        Feilmelding
                    </div>
                    <DialogTitle>Noe gikk galt</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-stone-300">
                        {currentError.userMessage}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-wrap gap-2 text-xs text-stone-300">
                    <span className="rounded border border-stone-700 px-2 py-1">
                        Kilde: {sourceLabel[currentError.source]}
                    </span>
                    {currentError.code && (
                        <span className="rounded border border-stone-700 px-2 py-1">
                            Feilkode: {currentError.code}
                        </span>
                    )}
                    <span className="rounded border border-stone-700 px-2 py-1">
                        Tidspunkt: {new Date(currentError.occurredAt).toLocaleString('nb-NO')}
                    </span>
                </div>

                {showDetails && canShowDetails && (
                    <div className="grid gap-4 rounded-lg border border-stone-700 bg-stone-950/70 p-4 text-sm text-stone-200">
                        {currentError.detail && (
                            <section className="grid gap-2">
                                <h3 className="font-semibold text-stone-50">Detaljer</h3>
                                <pre className="whitespace-pre-wrap break-words font-sans text-sm">{currentError.detail}</pre>
                            </section>
                        )}
                        {currentError.stackTrace && (
                            <section className="grid gap-2">
                                <h3 className="font-semibold text-stone-50">Stack trace</h3>
                                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs">{currentError.stackTrace}</pre>
                            </section>
                        )}
                        {currentError.logs.length > 0 && (
                            <section className="grid gap-2">
                                <h3 className="font-semibold text-stone-50">Logger</h3>
                                <div className="grid gap-2">
                                    {currentError.logs.map((logLine, index) => (
                                        <pre key={`${currentError.id}-${index}`} className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-stone-900 p-2 text-xs">
                                            {logLine}
                                        </pre>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {canShowDetails && (
                        <Button
                            type="button"
                            variant="secondary"
                            className="bg-stone-700 hover:bg-stone-600"
                            onClick={() => setShowDetails((previous) => !previous)}
                        >
                            {showDetails ? 'Skjul detaljer' : 'Vis detaljer'}
                        </Button>
                    )}
                    <Button
                        type="button"
                        className="bg-red-700 hover:bg-red-600"
                        onClick={() => handleOpenChange(false)}
                    >
                        Lukk
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ErrorModal;
