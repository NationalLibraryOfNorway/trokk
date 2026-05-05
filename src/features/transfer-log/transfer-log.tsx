import React, {useState} from 'react';
import {TransferLogItem} from '@/model/transfer-log-item.ts';
import {useTransferLog} from '@/context/transfer-log-context.tsx';
import {Check, ClipboardCopy} from 'lucide-react';
import {useMessage} from '@/context/message-context.tsx';
import {getErrorMessage} from '@/lib/utils.ts';

const TransferLog: React.FC = () => {
    const {logs} = useTransferLog();
    const {handleFrontendError} = useMessage();
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(null), 5000);
        }).catch(err => {
            const stackTrace = err instanceof Error ? err.stack : undefined;
            setCopiedIndex((previous) => previous === index ? null : previous);
            handleFrontendError({
                message: 'Kunne ikke kopiere logg-ID-en.',
                fallbackMessage: 'Kunne ikke kopiere logg-ID-en.',
                detail: getErrorMessage(err),
                stackTrace,
                logs: stackTrace ? [stackTrace] : [],
            });
        });
    };

    const latestTimestamp = logs.length > 0
        ? Math.max(...logs.map(log => log.timestamp.getTime()))
        : null;

    return (
        <div className="h-full w-full max-w-full p-4">
            <h2 className="text-xl font-bold mb-4 text-stone-100">Overføringslogg</h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full bg-stone-800 border border-stone-700">
                    <thead>
                    <tr className="border-b">
                        <th className="px-4 py-2 text-stone-100 text-left">Tid</th>
                        <th className="px-4 py-2 text-stone-100">ID</th>
                        <th className="px-4 py-2 text-stone-100 text-right">Sider</th>
                    </tr>
                    </thead>
                    <tbody>
                    {logs.map((log: TransferLogItem, index: number) => (
                        <tr key={index} className={`hover:bg-stone-700 border-b ${
        log.timestamp.getTime() === latestTimestamp ? 'bg-green-800/50 font-bold' : ''}`}>
                            <td className="px-4 py-2 text-stone-100 whitespace-nowrap">{log.timestamp.toTimeString().slice(0, 8)}</td>
                            <td
                                data-state={copiedIndex === index ? 'copied' : 'idle'}
                                className="px-4 py-2 text-stone-100 cursor-pointer relative flex justify-center"
                                onClick={() => copyToClipboard(log.uuid, index)}
                                title="Klikk for å kopiere"
                            >
                                {copiedIndex === index ? (
                                    <Check/>
                                ) : (
                                    <ClipboardCopy/>
                                )}
                            </td>
                            <td className="px-4 py-2 text-stone-100 text-right whitespace-nowrap">{log.pages}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransferLog;
