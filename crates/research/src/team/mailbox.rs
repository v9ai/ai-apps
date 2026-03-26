use tokio::sync::broadcast;

/// Structured status update from a worker.
#[derive(Clone, Debug)]
pub struct StatusReport {
    pub task_id: usize,
    pub phase: StatusPhase,
    pub message: String,
}

/// Phase of a task's lifecycle, used for structured status tracking.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum StatusPhase {
    Started,
    Progress { percent: u8 },
    Retrying { attempt: u32, backoff_secs: u64 },
    TimedOut,
    Completed,
    Failed,
}

/// Kind of message exchanged between teammates.
#[derive(Clone, Debug)]
pub enum MessageKind {
    Finding { task_id: usize, summary: String },
    StatusUpdate(String),
    Status(StatusReport),
    Error(String),
}

/// A message sent on the team broadcast channel.
#[derive(Clone, Debug)]
pub struct TeamMessage {
    pub from: String,
    pub kind: MessageKind,
    pub timestamp: std::time::Instant,
}

/// Broadcast mailbox for the team.
#[derive(Clone)]
pub struct Mailbox {
    sender: broadcast::Sender<TeamMessage>,
}

impl Mailbox {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn send(&self, msg: TeamMessage) {
        // Ignore error (no receivers) — this is fine during startup/shutdown.
        let _ = self.sender.send(msg);
    }

    /// Send a structured status report.
    pub fn send_status(&self, from: &str, report: StatusReport) {
        self.send(TeamMessage {
            from: from.to_string(),
            kind: MessageKind::Status(report),
            timestamp: std::time::Instant::now(),
        });
    }

    pub fn subscribe(&self) -> broadcast::Receiver<TeamMessage> {
        self.sender.subscribe()
    }
}
