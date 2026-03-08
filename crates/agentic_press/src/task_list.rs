/// Shared task list for tracking pipeline task states and dependencies.
///
/// Mirrors the agent-teams pattern: a team lead creates tasks, agents claim
/// and complete them, and `ready_tasks()` returns tasks whose dependencies
/// are all satisfied — enabling N-way parallelism.

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Failed(String),
}

#[derive(Debug)]
pub struct Task {
    pub id: usize,
    pub name: String,
    pub status: TaskStatus,
    pub depends_on: Vec<usize>,
    pub result: Option<String>,
}

#[derive(Debug, Default)]
pub struct TaskList {
    tasks: Vec<Task>,
}

impl TaskList {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a task with dependencies. Returns the assigned task ID.
    pub fn add(&mut self, name: impl Into<String>, depends_on: Vec<usize>) -> usize {
        let id = self.tasks.len();
        self.tasks.push(Task {
            id,
            name: name.into(),
            status: TaskStatus::Pending,
            depends_on,
            result: None,
        });
        id
    }

    /// Mark a task as in-progress. Returns `false` if already claimed or not pending.
    pub fn claim(&mut self, id: usize) -> bool {
        if let Some(task) = self.tasks.get_mut(id) {
            if task.status == TaskStatus::Pending {
                task.status = TaskStatus::InProgress;
                return true;
            }
        }
        false
    }

    /// Mark a task as completed with its result.
    pub fn complete(&mut self, id: usize, result: String) {
        if let Some(task) = self.tasks.get_mut(id) {
            task.status = TaskStatus::Completed;
            task.result = Some(result);
        }
    }

    /// Mark a task as failed with an error message.
    pub fn fail(&mut self, id: usize, error: String) {
        if let Some(task) = self.tasks.get_mut(id) {
            task.status = TaskStatus::Failed(error);
        }
    }

    /// Return IDs of tasks that are Pending and whose dependencies are all Completed.
    pub fn ready_tasks(&self) -> Vec<usize> {
        self.tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Pending)
            .filter(|t| {
                t.depends_on.iter().all(|dep| {
                    self.tasks
                        .get(*dep)
                        .is_some_and(|d| d.status == TaskStatus::Completed)
                })
            })
            .map(|t| t.id)
            .collect()
    }

    /// True when every task is either Completed or Failed.
    pub fn is_all_done(&self) -> bool {
        self.tasks.iter().all(|t| {
            matches!(t.status, TaskStatus::Completed | TaskStatus::Failed(_))
        })
    }

    /// Get a task by ID.
    pub fn get(&self, id: usize) -> Option<&Task> {
        self.tasks.get(id)
    }

    /// Get the result of a completed task.
    pub fn result(&self, id: usize) -> Option<&str> {
        self.tasks
            .get(id)
            .and_then(|t| t.result.as_deref())
    }

    /// Number of tasks.
    pub fn len(&self) -> usize {
        self.tasks.len()
    }

    /// True if empty.
    pub fn is_empty(&self) -> bool {
        self.tasks.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_returns_sequential_ids() {
        let mut tl = TaskList::new();
        assert_eq!(tl.add("a", vec![]), 0);
        assert_eq!(tl.add("b", vec![0]), 1);
        assert_eq!(tl.add("c", vec![0, 1]), 2);
        assert_eq!(tl.len(), 3);
    }

    #[test]
    fn test_ready_tasks_no_deps() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        tl.add("b", vec![]);
        assert_eq!(tl.ready_tasks(), vec![0, 1]);
    }

    #[test]
    fn test_ready_tasks_with_deps() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        tl.add("b", vec![0]);
        // Only "a" is ready — "b" depends on "a".
        assert_eq!(tl.ready_tasks(), vec![0]);

        tl.claim(0);
        // "a" is InProgress, "b" still blocked.
        assert!(tl.ready_tasks().is_empty());

        tl.complete(0, "done".into());
        // Now "b" is ready.
        assert_eq!(tl.ready_tasks(), vec![1]);
    }

    #[test]
    fn test_claim_only_once() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        assert!(tl.claim(0));
        assert!(!tl.claim(0)); // already claimed
    }

    #[test]
    fn test_is_all_done() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        tl.add("b", vec![]);
        assert!(!tl.is_all_done());

        tl.complete(0, "ok".into());
        assert!(!tl.is_all_done());

        tl.fail(1, "err".into());
        assert!(tl.is_all_done());
    }

    #[test]
    fn test_result_retrieval() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        assert!(tl.result(0).is_none());

        tl.complete(0, "hello".into());
        assert_eq!(tl.result(0), Some("hello"));
    }

    #[test]
    fn test_empty_task_list() {
        let tl = TaskList::new();
        assert!(tl.is_empty());
        assert!(tl.is_all_done());
        assert!(tl.ready_tasks().is_empty());
    }

    #[test]
    fn test_diamond_dependency() {
        //   0
        //  / \
        // 1   2
        //  \ /
        //   3
        let mut tl = TaskList::new();
        tl.add("root", vec![]);
        tl.add("left", vec![0]);
        tl.add("right", vec![0]);
        tl.add("join", vec![1, 2]);

        assert_eq!(tl.ready_tasks(), vec![0]);

        tl.complete(0, "r".into());
        let ready = tl.ready_tasks();
        assert_eq!(ready, vec![1, 2]);

        tl.complete(1, "l".into());
        assert!(tl.ready_tasks().is_empty().not());
        // Only task 2 is ready (task 3 needs both 1 and 2).
        assert!(!tl.ready_tasks().contains(&3));

        tl.complete(2, "r".into());
        assert_eq!(tl.ready_tasks(), vec![3]);
    }

    #[test]
    fn test_failed_dependency_blocks_downstream() {
        let mut tl = TaskList::new();
        tl.add("a", vec![]);
        tl.add("b", vec![0]);

        tl.fail(0, "broken".into());
        // "b" depends on "a" which failed — not completed, so "b" stays blocked.
        assert!(tl.ready_tasks().is_empty());
        assert!(tl.is_all_done().not());

        tl.fail(1, "blocked".into());
        assert!(tl.is_all_done());
    }

    // Helper — `!` isn't available on bool directly in older Rust, use this instead.
    trait Not {
        fn not(self) -> Self;
    }
    impl Not for bool {
        fn not(self) -> Self { !self }
    }
}
