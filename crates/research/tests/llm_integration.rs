//! Integration tests for DeepSeek + Qwen LLM integration.
//!
//! All tests use wiremock to mock the LLM endpoints — no real API keys needed.

use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::agent::{provider_agent_builder, LlmProvider, Tool, ToolDefinition};

// ── DeepSeek reason() via mocked endpoint ────────────────────────────────

#[tokio::test]
async fn deepseek_reason_returns_content_and_reasoning() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-test-reason",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "The mitochondria is the powerhouse of the cell.",
                    "reasoning_content": "Let me think step by step about cell biology..."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 50, "completion_tokens": 30, "total_tokens": 80}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = deepseek::DeepSeekClient::new(deepseek::ReqwestClient::new(), "test-key")
        .with_base_url(server.uri());

    let output = deepseek::reason(
        &client,
        "You are a biology teacher.",
        "What is the mitochondria?",
    )
    .await
    .expect("reason() should succeed with mocked endpoint");

    assert_eq!(
        output.content,
        "The mitochondria is the powerhouse of the cell."
    );
    assert!(output.reasoning.contains("step by step"));
}

#[tokio::test]
async fn deepseek_reason_propagates_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/chat/completions"))
        .respond_with(ResponseTemplate::new(401).set_body_string("Unauthorized"))
        .expect(1)
        .mount(&server)
        .await;

    let client = deepseek::DeepSeekClient::new(deepseek::ReqwestClient::new(), "bad-key")
        .with_base_url(server.uri());

    let result = deepseek::reason(&client, "system", "user").await;
    assert!(result.is_err(), "should propagate 401 error");
}

#[tokio::test]
async fn deepseek_reason_empty_reasoning_still_works() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-no-reasoning",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Quick answer without reasoning."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 10, "completion_tokens": 8, "total_tokens": 18}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = deepseek::DeepSeekClient::new(deepseek::ReqwestClient::new(), "test-key")
        .with_base_url(server.uri());

    let output = deepseek::reason(&client, "system", "user")
        .await
        .expect("should succeed without reasoning_content");

    assert_eq!(output.content, "Quick answer without reasoning.");
    assert!(output.reasoning.is_empty());
}

// ── Qwen chat via mocked endpoint ────────────────────────────────────────

#[tokio::test]
async fn qwen_chat_returns_response() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-qwen-test",
            "model": "qwen-max",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "RNA interference silences gene expression."},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 30, "completion_tokens": 20, "total_tokens": 50}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let req = qwen::ChatRequest::new(
        "qwen-max",
        vec![
            qwen::ChatMessage::system("You are a molecular biologist."),
            qwen::ChatMessage::user("Explain RNA interference."),
        ],
    );

    let resp = client.chat(req).await.expect("chat should succeed");
    assert_eq!(
        resp.text().unwrap(),
        "RNA interference silences gene expression."
    );
}

#[tokio::test]
async fn qwen_chat_propagates_api_error() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/chat/completions"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal error"))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let req = qwen::ChatRequest::new("qwen-max", vec![qwen::ChatMessage::user("test")]);

    let result = client.chat(req).await;
    assert!(result.is_err(), "should propagate 500 error");
}

#[tokio::test]
async fn qwen_embed_one_returns_vector() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "object": "list",
            "data": [{
                "object": "embedding",
                "embedding": [0.1, 0.2, 0.3, 0.4],
                "index": 0
            }],
            "model": "text-embedding-v4",
            "usage": {"prompt_tokens": 5, "total_tokens": 5}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let vec = client
        .embed_one("test text")
        .await
        .expect("embed_one should succeed");

    assert_eq!(vec.len(), 4);
    assert!((vec[0] - 0.1).abs() < 1e-6);
    assert!((vec[3] - 0.4).abs() < 1e-6);
}

// ── DeepSeek agent — simple prompt (no tools) ────────────────────────────

#[tokio::test]
async fn deepseek_agent_simple_prompt_returns_text() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-agent-001",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Here is your research summary on CRISPR."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("You are a research assistant.")
        .build();

    let result = agent.prompt("Summarize CRISPR research.".into()).await;
    assert!(result.is_ok(), "agent prompt should succeed: {:?}", result);
    assert_eq!(
        result.unwrap(),
        "Here is your research summary on CRISPR."
    );
}

// ── Qwen agent — simple prompt ───────────────────────────────────────────

#[tokio::test]
async fn qwen_agent_simple_prompt_returns_text() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-qwen-agent",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Qwen agent response about transformers."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 80, "completion_tokens": 40, "total_tokens": 120}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let provider = LlmProvider::Qwen {
        api_key: "test-key".into(),
        model: "qwen-plus".into(),
    };

    let agent = provider_agent_builder(&provider)
        .base_url(&server.uri())
        .preamble("You are a research assistant.")
        .build();

    let result = agent
        .prompt("Explain transformer architecture.".into())
        .await;
    assert!(result.is_ok(), "qwen agent should succeed: {:?}", result);
    assert!(result.unwrap().contains("Qwen agent response"));
}

// ── Agent tool-use loop ──────────────────────────────────────────────────

struct EchoTool;

