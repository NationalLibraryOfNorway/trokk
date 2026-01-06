use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const EVENT_NAME: &str = "job-status";
const MAX_JOBS: usize = 100;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobState {
    Queued,
    Running,
    Done,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobKind {
    Thumbnail,
    Preview,
    DirectoryWebp,
    Rotate,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStatus {
    pub id: String,
    pub path: String,
    pub kind: JobKind,
    pub state: JobState,
    pub error: Option<String>,
}

#[derive(Default)]
pub struct JobTracker {
    inner: Mutex<Vec<JobStatus>>,
}

impl JobTracker {
    pub fn enqueue(&self, app: &AppHandle, path: String, kind: JobKind) -> String {
        let id = Uuid::new_v4().to_string();
        let status = JobStatus {
            id: id.clone(),
            path,
            kind,
            state: JobState::Queued,
            error: None,
        };
        self.insert(status);
        self.broadcast(app);
        id
    }

    pub fn set_state(
        &self,
        app: &AppHandle,
        id: &str,
        state: JobState,
        error: Option<String>,
    ) {
        {
            let mut jobs = self.inner.lock().unwrap();
            if let Some(job) = jobs.iter_mut().find(|j| j.id == id) {
                job.state = state;
                job.error = error;
            }
        }
        self.broadcast(app);
    }

    pub fn list(&self) -> Vec<JobStatus> {
        self.inner.lock().unwrap().clone()
    }

    fn insert(&self, job: JobStatus) {
        let mut jobs = self.inner.lock().unwrap();
        jobs.push(job);
        if jobs.len() > MAX_JOBS {
            let drain_count = jobs.len() - MAX_JOBS;
            jobs.drain(0..drain_count);
        }
    }

    fn broadcast(&self, app: &AppHandle) {
        let snapshot = { self.inner.lock().unwrap().clone() };
        let _ = app.emit(EVENT_NAME, snapshot);
    }
}
