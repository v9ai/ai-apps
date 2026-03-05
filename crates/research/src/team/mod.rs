pub mod lead;
pub mod mailbox;
pub mod task;
pub mod teammate;

pub use lead::{TeamConfig, TeamLead, TeamResult};
pub use mailbox::{Mailbox, MessageKind, TeamMessage};
pub use task::{ResearchTask, SharedTaskList, TaskStatus};
pub use teammate::Teammate;
