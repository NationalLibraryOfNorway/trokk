import {useMemo, useState} from 'react';
import {StoredError, hasAdvancedErrorDetails} from '@/model/error-log-entry.ts';

interface ErrorLogPanelProps {
    entries: StoredError[];
}

const ErrorLogPanel = ({entries}: ErrorLogPanelProps) => {
    const newestFirstEntries = useMemo(() => {
        return [...entries].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
    }, [entries]);

    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(newestFirstEntries[0]?.id ?? null);

    const selectedEntry = newestFirstEntries.find((entry) => entry.id === selectedEntryId) ?? newestFirstEntries[0];

    if (newestFirstEntries.length === 0) {
        return (
            <div className="rounded-lg border border-stone-700 bg-stone-950/40 p-4 text-sm text-stone-300">
                Ingen feillogg tilgjengelig ennå.
            </div>
        );
    }

    return (
        <div className="grid h-full min-h-0 gap-4 overflow-hidden rounded-lg border border-stone-700 bg-stone-950/40 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden">
                <h3 className="text-sm font-semibold text-stone-50">Siste feil</h3>
                <div className="grid min-h-0 gap-2 overflow-y-auto pr-1">
                    {newestFirstEntries.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            className={`grid gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                selectedEntry?.id === entry.id
                                    ? 'border-amber-500 bg-stone-800 text-stone-50'
                                    : 'border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800'
                            }`}
                            onClick={() => setSelectedEntryId(entry.id)}
                        >
                            <span className="text-xs uppercase tracking-wide text-stone-400">
                                {new Date(entry.occurredAt).toLocaleString('nb-NO')}
                            </span>
                            <span className="line-clamp-2">{entry.userMessage}</span>
                        </button>
                    ))}
                </div>
            </div>

            {selectedEntry && (
                <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-3 overflow-hidden rounded-md border border-stone-700 bg-stone-900 p-4 text-sm text-stone-200">
                    <div className="grid gap-1">
                        <h3 className="text-base font-semibold text-stone-50">Valgt feil</h3>
                        <p className="whitespace-pre-wrap break-words text-stone-200">{selectedEntry.userMessage}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-stone-300">
                        <span className="rounded border border-stone-700 px-2 py-1">
                            Kilde: {selectedEntry.source === 'backend' ? 'Backend' : 'Frontend'}
                        </span>
                        {selectedEntry.code && (
                            <span className="rounded border border-stone-700 px-2 py-1">
                                Feilkode: {selectedEntry.code}
                            </span>
                        )}
                    </div>

                    {hasAdvancedErrorDetails(selectedEntry) ? (
                        <div className="grid min-h-0 content-start gap-3 overflow-y-auto pr-1">
                            {selectedEntry.detail && (
                                <div className="grid gap-1">
                                    <h4 className="font-semibold text-stone-50">Detaljer</h4>
                                    <pre className="whitespace-pre-wrap break-words rounded bg-stone-950 p-3 text-xs">{selectedEntry.detail}</pre>
                                </div>
                            )}
                            {selectedEntry.stackTrace && (
                                <div className="grid gap-1">
                                    <h4 className="font-semibold text-stone-50">Stack trace</h4>
                                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-stone-950 p-3 text-xs">{selectedEntry.stackTrace}</pre>
                                </div>
                            )}
                            {selectedEntry.logs.length > 0 && (
                                <div className="grid gap-1">
                                    <h4 className="font-semibold text-stone-50">Logger</h4>
                                    <div className="grid gap-2">
                                        {selectedEntry.logs.map((logLine, index) => (
                                            <pre key={`${selectedEntry.id}-log-${index}`} className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-stone-950 p-3 text-xs">
                                                {logLine}
                                            </pre>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-stone-400">Ingen avanserte detaljer lagret for denne feilen.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ErrorLogPanel;
