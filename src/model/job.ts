export type JobState = 'queued' | 'running' | 'done' | 'failed';
export type JobKind = 'thumbnail' | 'preview' | 'directory_webp' | 'rotate';

export interface JobStatus {
    id: string;
    path: string;
    kind: JobKind;
    state: JobState;
    error?: string | null;
}

