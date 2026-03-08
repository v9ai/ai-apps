use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, warn};

use deepseek::{DeepSeekClient, ReqwestClient};

const QWEN_MODEL: &str = "qwen-plus";
const MAX_RETRIES: u32 = 3;

// ── model abstraction ────────────────────────────────────────────────────────

#[derive(Clone)]
pub enum ModelClient {
    DeepSeek(Arc<DeepSeekClient<ReqwestClient>>),
    Qwen {
        client: Arc<qwen::Client>,
        model: String,
    },
}

impl ModelClient {
    pub fn deepseek(client: Arc<DeepSeekClient<ReqwestClient>>) -> Self {
        Self::DeepSeek(client)
    }

    pub fn qwen(client: Arc<qwen::Client>) -> Self {
        Self::Qwen {
            client,
            model: QWEN_MODEL.to_string(),
        }
    }

    fn model_name(&self) -> &str {
        match self {
            Self::DeepSeek(_) => "deepseek-reasoner",
            Self::Qwen { model, .. } => model,
        }
    }
}

// ── team role ────────────────────────────────────────────────────────────────

/// Role determines which model a team member uses.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TeamRole {
    /// Heavy reasoning tasks — uses the reasoner model (DeepSeek).
    Reasoner,
    /// Light generation tasks — uses the fast model (Qwen, falls back to reasoner).
    Fast,
    /// Quality gate / review tasks — uses the reasoner model.
    Reviewer,
}

// ── model pool ───────────────────────────────────────────────────────────────

/// Dual-model pool that routes agents to the right provider based on role.
#[derive(Clone)]
pub struct ModelPool {
    pub reasoner: ModelClient,
    pub fast: ModelClient,
}

impl ModelPool {
    /// Build from environment variables. Falls back to DeepSeek-only if
    /// `DASHSCOPE_API_KEY` is not set.
    pub fn from_env() -> Result<Self> {
        let ds_client = Arc::new(deepseek::client_from_env()?);
        let ds = ModelClient::deepseek(ds_client);

        let qw = std::env::var("DASHSCOPE_API_KEY")
            .ok()
            .map(|key| ModelClient::qwen(Arc::new(qwen::Client::new(key))))
            .unwrap_or_else(|| ds.clone());

        Ok(Self {
            reasoner: ds,
            fast: qw,
        })
    }

    /// Build from pre-existing clients (used in tests and Pipeline).
    pub fn new(reasoner: ModelClient, fast: ModelClient) -> Self {
        Self { reasoner, fast }
    }

    /// Get the model client for a given role.
    pub fn for_role(&self, role: TeamRole) -> ModelClient {
        match role {
            TeamRole::Reasoner | TeamRole::Reviewer => self.reasoner.clone(),
            TeamRole::Fast => self.fast.clone(),
        }
    }

    /// Human-readable label for logging.
    pub fn label(&self) -> String {
        match (&self.reasoner, &self.fast) {
            (ModelClient::DeepSeek(_), ModelClient::Qwen { model, .. }) => {
                format!("deepseek-reasoner + {model}")
            }
            _ => "deepseek-reasoner".to_string(),
        }
    }

    /// Extract the raw DeepSeek client Arc (needed by research_phase).
    pub fn deepseek_client(&self) -> Option<Arc<DeepSeekClient<ReqwestClient>>> {
        match &self.reasoner {
            ModelClient::DeepSeek(c) => Some(Arc::clone(c)),
            _ => None,
        }
    }
}

// ── agent ────────────────────────────────────────────────────────────────────

pub struct Agent {
    pub name: String,
    system_prompt: String,
    client: ModelClient,
}

impl Agent {
    pub fn new(
        name: impl Into<String>,
        system_prompt: impl Into<String>,
        client: ModelClient,
    ) -> Self {
        Self {
            name: name.into(),
            system_prompt: system_prompt.into(),
            client,
        }
    }

    pub async fn run(&self, input: &str) -> Result<String> {
        info!("[{}] starting ({})", self.name, self.client.model_name());

        let content = match &self.client {
            ModelClient::DeepSeek(client) => {
                let output =
                    deepseek::reason_with_retry(client, &self.system_prompt, input).await?;

                if !output.reasoning.is_empty() {
                    debug!(
                        "[{}] reasoning ({} chars): {}…",
                        self.name,
                        output.reasoning.len(),
                        &output.reasoning[..output.reasoning.len().min(200)]
                    );
                }
                output.content
            }
            ModelClient::Qwen { client, model } => {
                qwen_with_retry(client, model, &self.system_prompt, input).await?
            }
        };

        info!("[{}] done ({} chars)", self.name, content.len());
        Ok(content)
    }
}

