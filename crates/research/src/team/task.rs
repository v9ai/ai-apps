use std::sync::{Arc, Mutex};

/// Status of a research task.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
}

/// A single research task assigned to a teammate.
#[derive(Clone, Debug)]
pub struct ResearchTask {
    pub id: usize,
    pub subject: String,
    pub description: String,
    pub preamble: String,
    pub status: TaskStatus,
    pub owner: Option<String>,
    pub dependencies: Vec<usize>,
    pub result: Option<String>,
}

/// Thread-safe shared task list for the team.
#[derive(Clone)]
pub struct SharedTaskList {
    inner: Arc<Mutex<Vec<ResearchTask>>>,
}

impl SharedTaskList {
    pub fn new(tasks: Vec<ResearchTask>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(tasks)),
        }
    }

    /// Atomically claim the next unblocked, unassigned task.
    /// Returns `None` if no task is available right now.
    pub fn claim(&self, worker_id: &str) -> Option<ResearchTask> {
        let mut tasks = self.inner.lock().unwrap();

        // Collect completed task IDs for dependency checks.
        let completed: Vec<usize> = tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Completed)
            .map(|t| t.id)
            .collect();

        // Find first pending task whose dependencies are all completed.
        let idx = tasks.iter().position(|t| {
            t.status == TaskStatus::Pending
                && t.dependencies.iter().all(|dep| completed.contains(dep))
        })?;

        tasks[idx].status = TaskStatus::InProgress;
        tasks[idx].owner = Some(worker_id.to_string());
        Some(tasks[idx].clone())
    }

    /// Mark a task as completed with its result.
    pub fn complete(&self, task_id: usize, result: String) {
        let mut tasks = self.inner.lock().unwrap();
        if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
            task.status = TaskStatus::Completed;
            task.result = Some(result);
        }
    }

    /// Mark a task as failed.
    pub fn fail(&self, task_id: usize, error: String) {
        let mut tasks = self.inner.lock().unwrap();
        if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
            task.status = TaskStatus::Failed;
            task.result = Some(format!("FAILED: {error}"));
        }
    }

    /// Return all completed findings as (subject, result) pairs.
    pub fn completed_findings(&self) -> Vec<(String, String)> {
        let tasks = self.inner.lock().unwrap();
        tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Completed)
            .filter_map(|t| {
                t.result
                    .as_ref()
                    .map(|r| (t.subject.clone(), r.clone()))
            })
            .collect()
    }

    /// Return all completed tasks as (id, subject, result) triples.
    pub fn completed_tasks(&self) -> Vec<(usize, String, String)> {
        let tasks = self.inner.lock().unwrap();
        tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Completed)
            .filter_map(|t| {
                t.result
                    .as_ref()
                    .map(|r| (t.id, t.subject.clone(), r.clone()))
            })
            .collect()
    }

    /// Are all tasks in a terminal state (Completed or Failed)?
    pub fn all_done(&self) -> bool {
        let tasks = self.inner.lock().unwrap();
        tasks
            .iter()
            .all(|t| t.status == TaskStatus::Completed || t.status == TaskStatus::Failed)
    }
}
