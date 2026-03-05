// ═══════════════════════════════════════════════════════════════════════════
// MODULE: types — Re-exports from shared deepseek crate + SDD-agent-specific types
// ═══════════════════════════════════════════════════════════════════════════

use serde::Serialize;
use std::collections::HashMap;

// Re-export all DeepSeek types from shared crate
pub use deepseek::types::{
    DeepSeekModel, ChatMessage, ChatContent, ChatRequest, ChatResponse,
    ToolCall, FunctionCall, ToolSchema, FunctionSchema, Choice, UsageInfo,
    AgentResult, AgentDefinition, EffortLevel,
    system_msg, user_msg, assistant_msg, tool_result_msg,
};

// ── API Response (sdd-agent-specific) ────────────────────────────────────

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self { ok: true, data: Some(data), error: None }
    }
}

pub fn error_response(msg: &str) -> worker::Result<worker::Response> {
    worker::Response::from_json(&serde_json::json!({
        "ok": false, "error": msg
    }))
}

// ── SDD Domain Types (duplicated from sdd crate for WASM — no workspace) ─

#[derive(Debug, Clone, Serialize, serde::Deserialize, PartialEq, Eq, Hash)]
pub enum HookEvent {
    PreToolUse,
    PostToolUse,
    PostToolUseFailure,
    SessionStart,
    SessionEnd,
    SubagentStart,
    SubagentStop,
    PrePhase,
    PostPhase,
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct HookInput {
    pub event: HookEvent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_input: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_output: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phase_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub agent_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct HookOutput {
    #[serde(default)]
    pub allow: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deny_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_context: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_input: Option<serde_json::Value>,
}

impl Default for HookOutput {
    fn default() -> Self {
        Self { allow: true, deny_reason: None, additional_context: None, modified_input: None }
    }
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct Session {
    pub id: String,
    pub messages: Vec<ChatMessage>,
    pub agent_name: String,
    pub model: DeepSeekModel,
    pub created_at: String,
    pub updated_at: String,
    pub turn_count: u32,
    pub total_usage: UsageInfo,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, serde::Deserialize)]
pub enum SddPhase {
    Explore, Propose, Spec, Design, Tasks, Apply, Verify, Archive,
}

impl SddPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Explore => "explore", Self::Propose => "propose",
            Self::Spec => "spec", Self::Design => "design",
            Self::Tasks => "tasks", Self::Apply => "apply",
            Self::Verify => "verify", Self::Archive => "archive",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "explore" => Some(Self::Explore), "propose" => Some(Self::Propose),
            "spec" => Some(Self::Spec), "design" => Some(Self::Design),
            "tasks" => Some(Self::Tasks), "apply" => Some(Self::Apply),
            "verify" => Some(Self::Verify), "archive" => Some(Self::Archive),
            _ => None,
        }
    }

    pub fn dependencies(&self) -> &[SddPhase] {
        match self {
            Self::Explore | Self::Propose => &[],
            Self::Spec => &[Self::Propose], Self::Design => &[Self::Propose],
            Self::Tasks => &[Self::Spec, Self::Design],
            Self::Apply => &[Self::Tasks],
            Self::Verify => &[Self::Apply], Self::Archive => &[Self::Verify],
        }
    }

    pub fn parallel_with(&self) -> &[SddPhase] {
        match self {
            Self::Spec => &[Self::Design], Self::Design => &[Self::Spec],
            _ => &[],
        }
    }
}

#[derive(Debug, Clone, Serialize, serde::Deserialize)]
pub struct SddChange {
    pub name: String,
    pub description: String,
    #[serde(default)]
    pub phases_completed: Vec<SddPhase>,
    #[serde(default)]
    pub phases_in_progress: Vec<SddPhase>,
    #[serde(default)]
    pub artifacts: HashMap<String, serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, serde::Deserialize, PartialEq)]
pub enum PermissionMode {
    Default, AcceptEdits, BypassPermissions, Plan, DontAsk,
}

impl Default for PermissionMode {
    fn default() -> Self { Self::Default }
}
