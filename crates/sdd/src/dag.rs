//! Generic DAG pipeline — define arbitrary directed acyclic graphs of LLM nodes
//! and execute them wave-by-wave with automatic parallelization.
//!
//! Each node has a system prompt, model, effort level, and dependencies.
//! Downstream nodes receive upstream outputs formatted in the user prompt.

use std::collections::{HashMap, HashSet, VecDeque};

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::agent::{build_request, system_msg, user_msg};
use crate::error::{Result, SddError};
use crate::hooks::HookRegistry;
use crate::types::{DeepSeekModel, EffortLevel, HookEvent, HookInput, HookOutput};
use crate::traits::LlmClient;

// ── Types ──────────────────────────────────────────────────────────────

/// A single node in a DAG pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagNode {
    pub name: String,
    pub system_prompt: String,
    #[serde(default)]
    pub model: DeepSeekModel,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub effort: EffortLevel,
    #[serde(default)]
    pub tools: Vec<String>,
}

/// A complete DAG definition with validation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DagDefinition {
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub nodes: Vec<DagNode>,
}

impl DagDefinition {
    /// Validate the DAG: check dependency existence and detect cycles (Kahn's algorithm).
    pub fn validate(&self) -> Result<()> {
        let names: HashSet<&str> = self.nodes.iter().map(|n| n.name.as_str()).collect();

        // Check all dependencies exist
        for node in &self.nodes {
            for dep in &node.dependencies {
                if !names.contains(dep.as_str()) {
                    return Err(SddError::DependencyNotMet {
                        phase: node.name.clone(),
                        dependency: dep.clone(),
                    });
                }
            }
        }

        // Kahn's algorithm for cycle detection
        let mut in_degree: HashMap<&str, usize> = HashMap::new();
        let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();

        for node in &self.nodes {
            in_degree.entry(node.name.as_str()).or_insert(0);
            adj.entry(node.name.as_str()).or_default();
            for dep in &node.dependencies {
                adj.entry(dep.as_str()).or_default().push(node.name.as_str());
                *in_degree.entry(node.name.as_str()).or_insert(0) += 1;
            }
        }

        let mut queue: VecDeque<&str> = in_degree
            .iter()
            .filter(|(_, &deg)| deg == 0)
            .map(|(&name, _)| name)
            .collect();

        let mut visited = 0usize;
        while let Some(node) = queue.pop_front() {
            visited += 1;
            if let Some(neighbors) = adj.get(node) {
                for &neighbor in neighbors {
                    let deg = in_degree.get_mut(neighbor).unwrap();
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        if visited != self.nodes.len() {
            return Err(SddError::Other("DAG contains a cycle".into()));
        }

        Ok(())
    }

    /// Look up a node by name.
    pub fn get_node(&self, name: &str) -> Option<&DagNode> {
        self.nodes.iter().find(|n| n.name == name)
    }
}

/// Fluent builder for DAG definitions.
pub struct DagBuilder {
    name: String,
    description: String,
    nodes: Vec<DagNode>,
}

impl DagBuilder {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            description: String::new(),
            nodes: Vec::new(),
        }
    }

    pub fn description(mut self, desc: &str) -> Self {
        self.description = desc.to_string();
        self
    }

    /// Add a node with explicit dependencies.
    pub fn node(mut self, node: DagNode, deps: &[&str]) -> Self {
        let mut node = node;
        node.dependencies = deps.iter().map(|s| s.to_string()).collect();
        self.nodes.push(node);
        self
    }

    pub fn build(self) -> DagDefinition {
        DagDefinition {
            name: self.name,
            description: self.description,
            nodes: self.nodes,
        }
    }
}

/// Tracks execution state for a DAG run.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DagExecution {
    pub nodes_completed: Vec<String>,
    pub nodes_in_progress: Vec<String>,
    pub artifacts: HashMap<String, Value>,
}

impl DagExecution {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_complete(&self, dag: &DagDefinition) -> bool {
        dag.nodes
            .iter()
            .all(|n| self.nodes_completed.contains(&n.name))
    }
}

// ── Detection ──────────────────────────────────────────────────────────

/// Detect all nodes whose dependencies are complete and that haven't started yet.
pub fn detect_ready_nodes<'a>(dag: &'a DagDefinition, execution: &DagExecution) -> Vec<&'a DagNode> {
    dag.nodes
        .iter()
        .filter(|node| {
            // Not completed and not in progress
            !execution.nodes_completed.contains(&node.name)
                && !execution.nodes_in_progress.contains(&node.name)
                // All dependencies completed
                && node
                    .dependencies
                    .iter()
                    .all(|dep| execution.nodes_completed.contains(dep))
        })
        .collect()
}

// ── Pipeline ───────────────────────────────────────────────────────────

/// Orchestrator that executes a DAG definition using an LLM client.
pub struct DagPipeline<C: LlmClient> {
    client: C,
    hooks: Option<HookRegistry>,
}

impl<C: LlmClient> DagPipeline<C> {
    pub fn new(client: C) -> Self {
        Self {
            client,
            hooks: None,
        }
    }

