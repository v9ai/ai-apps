use tokio::sync::broadcast;

/// Kind of message exchanged between teammates.
#[derive(Clone, Debug)]
pub enum MessageKind {
    Finding { task_id: usize, summary: String },
    StatusUpdate(String),
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

    pub fn subscribe(&self) -> broadcast::Receiver<TeamMessage> {
        self.sender.subscribe()
    }
}
