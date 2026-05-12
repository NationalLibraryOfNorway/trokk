import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog.tsx';
import {Button} from '@/components/ui/button.tsx';
import type {StoredError} from '@/model/error-log-entry.ts';
import ErrorLogPanel from '@/features/error-log/error-log-panel.tsx';

interface ErrorLogModalProps {
    entries: StoredError[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ErrorLogModal = ({entries, open, onOpenChange}: ErrorLogModalProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="grid h-[min(85vh,900px)] w-[min(96vw,72rem)] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
                <DialogHeader className="gap-2">
                    <DialogTitle>Feillogg</DialogTitle>
                    <DialogDescription className="text-sm leading-6 text-muted-foreground">
                        Se de siste lagrede feilene og eventuelle detaljer for feilsøking.
                    </DialogDescription>
                </DialogHeader>

                <div className="h-full min-h-0 overflow-hidden">
                    <ErrorLogPanel entries={entries} />
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Lukk
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ErrorLogModal;