    pub fn with_hooks(mut self, hooks: HookRegistry) -> Self {
        self.hooks = Some(hooks);
        self
    }

    /// Run a single node: build prompt from upstream artifacts, call LLM, fire hooks.
    async fn run_node(
        &self,
        node: &DagNode,
        execution: &DagExecution,
    ) -> Result<Value> {
        // Fire PrePhase hook
        if let Some(hooks) = &self.hooks {
            let input = HookInput {
                event: HookEvent::PrePhase,
                tool_name: None,
                tool_input: None,
                tool_output: None,
                phase_name: Some(node.name.clone()),
                session_id: None,
                agent_name: None,
                error: None,
            };
            let output: HookOutput = hooks.fire(&input);
            if !output.allow {
                return Err(SddError::PhaseBlocked {
                    phase: node.name.clone(),
                    reason: output.deny_reason.unwrap_or_default(),
                });
            }
        }

        // Build user prompt from upstream artifacts
        let mut user_parts: Vec<String> = Vec::new();
        for dep in &node.dependencies {
            if let Some(artifact) = execution.artifacts.get(dep) {
                user_parts.push(format!(
                    "## Output from `{}`\n{}",
                    dep,
                    serde_json::to_string_pretty(artifact).unwrap_or_default()
                ));
            }
        }
        let user_prompt = if user_parts.is_empty() {
            "Begin.".to_string()
        } else {
            user_parts.join("\n\n")
        };

        let messages = vec![
            system_msg(&node.system_prompt),
            user_msg(&user_prompt),
        ];
        let request = build_request(&node.model, messages, None, &node.effort);
        let response = self.client.chat(&request).await?;

        let text = response
            .choices
            .first()
            .map(|c| c.message.content.as_str().to_string())
            .unwrap_or_default();

        let result = Value::String(text);

        // Fire PostPhase hook
        if let Some(hooks) = &self.hooks {
            let input = HookInput {
                event: HookEvent::PostPhase,
                tool_name: None,
                tool_input: None,
                tool_output: Some(result.clone()),
                phase_name: Some(node.name.clone()),
                session_id: None,
                agent_name: None,
                error: None,
            };
            hooks.fire(&input);
        }

        Ok(result)
    }

    /// Execute a single node with dependency validation.
    pub async fn execute_node(
        &self,
        dag: &DagDefinition,
        execution: &mut DagExecution,
        node_name: &str,
    ) -> Result<Value> {
        let node = dag
            .get_node(node_name)
            .ok_or_else(|| SddError::Other(format!("Node `{}` not found", node_name)))?;

        // Validate dependencies are complete
        for dep in &node.dependencies {
            if !execution.nodes_completed.contains(dep) {
                return Err(SddError::DependencyNotMet {
                    phase: node_name.to_string(),
                    dependency: dep.clone(),
                });
            }
        }

        execution.nodes_in_progress.push(node_name.to_string());
        let result = self.run_node(node, execution).await?;

        execution.nodes_in_progress.retain(|n| n != node_name);
        execution.nodes_completed.push(node_name.to_string());
        execution.artifacts.insert(node_name.to_string(), result.clone());

        Ok(result)
    }

    /// Detect all ready nodes and run them in parallel.
    pub async fn execute_ready(
        &self,
        dag: &DagDefinition,
        execution: &mut DagExecution,
    ) -> Result<Vec<(String, Value)>> {
        let ready = detect_ready_nodes(dag, execution);
        if ready.is_empty() {
            return Ok(Vec::new());
        }

        let node_names: Vec<String> = ready.iter().map(|n| n.name.clone()).collect();
        for name in &node_names {
            execution.nodes_in_progress.push(name.clone());
        }

        // Snapshot execution for parallel reads (no mutation during futures)
        let snapshot = execution.clone();
        let futures: Vec<_> = ready
            .into_iter()
            .map(|node| {
                let snap = snapshot.clone();
                async move {
                    let result = self.run_node(node, &snap).await;
                    (node.name.clone(), result)
                }
            })
            .collect();

        let results = join_all(futures).await;

        let mut outputs = Vec::new();
        for (name, result) in results {
            execution.nodes_in_progress.retain(|n| n != &name);
            match result {
                Ok(value) => {
                    execution.nodes_completed.push(name.clone());
                    execution.artifacts.insert(name.clone(), value.clone());
                    outputs.push((name, value));
                }
                Err(e) => return Err(e),
            }
        }

        Ok(outputs)
    }

    /// Execute the entire DAG wave-by-wave until all nodes are complete.
    pub async fn execute_all(
        &self,
        dag: &DagDefinition,
        execution: &mut DagExecution,
    ) -> Result<HashMap<String, Value>> {
        dag.validate()?;

        loop {
            if execution.is_complete(dag) {
                break;
            }

            let results = self.execute_ready(dag, execution).await?;
            if results.is_empty() {
                // No progress possible — shouldn't happen with a valid DAG
                return Err(SddError::Other(
                    "No ready nodes but DAG is not complete".into(),
                ));
            }
        }

        Ok(execution.artifacts.clone())
    }
}
