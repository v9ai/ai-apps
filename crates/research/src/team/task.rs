use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Status of a research task.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub enum TaskStatus {
    #[default]
    Pending,
    InProgress,
    Completed,
    Failed,
}

/// Priority level for task scheduling. Higher priority tasks are claimed first.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum TaskPriority {
    Low = 0,
    Normal = 1,
    Critical = 2,
}

impl Default for TaskPriority {
    fn default() -> Self {
        Self::Normal
    }
}

/// Progress of a research task as reported by the worker.
#[derive(Clone, Debug)]
pub struct TaskProgress {
    /// Percentage complete (0..=100).
    pub percent: u8,
    /// Optional description of current phase.
    pub phase: Option<String>,
    /// When progress was last updated.
    pub updated_at: Instant,
}

impl TaskProgress {
    pub fn new(percent: u8, phase: Option<String>) -> Self {
        Self {
            percent: percent.min(100),
            phase,
            updated_at: Instant::now(),
        }
    }
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
    pub priority: TaskPriority,
    /// Number of times this task has been attempted.
    pub attempt: u32,
    /// Maximum retries before giving up (0 = no retry).
    pub max_retries: u32,
    /// When the task was started (set on claim).
    pub started_at: Option<Instant>,
    /// Maximum duration before the task is considered timed out.
    pub timeout: Option<Duration>,
    /// Current progress reported by the worker.
    pub progress: Option<TaskProgress>,
}

impl Default for ResearchTask {
    fn default() -> Self {
        Self {
            id: 0,
            subject: String::new(),
            description: String::new(),
            preamble: String::new(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: Vec::new(),
            result: None,
            priority: TaskPriority::Normal,
            attempt: 0,
            max_retries: 0,
            started_at: None,
            timeout: None,
            progress: None,
        }
    }
}

impl ResearchTask {
    /// Compute retry backoff delay: 2^attempt seconds, capped at 60s.
    pub fn retry_backoff(&self) -> Duration {
        let secs = 2u64.pow(self.attempt.saturating_sub(1)).min(60);
        Duration::from_secs(secs)
    }

    /// Whether this task has exceeded its timeout.
    pub fn is_timed_out(&self) -> bool {
        match (self.started_at, self.timeout) {
            (Some(started), Some(timeout)) => started.elapsed() > timeout,
            _ => false,
        }
    }
}

/// Thread-safe shared task list for the team.
#[derive(Clone)]
pub struct SharedTaskList {
    inner: Arc<Mutex<Vec<ResearchTask>>>,
}

/// Snapshot of overall team progress.
#[derive(Clone, Debug)]
pub struct TeamProgress {
    pub total: usize,
    pub completed: usize,
    pub failed: usize,
    pub in_progress: usize,
    pub pending: usize,
}

impl TeamProgress {
    /// Percentage of tasks in a terminal state (completed or failed).
    pub fn percent_done(&self) -> f64 {
        if self.total == 0 {
            return 100.0;
        }
        ((self.completed + self.failed) as f64 / self.total as f64) * 100.0
    }

    /// Percentage of tasks successfully completed.
    pub fn percent_succeeded(&self) -> f64 {
        if self.total == 0 {
            return 100.0;
        }
        (self.completed as f64 / self.total as f64) * 100.0
    }
}

impl SharedTaskList {
    pub fn new(tasks: Vec<ResearchTask>) -> Self {
        Self {
            inner: Arc::new(Mutex::new(tasks)),
        }
    }

    /// Atomically claim the next unblocked, unassigned task.
    /// Higher-priority tasks are claimed first. Returns `None` if no task is available.
    pub fn claim(&self, worker_id: &str) -> Option<ResearchTask> {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());

        // Collect resolved (completed or failed) task IDs for dependency checks.
        // Failed tasks count as resolved so downstream tasks (e.g. synthesis)
        // can proceed with partial results instead of deadlocking.
        let resolved: Vec<usize> = tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Completed || t.status == TaskStatus::Failed)
            .map(|t| t.id)
            .collect();

        // Find the highest-priority pending task whose dependencies are all resolved.
        let idx = tasks
            .iter()
            .enumerate()
            .filter(|(_, t)| {
                t.status == TaskStatus::Pending
                    && t.dependencies.iter().all(|dep| resolved.contains(dep))
            })
            .max_by_key(|(_, t)| t.priority)
            .map(|(i, _)| i)?;

