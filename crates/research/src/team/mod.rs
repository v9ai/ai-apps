//! Multi-agent team orchestration for parallel research.
//!
//! A [`TeamLead`] spawns [`Teammate`] agents that claim tasks from a
//! [`SharedTaskList`], run LLM tool-use loops, and report findings via a
//! broadcast [`Mailbox`]. After all tasks complete (or fail), the lead
//! synthesises findings into a single report.

pub mod lead;
pub mod mailbox;
pub mod task;
pub mod teammate;

pub use lead::{TeamConfig, TeamLead, TeamResult};
pub use mailbox::{Mailbox, MessageKind, StatusPhase, StatusReport, TeamMessage};
pub use task::{ResearchTask, SharedTaskList, TaskPriority, TaskProgress, TaskStatus, TeamProgress};
pub use teammate::Teammate;
