use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── DeepSeek Models ───────────────────────────────────────────────────────

/// DeepSeek model identifiers — parity with Anthropic's multi-model routing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DeepSeekModel {
    /// DeepSeek-R1 — Reasoning model (equivalent to Opus for deep thinking)
    #[serde(rename = "deepseek-reasoner")]
    Reasoner,
    /// DeepSeek-V3 — Fast chat model (equivalent to Sonnet for speed)
    #[serde(rename = "deepseek-chat")]
    Chat,
}

impl DeepSeekModel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Reasoner => "deepseek-reasoner",
            Self::Chat => "deepseek-chat",
        }
    }

    pub fn from_alias(alias: &str) -> Self {
        match alias {
            "reasoner" | "r1" | "deep" | "opus" => Self::Reasoner,
            "chat" | "v3" | "fast" | "sonnet" | "haiku" => Self::Chat,
            _ => Self::Chat,
        }
    }
}

impl Default for DeepSeekModel {
    fn default() -> Self { Self::Chat }
}

// ── DeepSeek API Types (OpenAI-compatible) ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: ChatContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning_content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone)]
pub enum ChatContent {
    Text(String),
    Null,
}

impl ChatContent {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Text(s) => s,
            Self::Null => "",
        }
    }
}

impl Serialize for ChatContent {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        match self {
            Self::Text(s) => serializer.serialize_str(s),
            Self::Null => serializer.serialize_none(),
        }
    }
}

impl<'de> Deserialize<'de> for ChatContent {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> std::result::Result<Self, D::Error> {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::String(s) => Ok(Self::Text(s)),
            serde_json::Value::Null => Ok(Self::Null),
            other => Ok(Self::Text(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub r#type: String,
    pub function: FunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<ToolSchema>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSchema {
    pub r#type: String,
    pub function: FunctionSchema,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionSchema {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub choices: Vec<Choice>,
    pub usage: Option<UsageInfo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: ChatMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UsageInfo {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

// ── Agent Result (parity with Anthropic AgentResult) ──────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub success: bool,
    pub result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub turns: u32,
    pub usage: UsageInfo,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls_made: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
}

// ── Agent Definition (parity with Anthropic AgentDefinition) ──────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDefinition {
    pub name: String,
    pub description: String,
    pub prompt: String,
    #[serde(default)]
    pub model: DeepSeekModel,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default)]
    pub disallowed_tools: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_turns: Option<u32>,
}

// ── Hook Types (parity with Anthropic hooks) ──────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

// ── Session Types (parity with Anthropic session management) ──────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
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

// ── SDD Phase Types ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum SddPhase {
    Explore,
    Propose,
    Spec,
    Design,
    Tasks,
    Apply,
    Verify,
    Archive,
}

impl SddPhase {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Explore => "explore",
            Self::Propose => "propose",
            Self::Spec => "spec",
            Self::Design => "design",
            Self::Tasks => "tasks",
            Self::Apply => "apply",
            Self::Verify => "verify",
            Self::Archive => "archive",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "explore" => Some(Self::Explore),
            "propose" => Some(Self::Propose),
            "spec" => Some(Self::Spec),
            "design" => Some(Self::Design),
            "tasks" => Some(Self::Tasks),
            "apply" => Some(Self::Apply),
            "verify" => Some(Self::Verify),
            "archive" => Some(Self::Archive),
            _ => None,
        }
    }

    /// Dependencies: which phases must complete before this one can start
    pub fn dependencies(&self) -> &[SddPhase] {
        match self {
            Self::Explore => &[],
            Self::Propose => &[],
            Self::Spec => &[Self::Propose],
            Self::Design => &[Self::Propose],
            Self::Tasks => &[Self::Spec, Self::Design],
            Self::Apply => &[Self::Tasks],
            Self::Verify => &[Self::Apply],
            Self::Archive => &[Self::Verify],
        }
    }

    /// Phases that can run in parallel with this one
    pub fn parallel_with(&self) -> &[SddPhase] {
        match self {
            Self::Spec => &[Self::Design],
            Self::Design => &[Self::Spec],
            _ => &[],
        }
    }
}

/// Token usage recorded for a single phase execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhaseUsage {
    pub phase: String,
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// One versioned snapshot of a phase artifact.
/// Appended each time a phase runs (including retries).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ArtifactVersion {
    /// 1-based version counter per phase.
    pub version: u32,
    pub content: serde_json::Value,
    pub tokens_used: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

    /// Per-phase token usage — one entry appended each time a phase runs.
    #[serde(default)]
    pub usage_history: Vec<PhaseUsage>,

    /// Full artifact history per phase — all versions including retries.
    #[serde(default)]
    pub artifact_history: HashMap<String, Vec<ArtifactVersion>>,

    /// Optional token budget. Pipeline aborts with `BudgetExceeded` if the
    /// cumulative token count would exceed this value.
    #[serde(default)]
    pub token_budget: Option<u32>,

    /// Per-change Definition of Done. When `None`, the default 4-criterion
    /// DoD is used (backward-compatible).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub definition_of_done: Option<DefinitionOfDone>,
}