        tasks[idx].status = TaskStatus::InProgress;
        tasks[idx].owner = Some(worker_id.to_string());
        tasks[idx].started_at = Some(Instant::now());
        Some(tasks[idx].clone())
    }

    /// Mark a task as completed with its result.
    pub fn complete(&self, task_id: usize, result: String) {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
            task.status = TaskStatus::Completed;
            task.result = Some(result);
            task.progress = Some(TaskProgress::new(100, Some("done".into())));
        }
    }

    /// Mark a task as failed. If retries remain, resets to Pending with incremented
    /// attempt count and returns `Some(backoff_duration)` for the caller to wait.
    /// Returns `None` if the task is permanently failed (no retries left).
    pub fn fail(&self, task_id: usize, error: String) -> Option<Duration> {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
            task.attempt += 1;
            if task.attempt <= task.max_retries {
                let backoff = task.retry_backoff();
                task.status = TaskStatus::Pending;
                task.owner = None;
                task.started_at = None;
                task.progress = None;
                task.result = Some(format!("RETRY({}): {error}", task.attempt));
                Some(backoff)
            } else {
                task.status = TaskStatus::Failed;
                task.result = Some(format!("FAILED: {error}"));
                None
            }
        } else {
            None
        }
    }

    /// Update the progress of an in-progress task.
    pub fn update_progress(&self, task_id: usize, percent: u8, phase: Option<String>) {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(task) = tasks.iter_mut().find(|t| t.id == task_id) {
            task.progress = Some(TaskProgress::new(percent, phase));
        }
    }

    /// Check for timed-out tasks. Returns IDs of tasks that were timed out and
    /// marks them as failed (or schedules retry if retries remain).
    pub fn check_timeouts(&self) -> Vec<(usize, Option<Duration>)> {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let mut timed_out = Vec::new();

        for task in tasks.iter_mut() {
            if task.status == TaskStatus::InProgress && task.is_timed_out() {
                task.attempt += 1;
                if task.attempt <= task.max_retries {
                    let backoff = task.retry_backoff();
                    task.status = TaskStatus::Pending;
                    task.owner = None;
                    task.started_at = None;
                    task.progress = None;
                    task.result = Some(format!("TIMEOUT_RETRY({})", task.attempt));
                    timed_out.push((task.id, Some(backoff)));
                } else {
                    task.status = TaskStatus::Failed;
                    task.result = Some("FAILED: task timed out".into());
                    timed_out.push((task.id, None));
                }
            }
        }
        timed_out
    }

    /// Get a snapshot of overall team progress.
    pub fn progress(&self) -> TeamProgress {
        let tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let total = tasks.len();
        let completed = tasks.iter().filter(|t| t.status == TaskStatus::Completed).count();
        let failed = tasks.iter().filter(|t| t.status == TaskStatus::Failed).count();
        let in_progress = tasks.iter().filter(|t| t.status == TaskStatus::InProgress).count();
        let pending = tasks.iter().filter(|t| t.status == TaskStatus::Pending).count();
        TeamProgress { total, completed, failed, in_progress, pending }
    }

    /// Return all completed findings as (subject, result) pairs.
    pub fn completed_findings(&self) -> Vec<(String, String)> {
        let tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
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

    /// Return completed findings only for the given dependency IDs.
    pub fn completed_findings_for(&self, dep_ids: &[usize]) -> Vec<(String, String)> {
        let tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        tasks
            .iter()
            .filter(|t| dep_ids.contains(&t.id) && t.status == TaskStatus::Completed)
            .filter_map(|t| {
                t.result
                    .as_ref()
                    .map(|r| (t.subject.clone(), r.clone()))
            })
            .collect()
    }

    /// Return all completed tasks as (id, subject, result) triples.
    pub fn completed_tasks(&self) -> Vec<(usize, String, String)> {
        let tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
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
        let tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        tasks
            .iter()
            .all(|t| t.status == TaskStatus::Completed || t.status == TaskStatus::Failed)
    }

    /// Resume from previously saved results. For each saved file matching
    /// `agent-{id:02}-{subject}.md` in `dir`, mark the task as completed
    /// with the file contents as the result. Returns the count of resumed tasks.
    pub fn resume_from_dir(&self, dir: &str) -> usize {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let mut resumed = 0;
        for task in tasks.iter_mut() {
            if task.status != TaskStatus::Pending {
                continue;
            }
            // Try both 2-digit and 3-digit padding patterns
            let candidates = [
                format!("{dir}/agent-{:02}-{}.md", task.id, task.subject),
                format!("{dir}/agent-{:03}-{}.md", task.id, task.subject),
            ];
            for path in &candidates {
                if let Ok(content) = std::fs::read_to_string(path) {
                    if !content.is_empty() {
                        task.status = TaskStatus::Completed;
                        task.result = Some(content);
                        task.owner = Some("resumed".into());
                        resumed += 1;
                        break;
                    }
                }
            }
        }
        resumed
    }

    /// Reset failed tasks back to Pending so they can be retried.
    pub fn reset_failed(&self) -> usize {
        let mut tasks = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        let mut count = 0;
        for task in tasks.iter_mut() {
            if task.status == TaskStatus::Failed {
                task.status = TaskStatus::Pending;
                task.owner = None;
                task.result = None;
                count += 1;
            }
        }
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_task(id: usize, deps: Vec<usize>) -> ResearchTask {
        ResearchTask {
            id,
            subject: format!("task-{id}"),
            description: format!("Description for task {id}"),
            preamble: String::new(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: deps,
            result: None,
            priority: TaskPriority::Normal,
            attempt: 0,
            max_retries: 0,
            timeout: None,
            started_at: None,
            progress: None,
        }
    }

    fn make_task_with_priority(id: usize, priority: TaskPriority) -> ResearchTask {
        ResearchTask {
            priority,
            ..make_task(id, vec![])
        }
    }

    #[test]
    fn claim_returns_tasks_in_priority_order() {
        let tasks = vec![
            make_task_with_priority(1, TaskPriority::Low),
            make_task_with_priority(2, TaskPriority::Critical),
            make_task_with_priority(3, TaskPriority::Normal),
        ];
        let list = SharedTaskList::new(tasks);

        let first = list.claim("w1").unwrap();
        assert_eq!(first.id, 2, "Critical task should be claimed first");

        let second = list.claim("w2").unwrap();
        assert_eq!(second.id, 3, "Normal task should be claimed second");

        let third = list.claim("w3").unwrap();
        assert_eq!(third.id, 1, "Low task should be claimed last");

        assert!(list.claim("w4").is_none(), "No more tasks to claim");
    }

    #[test]
    fn claim_respects_dependencies() {
        let tasks = vec![
            make_task(1, vec![]),
            make_task(2, vec![1]),
            make_task(3, vec![1, 2]),
        ];
        let list = SharedTaskList::new(tasks);

        // Only task 1 is claimable (no deps)
        let t = list.claim("w1").unwrap();
        assert_eq!(t.id, 1);
        assert!(list.claim("w2").is_none(), "task 2 blocked on task 1");

        // Complete task 1 -> task 2 unblocked
        list.complete(1, "done".into());
        let t = list.claim("w2").unwrap();
        assert_eq!(t.id, 2);

        // Task 3 still blocked on task 2
        assert!(list.claim("w3").is_none());

        // Complete task 2 -> task 3 unblocked
        list.complete(2, "done".into());
        let t = list.claim("w3").unwrap();
        assert_eq!(t.id, 3);
    }

    #[test]
    fn failed_deps_unblock_downstream() {
        let tasks = vec![
            make_task(1, vec![]),
            make_task(2, vec![1]),
        ];
        let list = SharedTaskList::new(tasks);

        list.claim("w1").unwrap();
        list.fail(1, "boom".into());

        // Task 2 should still be claimable since failed deps count as resolved
        let t = list.claim("w2").unwrap();
        assert_eq!(t.id, 2);
    }

    #[test]
    fn fail_with_retries_resets_to_pending() {
        let tasks = vec![ResearchTask {
            max_retries: 2,
            ..make_task(1, vec![])
        }];
        let list = SharedTaskList::new(tasks);

        list.claim("w1").unwrap();

        // First failure: should retry
        let backoff = list.fail(1, "err1".into());
        assert!(backoff.is_some(), "should return backoff for retry");

        // Task should be pending again and claimable
        let t = list.claim("w1").unwrap();
        assert_eq!(t.id, 1);
        assert_eq!(t.attempt, 1);

        // Second failure: should retry again
        let backoff = list.fail(1, "err2".into());
        assert!(backoff.is_some());

        let t = list.claim("w1").unwrap();
        assert_eq!(t.attempt, 2);

        // Third failure: max_retries=2, attempt now 3 > 2 -> permanent failure
        let backoff = list.fail(1, "err3".into());
        assert!(backoff.is_none(), "should be permanently failed");
        assert!(list.claim("w1").is_none());
    }

    #[test]
    fn retry_backoff_increases_exponentially() {
        let mut task = make_task(1, vec![]);
        task.attempt = 1;
        assert_eq!(task.retry_backoff(), Duration::from_secs(1));
        task.attempt = 2;
        assert_eq!(task.retry_backoff(), Duration::from_secs(2));
        task.attempt = 3;
        assert_eq!(task.retry_backoff(), Duration::from_secs(4));
        task.attempt = 4;
        assert_eq!(task.retry_backoff(), Duration::from_secs(8));
        // Cap at 60s
        task.attempt = 10;
        assert_eq!(task.retry_backoff(), Duration::from_secs(60));
    }

    #[test]
    fn timeout_detection() {
        let tasks = vec![ResearchTask {
            timeout: Some(Duration::from_millis(1)),
            ..make_task(1, vec![])
        }];
        let list = SharedTaskList::new(tasks);

        list.claim("w1").unwrap();
        // Wait for timeout to elapse
        std::thread::sleep(Duration::from_millis(5));

        let timed_out = list.check_timeouts();
        assert_eq!(timed_out.len(), 1);
        assert_eq!(timed_out[0].0, 1);
        assert!(timed_out[0].1.is_none(), "no retries -> permanent failure");
    }

    #[test]
    fn timeout_with_retries() {
        let tasks = vec![ResearchTask {
            timeout: Some(Duration::from_millis(1)),
            max_retries: 1,
            ..make_task(1, vec![])
        }];
        let list = SharedTaskList::new(tasks);

        list.claim("w1").unwrap();
        std::thread::sleep(Duration::from_millis(5));

        let timed_out = list.check_timeouts();
        assert_eq!(timed_out.len(), 1);
        assert!(timed_out[0].1.is_some(), "should retry on first timeout");

        // Task should be claimable again
        let t = list.claim("w2").unwrap();
        assert_eq!(t.id, 1);
        assert_eq!(t.attempt, 1);
    }

    #[test]
    fn progress_reporting() {
        let tasks = vec![
            make_task(1, vec![]),
            make_task(2, vec![]),
            make_task(3, vec![]),
            make_task(4, vec![]),
        ];
        let list = SharedTaskList::new(tasks);

        let p = list.progress();
        assert_eq!(p.total, 4);
        assert_eq!(p.pending, 4);
        assert_eq!(p.percent_done(), 0.0);

        list.claim("w1");
        let p = list.progress();
        assert_eq!(p.in_progress, 1);
        assert_eq!(p.pending, 3);

        list.complete(1, "done".into());
        let p = list.progress();
        assert_eq!(p.completed, 1);
        assert_eq!(p.percent_done(), 25.0);
        assert_eq!(p.percent_succeeded(), 25.0);

        list.claim("w2");
        list.fail(2, "err".into());
        let p = list.progress();
        assert_eq!(p.completed, 1);
        assert_eq!(p.failed, 1);
        assert_eq!(p.percent_done(), 50.0);
        assert_eq!(p.percent_succeeded(), 25.0);
    }

    #[test]
    fn update_progress_on_task() {
        let tasks = vec![make_task(1, vec![])];
        let list = SharedTaskList::new(tasks);
        list.claim("w1");

        list.update_progress(1, 50, Some("searching".into()));
        let p = {
            let tasks = list.inner.lock().unwrap();
            tasks[0].progress.clone()
        };
        let p = p.unwrap();
        assert_eq!(p.percent, 50);
        assert_eq!(p.phase.as_deref(), Some("searching"));
    }

    #[test]
    fn all_done_with_mixed_terminal_states() {
        let tasks = vec![
            make_task(1, vec![]),
            make_task(2, vec![]),
        ];
        let list = SharedTaskList::new(tasks);

        assert!(!list.all_done());
        list.claim("w1");
        list.complete(1, "ok".into());
        assert!(!list.all_done());
        list.claim("w2");
        list.fail(2, "err".into());
        assert!(list.all_done());
    }

    #[test]
    fn reset_failed_clears_state() {
        let tasks = vec![make_task(1, vec![]), make_task(2, vec![])];
        let list = SharedTaskList::new(tasks);

        list.claim("w1");
        list.claim("w2");
        list.fail(1, "err".into());
        list.complete(2, "ok".into());

        let count = list.reset_failed();
        assert_eq!(count, 1);

        // Task 1 should be claimable again
        let t = list.claim("w3").unwrap();
        assert_eq!(t.id, 1);
    }

    #[test]
    fn claim_sets_started_at() {
        let tasks = vec![make_task(1, vec![])];
        let list = SharedTaskList::new(tasks);
        let t = list.claim("w1").unwrap();
        assert!(t.started_at.is_some());
    }

    #[test]
    fn empty_task_list_is_all_done() {
        let list = SharedTaskList::new(vec![]);
        assert!(list.all_done());
        let p = list.progress();
        assert_eq!(p.percent_done(), 100.0);
    }

    #[test]
    fn priority_ordering() {
        assert!(TaskPriority::Critical > TaskPriority::Normal);
        assert!(TaskPriority::Normal > TaskPriority::Low);
        assert_eq!(TaskPriority::default(), TaskPriority::Normal);
    }

    #[test]
    fn concurrent_claims_are_exclusive() {
        let tasks = vec![make_task(1, vec![])];
        let list = SharedTaskList::new(tasks);

        let t1 = list.claim("w1");
        let t2 = list.claim("w2");

        assert!(t1.is_some());
        assert!(t2.is_none(), "same task should not be claimed twice");
    }
}