#[async_trait::async_trait]
impl Tool for EchoTool {
    fn name(&self) -> &str {
        "echo"
    }
    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: "echo".into(),
            description: "Echo back the input".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to echo"}
                },
                "required": ["text"]
            }),
        }
    }
    async fn call_json(&self, args: serde_json::Value) -> Result<String, String> {
        let text = args["text"].as_str().unwrap_or("no text");
        Ok(format!("ECHO: {text}"))
    }
}

#[tokio::test]
async fn agent_executes_tool_call_then_returns_final_answer() {
    let server = MockServer::start().await;

    // First LLM response: tool call
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-tool-001",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_abc123",
                        "type": "function",
                        "function": {
                            "name": "echo",
                            "arguments": "{\"text\":\"hello world\"}"
                        }
                    }]
                },
                "finish_reason": "tool_calls"
            }],
            "usage": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70}
        })))
        .up_to_n_times(1)
        .expect(1)
        .mount(&server)
        .await;

    // Second LLM response: final answer incorporating tool result
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-tool-002",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "The echo tool returned: ECHO: hello world"
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 30, "total_tokens": 130}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("You have an echo tool. Use it.")
        .tool(EchoTool)
        .build();

    let result = agent.prompt("Please echo 'hello world'".into()).await;
    assert!(result.is_ok(), "tool-use loop should succeed: {:?}", result);
    let output = result.unwrap();
    assert!(
        output.contains("ECHO: hello world"),
        "final answer should incorporate tool result: {output}"
    );
}

#[tokio::test]
async fn agent_handles_unknown_tool_gracefully() {
    let server = MockServer::start().await;

    // LLM calls a tool that doesn't exist
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-unknown-tool",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_bad",
                        "type": "function",
                        "function": {
                            "name": "nonexistent_tool",
                            "arguments": "{}"
                        }
                    }]
                },
                "finish_reason": "tool_calls"
            }],
            "usage": {"prompt_tokens": 50, "completion_tokens": 10, "total_tokens": 60}
        })))
        .up_to_n_times(1)
        .expect(1)
        .mount(&server)
        .await;

    // LLM recovers after seeing "Unknown tool" result
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-recovery",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "I apologize, that tool is not available."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 80, "completion_tokens": 15, "total_tokens": 95}
        })))
        .expect(1)
        .mount(&server)
        .await;

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("test")
        .tool(EchoTool) // only "echo" is registered
        .build();

    let result = agent.prompt("Call nonexistent_tool".into()).await;
    assert!(result.is_ok(), "should recover from unknown tool: {:?}", result);
}

// ── Agent with SearchPapers tool (full pipeline) ─────────────────────────

#[tokio::test]
async fn agent_uses_search_papers_tool_end_to_end() {
    let llm_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;
    let s2_server = MockServer::start().await;

    // OpenAlex returns papers when search_papers tool is invoked
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [{
                "id": "https://openalex.org/W111",
                "title": "CRISPR-Cas9 for Genome Editing",
                "publication_year": 2023,
                "cited_by_count": 500
            }]
        })))
        .mount(&oa_server)
        .await;

    // First LLM response: call search_papers tool
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-pipe-001",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_search_001",
                        "type": "function",
                        "function": {
                            "name": "search_papers",
                            "arguments": "{\"query\":\"CRISPR genome editing\"}"
                        }
                    }]
                },
                "finish_reason": "tool_calls"
            }],
            "usage": {"prompt_tokens": 100, "completion_tokens": 30, "total_tokens": 130}
        })))
        .up_to_n_times(1)
        .expect(1)
        .mount(&llm_server)
        .await;

    // Second LLM response: final synthesis after receiving tool results
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "chatcmpl-pipe-002",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "Based on search results, CRISPR-Cas9 is a revolutionary genome editing tool."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 300, "completion_tokens": 50, "total_tokens": 350}
        })))
        .expect(1)
        .mount(&llm_server)
        .await;

    let s2_client =
        research::scholar::SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = research::tools::FallbackClients {
        openalex: research::openalex::OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: research::crossref::CrossrefClient::with_base_url(&cr_server.uri(), None),
        zenodo: None,
    };
    let search_tool = research::tools::SearchPapers::with_fallback(
        s2_client,
        research::tools::SearchToolConfig::default(),
        fallback,
    );

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: llm_server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("You are a research assistant. Search for papers and summarize findings.")
        .tool(search_tool)
        .build();

    let result = agent
        .prompt("Find papers about CRISPR genome editing.".into())
        .await;
    assert!(result.is_ok(), "full pipeline should succeed: {:?}", result);
    let output = result.unwrap();
    assert!(
        output.contains("CRISPR"),
        "output should mention the research topic: {output}"
    );
}

// ── Agent with multiple tool calls in sequence ───────────────────────────

