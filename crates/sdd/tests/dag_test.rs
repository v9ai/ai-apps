use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use sdd::dag::{DagBuilder, DagDefinition, DagExecution, DagNode, DagPipeline, detect_ready_nodes};
use sdd::types::{
    ChatContent, ChatMessage, ChatRequest, ChatResponse, Choice, DeepSeekModel, EffortLevel,
    UsageInfo,
};
use sdd::traits::LlmClient;
use sdd::error::Result;

// ── Mock LLM ───────────────────────────────────────────────────────────

#[derive(Clone)]
struct MockLlmClient(Arc<Mutex<MockInner>>);

struct MockInner {
    responses: Vec<String>,
    call_count: usize,
}

impl MockLlmClient {
    fn new(responses: Vec<&str>) -> Self {
        Self(Arc::new(Mutex::new(MockInner {
            responses: responses.into_iter().map(String::from).collect(),
            call_count: 0,
        })))
    }

    fn calls(&self) -> usize {
        self.0.lock().unwrap().call_count
    }
}

#[async_trait]
impl LlmClient for MockLlmClient {
    async fn chat(&self, _request: &ChatRequest) -> Result<ChatResponse> {
        let mut inner = self.0.lock().unwrap();
        let idx = inner.call_count;
        inner.call_count += 1;
        let text = inner
            .responses
            .get(idx)
            .cloned()
            .unwrap_or_else(|| format!("response-{}", idx));

        Ok(ChatResponse {
            id: format!("mock-{}", idx),
            choices: vec![Choice {
                index: 0,
                message: ChatMessage {
                    role: "assistant".into(),
                    content: ChatContent::Text(text),
                    reasoning_content: None,
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                },
                finish_reason: Some("stop".into()),
            }],
            usage: Some(UsageInfo {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            }),
        })
    }
}

// ── Helpers ────────────────────────────────────────────────────────────

fn make_node(name: &str) -> DagNode {
    DagNode {
        name: name.into(),
        system_prompt: format!("You are the {} node.", name),
        model: DeepSeekModel::Chat,
        dependencies: Vec::new(),
        effort: EffortLevel::Low,
        tools: Vec::new(),
    }
}

fn bs_detector_dag() -> DagDefinition {
    DagBuilder::new("bs-detector")
        .description("4-node BS detector pipeline")
        .node(make_node("parser"), &[])
        .node(make_node("citation-verifier"), &["parser"])
        .node(make_node("fact-checker"), &["parser"])
        .node(make_node("synthesizer"), &["citation-verifier", "fact-checker"])
        .build()
}

// ── Tests ──────────────────────────────────────────────────────────────

#[test]
fn valid_dag_passes_validation() {
    let dag = bs_detector_dag();
    assert!(dag.validate().is_ok());
}

#[test]
fn missing_dependency_returns_error() {
    let dag = DagBuilder::new("bad")
        .node(make_node("a"), &["nonexistent"])
        .build();

    let err = dag.validate().unwrap_err();
    assert!(err.to_string().contains("nonexistent"));
}

#[test]
fn cyclic_dag_returns_error() {
    // Manually build a cycle: a -> b -> a
    let dag = DagDefinition {
        name: "cyclic".into(),
        description: String::new(),
        nodes: vec![
            DagNode {
                name: "a".into(),
                system_prompt: String::new(),
                model: DeepSeekModel::Chat,
                dependencies: vec!["b".into()],
                effort: EffortLevel::Low,
                tools: Vec::new(),
            },
            DagNode {
                name: "b".into(),
                system_prompt: String::new(),
                model: DeepSeekModel::Chat,
                dependencies: vec!["a".into()],
                effort: EffortLevel::Low,
                tools: Vec::new(),
            },
        ],
    };

    let err = dag.validate().unwrap_err();
    assert!(err.to_string().contains("cycle"));
}

#[test]
fn root_nodes_detected_as_ready() {
    let dag = bs_detector_dag();
    let execution = DagExecution::new();
    let ready = detect_ready_nodes(&dag, &execution);

    assert_eq!(ready.len(), 1);
    assert_eq!(ready[0].name, "parser");
}

#[test]
fn middle_layer_ready_after_deps_complete() {
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();
    execution.nodes_completed.push("parser".into());

    let ready = detect_ready_nodes(&dag, &execution);
    let mut names: Vec<&str> = ready.iter().map(|n| n.name.as_str()).collect();
    names.sort();
    assert_eq!(names, vec!["citation-verifier", "fact-checker"]);
}

#[tokio::test]
async fn execute_node_validates_deps() {
    let client = MockLlmClient::new(vec!["ok"]);
    let pipeline = DagPipeline::new(client);
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();

    // Try to run synthesizer without deps
    let err = pipeline
        .execute_node(&dag, &mut execution, "synthesizer")
        .await
        .unwrap_err();
    assert!(err.to_string().contains("citation-verifier"));
}

#[tokio::test]
async fn execute_all_runs_full_dag() {
    let client = MockLlmClient::new(vec![
        "parsed content",
        "citations ok",
        "facts checked",
        "final synthesis",
    ]);
    let pipeline = DagPipeline::new(client.clone());
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();

    let artifacts = pipeline.execute_all(&dag, &mut execution).await.unwrap();

    assert_eq!(artifacts.len(), 4);
    assert!(artifacts.contains_key("parser"));
    assert!(artifacts.contains_key("citation-verifier"));
    assert!(artifacts.contains_key("fact-checker"));
    assert!(artifacts.contains_key("synthesizer"));
    assert_eq!(client.calls(), 4);
}

#[tokio::test]
async fn parallel_nodes_run_in_same_wave() {
    let client = MockLlmClient::new(vec!["parsed", "verified", "checked", "done"]);
    let pipeline = DagPipeline::new(client);
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();

    // Wave 1: parser
    let wave1 = pipeline.execute_ready(&dag, &mut execution).await.unwrap();
    assert_eq!(wave1.len(), 1);
    assert_eq!(wave1[0].0, "parser");

    // Wave 2: citation-verifier + fact-checker (parallel)
    let wave2 = pipeline.execute_ready(&dag, &mut execution).await.unwrap();
    assert_eq!(wave2.len(), 2);
    let mut names: Vec<&str> = wave2.iter().map(|(n, _)| n.as_str()).collect();
    names.sort();
    assert_eq!(names, vec!["citation-verifier", "fact-checker"]);

    // Wave 3: synthesizer
    let wave3 = pipeline.execute_ready(&dag, &mut execution).await.unwrap();
    assert_eq!(wave3.len(), 1);
    assert_eq!(wave3[0].0, "synthesizer");
}
