import {JobStatus} from '@/model/job';
import {useJobs} from '@/context/job-context';
import {Loader2, CheckCircle2, AlertTriangle, Clock, ChevronDown, ChevronRight} from 'lucide-react';
import {useState} from 'react';

const stateIcon = (state: JobStatus['state']) => {
    switch (state) {
    case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
    case 'queued':
        return <Clock className="h-4 w-4 text-stone-300" />;
    case 'done':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
    default:
        return null;
    }
};

const kindLabel = (kind: JobStatus['kind']) => {
    switch (kind) {
    case 'thumbnail':
        return 'Oppretter miniatyrbilde';
    case 'preview':
        return 'Oppretter forhåndsvisning';
    case 'directory_webp':
        return 'Lese mappe';
    case 'rotate':
        return 'Roterer bilde';
    default:
        return kind;
    }
};

const stateLabel = (state: JobStatus['state']) => {
    switch (state) {
    case 'queued':
        return 'Venter';
    case 'running':
        return 'Kjører';
    case 'done':
        return 'Ferdig';
    case 'failed':
        return 'Feil';
    default:
        return state;
    }
};

export default function JobQueue() {
    const {jobs} = useJobs();
    const [open, setOpen] = useState(true);
    const hasActive = jobs.some((job) => job.state === 'queued' || job.state === 'running');
    const visible = jobs.length > 0;

    if (!visible) return null;

    const latestJobs = [...jobs].reverse().slice(0, 10);

    return (
        <div className="w-full mt-auto">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex w-full items-center justify-between bg-stone-900/80 border-l border-stone-700 px-3 py-2 text-stone-100"
            >
                <div className="flex items-center gap-2">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="text-sm font-semibold">Filoperasjoner</span>
                </div>
                {!open && hasActive ? <Loader2 className="h-4 w-4 animate-spin text-amber-300" /> : null}
            </button>
            {open && (
                <div className="w-full bg-stone-800/70 border-l border-stone-700 border-t text-stone-100 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-400">Siste {latestJobs.length}</span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {latestJobs.map((job) => (
                            <div
                                key={job.id}
                                className="flex items-start gap-2 rounded-md bg-stone-900/60 px-3 py-2 border border-stone-700"
                                title={job.path}
                            >
                                <span className="mt-0.5">{stateIcon(job.state)}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">{job.path}</div>
                                    <div className="text-[11px] text-stone-400 flex items-center gap-2">
                                        <span>{kindLabel(job.kind)}</span>
                                        <span className="text-stone-600">•</span>
                                        <span className={job.state === 'failed' ? 'text-red-400' : ''}>{stateLabel(job.state)}</span>
                                        {job.error ? (
                                            <>
                                                <span className="text-stone-600">•</span>
                                                <span className="text-red-300 truncate">{job.error}</span>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