#[tokio::test]
async fn agent_handles_search_then_detail_tool_calls() {
    let llm_server = MockServer::start().await;
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;
    let s2_server = MockServer::start().await;

    // OpenAlex search results
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [{
                "id": "https://openalex.org/W222",
                "title": "Attention Is All You Need",
                "publication_year": 2017,
                "cited_by_count": 80000
            }]
        })))
        .mount(&oa_server)
        .await;

    // S2 get_paper for detail
    Mock::given(method("GET"))
        .and(path_regex("/graph/v1/paper/"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "paperId": "abc123",
            "title": "Attention Is All You Need",
            "year": 2017,
            "abstract": "We propose a new architecture based entirely on attention mechanisms.",
            "citationCount": 80000,
            "influentialCitationCount": 5000,
            "authors": [{"authorId": "1", "name": "Ashish Vaswani"}],
            "venue": "NeurIPS",
            "isOpenAccess": true,
            "openAccessPdf": {"url": "https://arxiv.org/pdf/1706.03762"},
            "url": "https://www.semanticscholar.org/paper/abc123"
        })))
        .mount(&s2_server)
        .await;

    // Turn 1: LLM calls search_papers
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "turn-1",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_search",
                        "type": "function",
                        "function": {
                            "name": "search_papers",
                            "arguments": "{\"query\":\"attention mechanism transformers\"}"
                        }
                    }]
                },
                "finish_reason": "tool_calls"
            }],
            "usage": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70}
        })))
        .up_to_n_times(1)
        .expect(1)
        .mount(&llm_server)
        .await;

    // Turn 2: LLM calls get_paper_detail
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "turn-2",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_detail",
                        "type": "function",
                        "function": {
                            "name": "get_paper_detail",
                            "arguments": "{\"paper_id\":\"abc123\"}"
                        }
                    }]
                },
                "finish_reason": "tool_calls"
            }],
            "usage": {"prompt_tokens": 200, "completion_tokens": 20, "total_tokens": 220}
        })))
        .up_to_n_times(1)
        .expect(1)
        .mount(&llm_server)
        .await;

    // Turn 3: LLM returns final synthesis
    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "id": "turn-3",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "The transformer architecture (Vaswani et al., 2017) with 80K citations revolutionized NLP."
                },
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 400, "completion_tokens": 50, "total_tokens": 450}
        })))
        .expect(1)
        .mount(&llm_server)
        .await;

    let s2_client =
        research::scholar::SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = research::tools::FallbackClients {
        openalex: research::openalex::OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: research::crossref::CrossrefClient::with_base_url(&cr_server.uri(), None),
        zenodo: None,
    };

    let search_tool = research::tools::SearchPapers::with_fallback(
        s2_client.clone(),
        research::tools::SearchToolConfig::default(),
        fallback.clone(),
    );
    let detail_tool = research::tools::GetPaperDetail::with_fallback(
        s2_client,
        research::tools::SearchToolConfig::default(),
        fallback,
    );

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: llm_server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("Search papers, then get details on the most cited one.")
        .tool(search_tool)
        .tool(detail_tool)
        .build();

    let result = agent
        .prompt("Find the most influential transformer paper.".into())
        .await;
    assert!(result.is_ok(), "multi-tool pipeline should succeed: {:?}", result);
    let output = result.unwrap();
    assert!(
        output.contains("Vaswani") || output.contains("transformer") || output.contains("80K"),
        "should reference paper details: {output}"
    );
}

// ── Provider switching: same test, different providers ────────────────────

#[tokio::test]
async fn provider_switching_deepseek_and_qwen_produce_output() {
    let ds_server = MockServer::start().await;
    let qw_server = MockServer::start().await;

    let response_body = serde_json::json!({
        "id": "chatcmpl-switch",
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Provider test response."
            },
            "finish_reason": "stop"
        }],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}
    });

    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response_body.clone()))
        .expect(1)
        .mount(&ds_server)
        .await;

    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(200).set_body_json(response_body))
        .expect(1)
        .mount(&qw_server)
        .await;

    // DeepSeek provider
    let ds_provider = LlmProvider::DeepSeek {
        api_key: "ds-key".into(),
        base_url: ds_server.uri(),
    };
    let ds_agent = provider_agent_builder(&ds_provider)
        .preamble("test")
        .build();
    let ds_result = ds_agent.prompt("test".into()).await;
    assert!(ds_result.is_ok(), "DeepSeek agent should work");
    assert_eq!(ds_result.unwrap(), "Provider test response.");

    // Qwen provider
    let qw_provider = LlmProvider::Qwen {
        api_key: "qw-key".into(),
        model: "qwen-max".into(),
    };
    let qw_agent = provider_agent_builder(&qw_provider)
        .base_url(&qw_server.uri())
        .preamble("test")
        .build();
    let qw_result = qw_agent.prompt("test".into()).await;
    assert!(qw_result.is_ok(), "Qwen agent should work");
    assert_eq!(qw_result.unwrap(), "Provider test response.");
}

// ── LLM error mid-agent-loop ─────────────────────────────────────────────

#[tokio::test]
async fn agent_propagates_llm_error_during_prompt() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/v1/chat/completions"))
        .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
        .expect(1)
        .mount(&server)
        .await;

    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: server.uri(),
    };

    let agent = provider_agent_builder(&provider)
        .preamble("test")
        .build();

    let result = agent.prompt("test".into()).await;
    assert!(result.is_err(), "should propagate LLM 503 error");
}
