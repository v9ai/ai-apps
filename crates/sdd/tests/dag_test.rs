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
        output_schema: None,
        max_retries: 0,
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
                output_schema: None,
                max_retries: 0,
            },
            DagNode {
                name: "b".into(),
                system_prompt: String::new(),
                model: DeepSeekModel::Chat,
                dependencies: vec!["a".into()],
                effort: EffortLevel::Low,
                tools: Vec::new(),
                output_schema: None,
                max_retries: 0,
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

// ── New tests for inputs, output_schema, retry, node_meta ─────────────

#[tokio::test]
async fn root_node_receives_input() {
    let client = MockLlmClient::new(vec!["got input"]);
    let pipeline = DagPipeline::new(client);
    let dag = DagBuilder::new("input-test")
        .node(make_node("parser"), &[])
        .build();

    let input_data = serde_json::json!({"document": "test content"});
    let mut execution = DagExecution::new()
        .with_input("parser", input_data.clone());

    pipeline.execute_node(&dag, &mut execution, "parser").await.unwrap();

    // Verify the input was stored
    assert_eq!(execution.inputs.get("parser").unwrap(), &input_data);
    assert!(execution.nodes_completed.contains(&"parser".to_string()));
}

#[tokio::test]
async fn output_schema_parses_json_response() {
    let json_response = r#"{"findings": ["fact1", "fact2"], "confidence": 0.95}"#;
    let client = MockLlmClient::new(vec![json_response]);
    let pipeline = DagPipeline::new(client);

    let mut node = make_node("extractor");
    node.output_schema = Some(serde_json::json!({
        "type": "object",
        "properties": {
            "findings": {"type": "array"},
            "confidence": {"type": "number"}
        }
    }));

    let dag = DagBuilder::new("schema-test")
        .node(node, &[])
        .build();

    let mut execution = DagExecution::new();
    let result = pipeline.execute_node(&dag, &mut execution, "extractor").await.unwrap();

    // Should be parsed as JSON object, not a string
    assert!(result.is_object());
    assert_eq!(result["confidence"], 0.95);
}

#[tokio::test]
async fn output_schema_falls_back_to_string() {
    let client = MockLlmClient::new(vec!["not json at all"]);
    let pipeline = DagPipeline::new(client);

    let mut node = make_node("extractor");
    node.output_schema = Some(serde_json::json!({"type": "object"}));

    let dag = DagBuilder::new("fallback-test")
        .node(node, &[])
        .build();

    let mut execution = DagExecution::new();
    let result = pipeline.execute_node(&dag, &mut execution, "extractor").await.unwrap();

    // Falls back to string
    assert!(result.is_string());
    assert_eq!(result.as_str().unwrap(), "not json at all");
}

#[tokio::test]
async fn node_meta_records_attempts() {
    let client = MockLlmClient::new(vec!["done"]);
    let pipeline = DagPipeline::new(client);
    let dag = DagBuilder::new("meta-test")
        .node(make_node("a"), &[])
        .build();

    let mut execution = DagExecution::new();
    pipeline.execute_node(&dag, &mut execution, "a").await.unwrap();

    let meta = execution.node_meta.get("a").unwrap();
    assert_eq!(meta.attempts, 1);
}

#[test]
fn execution_metadata_builder() {
    let exec = DagExecution::new()
        .with_metadata("run_id", serde_json::json!("abc-123"))
        .with_input("parser", serde_json::json!({"doc": "hello"}));

    assert_eq!(exec.metadata.get("run_id").unwrap(), "abc-123");
    assert!(exec.inputs.contains_key("parser"));
}

#[test]
fn get_node_returns_some_for_existing() {
    let dag = bs_detector_dag();
    let node = dag.get_node("parser");
    assert!(node.is_some());
    assert_eq!(node.unwrap().name, "parser");
}

#[test]
fn get_node_returns_none_for_missing() {
    let dag = bs_detector_dag();
    assert!(dag.get_node("nonexistent").is_none());
}

#[test]
fn is_complete_false_when_empty() {
    let dag = bs_detector_dag();
    let execution = DagExecution::new();
    assert!(!execution.is_complete(&dag));
}

#[test]
fn is_complete_false_when_partial() {
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();
    execution.nodes_completed.push("parser".into());
    execution.nodes_completed.push("citation-verifier".into());
    assert!(!execution.is_complete(&dag));
}

#[test]
fn is_complete_true_when_all_done() {
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();
    execution.nodes_completed = vec![
        "parser".into(),
        "citation-verifier".into(),
        "fact-checker".into(),
        "synthesizer".into(),
    ];
    assert!(execution.is_complete(&dag));
}

#[tokio::test]
async fn single_node_dag_executes() {
    let client = MockLlmClient::new(vec!["single output"]);
    let pipeline = DagPipeline::new(client);
    let dag = DagBuilder::new("single")
        .node(make_node("only"), &[])
        .build();
    let mut execution = DagExecution::new();

    let artifacts = pipeline.execute_all(&dag, &mut execution).await.unwrap();
    assert_eq!(artifacts.len(), 1);
    assert!(artifacts.contains_key("only"));
    assert!(execution.is_complete(&dag));
}

#[test]
fn empty_dag_validates() {
    let dag = DagDefinition {
        name: "empty".into(),
        description: String::new(),
        nodes: vec![],
    };
    assert!(dag.validate().is_ok());
}

#[tokio::test]
async fn empty_dag_executes_immediately() {
    let client = MockLlmClient::new(vec![]);
    let pipeline = DagPipeline::new(client.clone());
    let dag = DagDefinition {
        name: "empty".into(),
        description: String::new(),
        nodes: vec![],
    };
    let mut execution = DagExecution::new();

    let artifacts = pipeline.execute_all(&dag, &mut execution).await.unwrap();
    assert!(artifacts.is_empty());
    assert_eq!(client.calls(), 0);
}

#[test]
fn detect_ready_nodes_excludes_in_progress() {
    let dag = bs_detector_dag();
    let mut execution = DagExecution::new();
    execution.nodes_in_progress.push("parser".into());

    let ready = detect_ready_nodes(&dag, &execution);
    assert!(ready.is_empty()); // parser is the only root and it's in progress
}

#[test]
fn dag_builder_description() {
    let dag = DagBuilder::new("test")
        .description("A test DAG")
        .build();
    assert_eq!(dag.name, "test");
    assert_eq!(dag.description, "A test DAG");
    assert!(dag.nodes.is_empty());
}
