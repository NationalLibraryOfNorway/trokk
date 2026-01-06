import React, {createContext, useContext, useEffect, useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow';
import type {UnlistenFn} from '@tauri-apps/api/event';
import {JobStatus} from '@/model/job';

const appWindow = getCurrentWebviewWindow();

interface JobContextType {
    jobs: JobStatus[];
}

const JobContext = createContext<JobContextType | null>(null);

export const JobProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const [jobs, setJobs] = useState<JobStatus[]>([]);

    useEffect(() => {
        invoke<JobStatus[]>('list_jobs').then(setJobs).catch(() => {});

        let unlisten: UnlistenFn | undefined;
        appWindow.listen<JobStatus[]>('job-status', (event) => {
            setJobs(event.payload ?? []);
        }).then((fn) => { unlisten = fn; }).catch(() => {});

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    return (
        <JobContext.Provider value={{jobs}}>
            {children}
        </JobContext.Provider>
    );
};

export const useJobs = () => {
    const ctx = useContext(JobContext);
    if (!ctx) throw new Error('useJobs must be used within JobProvider');
    return ctx;
};