impl SddChange {
    /// Construct a new change with sensible defaults for all optional fields.
    pub fn new(name: impl Into<String>, description: impl Into<String>) -> Self {
        let now = "1970-01-01T00:00:00Z".to_string();
        Self {
            name: name.into(),
            description: description.into(),
            phases_completed: Vec::new(),
            phases_in_progress: Vec::new(),
            artifacts: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
            usage_history: Vec::new(),
            artifact_history: HashMap::new(),
            token_budget: None,
            definition_of_done: None,
        }
    }

    /// Returns the custom DoD or the default 4-criterion DoD.
    pub fn dod(&self) -> DefinitionOfDone {
        self.definition_of_done.clone().unwrap_or_else(DefinitionOfDone::default_dod)
    }

    /// Builder: set a custom Definition of Done.
    pub fn with_dod(mut self, dod: DefinitionOfDone) -> Self {
        self.definition_of_done = Some(dod);
        self
    }

    /// Append a criterion to the DoD. Initializes with default if None.
    pub fn add_criterion(&mut self, criterion: DodCriterion) {
        let dod = self.definition_of_done.get_or_insert_with(DefinitionOfDone::default_dod);
        dod.criteria.push(criterion);
    }

    /// Total tokens consumed across all phases so far.
    pub fn tokens_used(&self) -> u32 {
        self.usage_history.iter().map(|u| u.total_tokens).sum()
    }

    /// All recorded versions of a phase artifact, oldest first.
    pub fn artifact_versions(&self, phase: &str) -> &[ArtifactVersion] {
        self.artifact_history.get(phase).map(|v| v.as_slice()).unwrap_or(&[])
    }
}

// ── Definition of Done (DoD) ──────────────────────────────────────────────

/// Category for a DoD criterion — the four standard checks plus custom.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DodCategory {
    Completeness,
    Correctness,
    Coherence,
    Testing,
    Custom(String),
}

impl DodCategory {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Completeness => "completeness",
            Self::Correctness => "correctness",
            Self::Coherence => "coherence",
            Self::Testing => "testing",
            Self::Custom(s) => s.as_str(),
        }
    }
}

/// A single criterion in the Definition of Done.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DodCriterion {
    pub id: String,
    pub description: String,
    pub category: DodCategory,
    pub required: bool,
}

/// Structured Definition of Done — a list of criteria to check.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DefinitionOfDone {
    pub criteria: Vec<DodCriterion>,
}

impl DefinitionOfDone {
    /// The four standard criteria matching the legacy Verify behavior.
    pub fn default_dod() -> Self {
        Self {
            criteria: vec![
                DodCriterion {
                    id: "completeness".into(),
                    description: "All tasks done? ([x] count == total)".into(),
                    category: DodCategory::Completeness,
                    required: true,
                },
                DodCriterion {
                    id: "correctness".into(),
                    description: "For each ADDED/MODIFIED requirement, search codebase for evidence".into(),
                    category: DodCategory::Correctness,
                    required: true,
                },
                DodCriterion {
                    id: "coherence".into(),
                    description: "Design decisions followed?".into(),
                    category: DodCategory::Coherence,
                    required: true,
                },
                DodCriterion {
                    id: "testing".into(),
                    description: "Test coverage for spec scenarios?".into(),
                    category: DodCategory::Testing,
                    required: true,
                },
            ],
        }
    }

    /// Render criteria as a numbered checklist with output format instructions.
    pub fn to_prompt_section(&self) -> String {
        let mut out = String::from("\n## Definition of Done\n\nEvaluate each criterion below:\n\n");
        for (i, c) in self.criteria.iter().enumerate() {
            let tag = if c.required { "" } else { " [ADVISORY]" };
            out.push_str(&format!(
                "{}. **[{}]** {}{}\n",
                i + 1,
                c.id,
                c.description,
                tag,
            ));
        }
        out.push_str(
            "\nFor each criterion, output a line:\n\
             DOD_RESULT: <criterion_id> <PASS|FAIL|WARNING|SKIPPED> <evidence>\n\n\
             After all criteria, output:\n\
             DOD_VERDICT: <PASS|PASS_WITH_WARNINGS|FAIL>\n",
        );
        out
    }
}

/// Status of a single criterion evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CriterionStatus {
    Pass,
    Fail,
    Warning,
    Skipped,
}