// ── team member ─────────────────────────────────────────────────────────────

pub struct TeamMember {
    pub agent: Agent,
    pub role: TeamRole,
}

// ── agent team ──────────────────────────────────────────────────────────────

/// A named group of agents with role-based model routing.
pub struct AgentTeam {
    pub name: String,
    pub members: Vec<TeamMember>,
}

impl AgentTeam {
    pub fn new(name: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            members: Vec::new(),
        }
    }

    /// Add a member with automatic model routing based on role.
    pub fn spawn(
        &mut self,
        name: impl Into<String>,
        system_prompt: impl Into<String>,
        role: TeamRole,
        pool: &ModelPool,
    ) -> usize {
        let client = pool.for_role(role);
        let agent = Agent::new(name, system_prompt, client);
        let idx = self.members.len();
        self.members.push(TeamMember { agent, role });
        idx
    }

    /// Get a reference to a member's agent by index.
    pub fn agent(&self, idx: usize) -> &Agent {
        &self.members[idx].agent
    }
}

// ── parallel execution ──────────────────────────────────────────────────────

/// Run two agents concurrently with the same input (backward-compatible).
pub async fn run_parallel(a: &Agent, b: &Agent, input: &str) -> Result<(String, String)> {
    info!("Running [{}] and [{}] in parallel…", a.name, b.name);
    tokio::try_join!(a.run(input), b.run(input))
}

/// Run N agents concurrently, each with its own input. Returns results in order.
pub async fn run_all(tasks: Vec<(&Agent, String)>) -> Result<Vec<String>> {
    if tasks.is_empty() {
        return Ok(vec![]);
    }
    if tasks.len() == 1 {
        let (agent, input) = &tasks[0];
        return Ok(vec![agent.run(input).await?]);
    }

    info!(
        "Running {} agents in parallel: [{}]",
        tasks.len(),
        tasks.iter().map(|(a, _)| a.name.as_str()).collect::<Vec<_>>().join(", ")
    );

    let mut set = tokio::task::JoinSet::new();
    // Track original order.
    let mut order: Vec<String> = Vec::with_capacity(tasks.len());

    for (agent, input) in &tasks {
        order.push(agent.name.clone());
        let name = agent.name.clone();
        let system_prompt = agent.system_prompt.clone();
        let client = agent.client.clone();
        let input = input.clone();

        set.spawn(async move {
            let agent = Agent::new(name.clone(), system_prompt, client);
            let result = agent.run(&input).await?;
            Ok::<(String, String), anyhow::Error>((name, result))
        });
    }

    let mut results: Vec<(String, String)> = Vec::with_capacity(tasks.len());
    while let Some(res) = set.join_next().await {
        results.push(res??);
    }

    // Reorder to match input order.
    let mut ordered = Vec::with_capacity(order.len());
    for name in &order {
        let result = results
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, r)| r.clone())
            .unwrap_or_default();
        ordered.push(result);
    }

    Ok(ordered)
}

/// Run N agents concurrently, all with the same input. Returns results in order.
pub async fn run_all_same_input(agents: &[&Agent], input: &str) -> Result<Vec<String>> {
    let tasks: Vec<(&Agent, String)> = agents
        .iter()
        .map(|a| (*a, input.to_string()))
        .collect();
    run_all(tasks).await
}

// ── qwen retry helper ────────────────────────────────────────────────────────

async fn qwen_with_retry(
    client: &qwen::Client,
    model: &str,
    system: &str,
    user: &str,
) -> Result<String> {
    let mut last_err = None;
    for attempt in 0..MAX_RETRIES {
        let req = qwen::ChatRequest::new(
            model,
            vec![
                qwen::ChatMessage::system(system),
                qwen::ChatMessage::user(user),
            ],
        );
        match client.chat(req).await {
            Ok(resp) => return Ok(resp.text().unwrap_or("").to_string()),
            Err(e) => {
                let retryable = match &e {
                    qwen::Error::Network(_) => true,
                    qwen::Error::Api { status, .. } | qwen::Error::Http { status, .. } => {
                        status.is_server_error()
                    }
                    qwen::Error::Json(_) => false,
                };
                if !retryable || attempt == MAX_RETRIES - 1 {
                    return Err(anyhow::anyhow!("Qwen API error: {e}"));
                }
                warn!("[qwen] attempt {} failed ({e}), retrying…", attempt + 1);
                let delay = std::time::Duration::from_secs(1 << attempt);
                tokio::time::sleep(delay).await;
                last_err = Some(e);
            }
        }
    }
    Err(anyhow::anyhow!(
        "Qwen API failed after {MAX_RETRIES} attempts: {:?}",
        last_err
    ))
}