/// Result of evaluating a single DoD criterion.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CriterionResult {
    pub criterion_id: String,
    pub status: CriterionStatus,
    pub evidence: String,
}

/// Overall verdict for the DoD evaluation.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DodVerdict {
    Pass,
    PassWithWarnings,
    Fail,
}

/// Full report from evaluating a Definition of Done.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DodReport {
    pub verdict: DodVerdict,
    pub results: Vec<CriterionResult>,
}

impl DodReport {
    /// Parse structured DOD_RESULT/DOD_VERDICT lines from LLM output.
    /// Falls back to legacy PASS/FAIL heuristic if no structured lines found.
    pub fn parse(text: &str, dod: &DefinitionOfDone) -> Self {
        let mut results = Vec::new();

        for line in text.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("DOD_RESULT:") {
                let rest = rest.trim();
                let mut parts = rest.splitn(3, ' ');
                if let (Some(id), Some(status_str)) = (parts.next(), parts.next()) {
                    let evidence = parts.next().unwrap_or("").to_string();
                    let status = match status_str.to_uppercase().as_str() {
                        "PASS" => CriterionStatus::Pass,
                        "FAIL" => CriterionStatus::Fail,
                        "WARNING" => CriterionStatus::Warning,
                        "SKIPPED" => CriterionStatus::Skipped,
                        _ => CriterionStatus::Fail,
                    };
                    results.push(CriterionResult {
                        criterion_id: id.to_string(),
                        status,
                        evidence,
                    });
                }
            }
        }

        // Try to parse explicit verdict
        let explicit_verdict = text.lines().find_map(|line| {
            let trimmed = line.trim();
            trimmed.strip_prefix("DOD_VERDICT:").map(|rest| {
                match rest.trim().to_uppercase().as_str() {
                    "PASS" => DodVerdict::Pass,
                    "PASS_WITH_WARNINGS" => DodVerdict::PassWithWarnings,
                    _ => DodVerdict::Fail,
                }
            })
        });

        if !results.is_empty() {
            let verdict = explicit_verdict.unwrap_or_else(|| Self::derive_verdict(&results, dod));
            return Self { verdict, results };
        }

        // Legacy fallback: PASS/FAIL heuristic
        let upper = text.to_uppercase();
        let passed = upper.contains("PASS") && !upper.contains("FAIL");
        let verdict = if passed { DodVerdict::Pass } else { DodVerdict::Fail };

        // Synthesize results for all criteria from legacy verdict
        let results = dod.criteria.iter().map(|c| CriterionResult {
            criterion_id: c.id.clone(),
            status: if passed { CriterionStatus::Pass } else { CriterionStatus::Fail },
            evidence: "legacy PASS/FAIL heuristic".into(),
        }).collect();

        Self { verdict, results }
    }

    /// Derive verdict from individual results when no explicit DOD_VERDICT line.
    fn derive_verdict(results: &[CriterionResult], dod: &DefinitionOfDone) -> DodVerdict {
        let mut has_warning = false;
        for r in results {
            let is_required = dod.criteria.iter()
                .find(|c| c.id == r.criterion_id)
                .map(|c| c.required)
                .unwrap_or(true);
            match r.status {
                CriterionStatus::Fail if is_required => return DodVerdict::Fail,
                CriterionStatus::Warning => has_warning = true,
                CriterionStatus::Fail => has_warning = true, // advisory fail → warning
                _ => {}
            }
        }
        if has_warning { DodVerdict::PassWithWarnings } else { DodVerdict::Pass }
    }

    /// Returns `true` if the verdict is Pass or PassWithWarnings.
    pub fn passed(&self) -> bool {
        matches!(self.verdict, DodVerdict::Pass | DodVerdict::PassWithWarnings)
    }
}

// ── Permission Mode (parity with Anthropic PermissionMode) ────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PermissionMode {
    Default,
    AcceptEdits,
    BypassPermissions,
    Plan,
    DontAsk,
}

impl Default for PermissionMode {
    fn default() -> Self { Self::Default }
}

// ── Effort Level (parity with Anthropic adaptive thinking) ────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EffortLevel {
    Low,
    Medium,
    High,
    Max,
}

impl EffortLevel {
    /// Map effort to DeepSeek temperature (lower = more focused)
    pub fn temperature(&self) -> f64 {
        match self {
            Self::Low => 0.1,
            Self::Medium => 0.5,
            Self::High => 0.7,
            Self::Max => 1.0,
        }
    }

    /// Map effort to max tokens
    pub fn max_tokens(&self) -> u32 {
        match self {
            Self::Low => 2048,
            Self::Medium => 4096,
            Self::High => 8192,
            Self::Max => 16384,
        }
    }
}

impl Default for EffortLevel {
    fn default() -> Self { Self::High }
}
