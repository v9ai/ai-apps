use std::sync::Arc;

use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::agent::{provider_agent_builder, qwen_agent_builder, LlmProvider, Tool};
use research::embeddings::EmbeddingRanker;
use research::Ranker;
use research::paper::{PaperSource, ResearchPaper};
use research::tools::{SearchPapers, SearchToolConfig};

// ── Helper ──────────────────────────────────────────────────────────

fn make_paper(title: &str, abstract_text: Option<&str>) -> ResearchPaper {
    ResearchPaper {
        title: title.to_string(),
        abstract_text: abstract_text.map(|s| s.to_string()),
        authors: vec!["Author".into()],
        year: Some(2024),
        doi: None,
        citation_count: Some(10),
        url: None,
        pdf_url: None,
        source: PaperSource::OpenAlex,
        source_id: format!("id-{title}"),
        fields_of_study: None,
    }
}

// ── LlmProvider construction ────────────────────────────────────────

#[test]
fn llm_provider_deepseek_variant_clones() {
    let p = LlmProvider::DeepSeek {
        api_key: "sk-test".into(),
        base_url: "https://api.deepseek.com".into(),
    };
    let p2 = p.clone();
    match p2 {
        LlmProvider::DeepSeek { api_key, base_url } => {
            assert_eq!(api_key, "sk-test");
            assert_eq!(base_url, "https://api.deepseek.com");
        }
        _ => panic!("expected DeepSeek variant"),
    }
}

#[test]
fn llm_provider_qwen_variant_clones() {
    let p = LlmProvider::Qwen {
        api_key: "ds-test".into(),
        model: "qwen-plus".into(),
    };
    let p2 = p.clone();
    match p2 {
        LlmProvider::Qwen { api_key, model } => {
            assert_eq!(api_key, "ds-test");
            assert_eq!(model, "qwen-plus");
        }
        _ => panic!("expected Qwen variant"),
    }
}

#[test]
fn llm_provider_debug_does_not_panic() {
    let ds = LlmProvider::DeepSeek {
        api_key: "k".into(),
        base_url: "u".into(),
    };
    let qw = LlmProvider::Qwen {
        api_key: "k".into(),
        model: "m".into(),
    };
    // Just verify Debug impl doesn't panic.
    let _ = format!("{:?}", ds);
    let _ = format!("{:?}", qw);
}

// ── provider_agent_builder doesn't panic ────────────────────────────

#[test]
fn provider_agent_builder_deepseek_builds() {
    let provider = LlmProvider::DeepSeek {
        api_key: "test-key".into(),
        base_url: "https://api.deepseek.com".into(),
    };
    // Should not panic.
    let _agent = provider_agent_builder(&provider).build();
}

#[test]
fn provider_agent_builder_qwen_builds() {
    let provider = LlmProvider::Qwen {
        api_key: "test-key".into(),
        model: "qwen-plus".into(),
    };
    let _agent = provider_agent_builder(&provider).build();
}

#[test]
fn qwen_agent_builder_builds() {
    let _agent = qwen_agent_builder("test-key", "qwen-max").build();
}

// ── EmbeddingRanker with mock DashScope ─────────────────────────────

#[tokio::test]
async fn embedding_ranker_ranks_papers_by_similarity() {
    let server = MockServer::start().await;

    // The ranker sends 1 query + 3 papers = 4 embeddings.
    // We make paper[1] ("neural networks") most similar to the query by giving
    // them the same embedding vector.
    let data = serde_json::json!({
        "object": "list",
        "data": [
            { "object": "embedding", "embedding": [1.0, 0.0, 0.0, 0.0], "index": 0 },
            { "object": "embedding", "embedding": [0.0, 1.0, 0.0, 0.0], "index": 1 },
            { "object": "embedding", "embedding": [0.9, 0.1, 0.0, 0.0], "index": 2 },
            { "object": "embedding", "embedding": [0.0, 0.0, 1.0, 0.0], "index": 3 }
        ],
        "model": "text-embedding-v4",
        "usage": { "prompt_tokens": 20, "total_tokens": 20 }
    });

    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(data))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let ranker = EmbeddingRanker::with_client(client);

    let papers = vec![
        make_paper("quantum computing", Some("quantum bits and entanglement")),
        make_paper("neural networks", Some("deep learning architectures")),
        make_paper("graph theory", Some("nodes and edges in networks")),
    ];

    let ranked = ranker
        .rank_papers("machine learning", papers)
        .await
        .expect("ranking should succeed");

    assert_eq!(ranked.len(), 3);

    // Paper at index 2 (neural networks, embedding [0.9, 0.1, 0, 0]) is most
    // similar to query (embedding [1.0, 0, 0, 0]) — cosine ≈ 0.994.
    assert_eq!(ranked[0].0.title, "neural networks");
    assert!(ranked[0].1 > 0.9, "top score should be > 0.9, got {}", ranked[0].1);

    // Scores should be descending.
    for w in ranked.windows(2) {
        assert!(
            w[0].1 >= w[1].1,
            "scores should be descending: {} >= {}",
            w[0].1,
            w[1].1
        );
    }
}

#[tokio::test]
async fn embedding_ranker_empty_papers_returns_empty() {
    let ranker = EmbeddingRanker::new("unused-key");
    let result = ranker.rank_papers("test query", vec![]).await.unwrap();
    assert!(result.is_empty());
}

#[tokio::test]
async fn embedding_ranker_single_paper() {
    let server = MockServer::start().await;

    // 1 query + 1 paper = 2 embeddings.
    let data = serde_json::json!({
        "object": "list",
        "data": [
            { "object": "embedding", "embedding": [1.0, 0.0], "index": 0 },
            { "object": "embedding", "embedding": [0.8, 0.6], "index": 1 }
        ],
        "model": "text-embedding-v4",
        "usage": { "prompt_tokens": 10, "total_tokens": 10 }
    });

    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(data))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let ranker = EmbeddingRanker::with_client(client);

    let papers = vec![make_paper("only paper", Some("abstract"))];
    let ranked = ranker.rank_papers("query", papers).await.unwrap();

    assert_eq!(ranked.len(), 1);
    assert_eq!(ranked[0].0.title, "only paper");
    assert!(ranked[0].1 > 0.0);
}

#[tokio::test]
async fn embedding_ranker_api_error_propagates() {
    let server = MockServer::start().await;

    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
        .expect(1)
        .mount(&server)
        .await;

    let client = qwen::Client::new("test-key").with_base_url(server.uri());
    let ranker = EmbeddingRanker::with_client(client);

    let papers = vec![make_paper("paper", None)];
    let result = ranker.rank_papers("query", papers).await;

    assert!(result.is_err(), "expected error on 500 response");
}

// ── SearchPapers with embedding re-ranking (end-to-end) ─────────────

#[tokio::test]
async fn search_papers_with_embedding_reranker() {
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;
    let s2_server = MockServer::start().await;
    let emb_server = MockServer::start().await;

    // OpenAlex returns 3 papers in a specific order.
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [
                {
                    "id": "https://openalex.org/W001",
                    "title": "Irrelevant Paper About Cooking",
                    "publication_year": 2024
                },
                {
                    "id": "https://openalex.org/W002",
                    "title": "Deep Learning for NLP",
                    "publication_year": 2024
                },
                {
                    "id": "https://openalex.org/W003",
                    "title": "Somewhat Related ML Paper",
                    "publication_year": 2024
                }
            ]
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    // Embedding endpoint: query + 3 papers = 4 embeddings.
    // Make paper 2 (Deep Learning for NLP) most similar to query.
    let emb_data = serde_json::json!({
        "object": "list",
        "data": [
            { "object": "embedding", "embedding": [1.0, 0.0, 0.0, 0.0], "index": 0 },
            { "object": "embedding", "embedding": [0.1, 0.9, 0.0, 0.0], "index": 1 },
            { "object": "embedding", "embedding": [0.95, 0.05, 0.0, 0.0], "index": 2 },
            { "object": "embedding", "embedding": [0.5, 0.5, 0.0, 0.0], "index": 3 }
        ],
        "model": "text-embedding-v4",
        "usage": { "prompt_tokens": 20, "total_tokens": 20 }
    });

    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(200).set_body_json(emb_data))
        .expect(1)
        .mount(&emb_server)
        .await;

    let s2_client =
        research::scholar::SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = research::tools::FallbackClients {
        openalex: research::openalex::OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: research::crossref::CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let emb_client = qwen::Client::new("test-key").with_base_url(emb_server.uri());
    let ranker = Arc::new(EmbeddingRanker::with_client(emb_client));

    let tool = SearchPapers::with_fallback(s2_client, SearchToolConfig::default(), fallback)
        .with_ranker(ranker);

    let result = tool
        .call_json(serde_json::json!({ "query": "deep learning NLP" }))
        .await;

    assert!(result.is_ok(), "expected success, got: {:?}", result);
    let output = result.unwrap();

    // Parse the JSON output to verify order.
    let parsed: serde_json::Value = serde_json::from_str(&output).unwrap();
    let papers = parsed["papers"].as_array().unwrap();
    assert_eq!(papers.len(), 3);

    // After re-ranking, "Deep Learning for NLP" (index 2, emb [0.95, 0.05])
    // should be first since it's most similar to query [1.0, 0.0].
    assert_eq!(
        papers[0]["title"].as_str().unwrap(),
        "Deep Learning for NLP",
        "expected most relevant paper first after re-ranking"
    );
}

#[tokio::test]
async fn search_papers_without_ranker_preserves_original_order() {
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;
    let s2_server = MockServer::start().await;

    // OpenAlex returns papers in a specific order.
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [
                {
                    "id": "https://openalex.org/W001",
                    "title": "First Paper",
                    "publication_year": 2024
                },
                {
                    "id": "https://openalex.org/W002",
                    "title": "Second Paper",
                    "publication_year": 2024
                }
            ]
        })))
        .expect(1)
        .mount(&oa_server)
        .await;

    let s2_client =
        research::scholar::SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = research::tools::FallbackClients {
        openalex: research::openalex::OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: research::crossref::CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    // No embedding ranker.
    let tool = SearchPapers::with_fallback(s2_client, SearchToolConfig::default(), fallback);

    let result = tool
        .call_json(serde_json::json!({ "query": "test" }))
        .await
        .unwrap();

    let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
    let papers = parsed["papers"].as_array().unwrap();
    assert_eq!(papers[0]["title"].as_str().unwrap(), "First Paper");
    assert_eq!(papers[1]["title"].as_str().unwrap(), "Second Paper");
}

#[tokio::test]
async fn search_papers_embedding_error_falls_back_to_original_order() {
    let oa_server = MockServer::start().await;
    let cr_server = MockServer::start().await;
    let s2_server = MockServer::start().await;
    let emb_server = MockServer::start().await;

    // OpenAlex returns papers.
    Mock::given(method("GET"))
        .and(path_regex("/works"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
            "results": [
                {
                    "id": "https://openalex.org/W001",
                    "title": "Alpha Paper",
                    "publication_year": 2024
                },
                {
                    "id": "https://openalex.org/W002",
                    "title": "Beta Paper",
                    "publication_year": 2024
                }
            ]
        })))
        // Called twice: once for initial fetch, once for fallback re-fetch.
        .expect(2)
        .mount(&oa_server)
        .await;

    // Embedding endpoint returns 500 (simulating API failure).
    Mock::given(method("POST"))
        .and(path_regex("/embeddings"))
        .respond_with(ResponseTemplate::new(500).set_body_string("Service Unavailable"))
        .expect(1)
        .mount(&emb_server)
        .await;

    let s2_client =
        research::scholar::SemanticScholarClient::with_base_url(&s2_server.uri(), None);
    let fallback = research::tools::FallbackClients {
        openalex: research::openalex::OpenAlexClient::with_base_url(&oa_server.uri(), None),
        crossref: research::crossref::CrossrefClient::with_base_url(&cr_server.uri(), None),
    };

    let emb_client = qwen::Client::new("test-key").with_base_url(emb_server.uri());
    let ranker = Arc::new(EmbeddingRanker::with_client(emb_client));

    let tool = SearchPapers::with_fallback(s2_client, SearchToolConfig::default(), fallback)
        .with_ranker(ranker);

    let result = tool
        .call_json(serde_json::json!({ "query": "test" }))
        .await;

    // Should succeed even when embedding endpoint fails — falls back to re-fetch.
    assert!(
        result.is_ok(),
        "expected graceful degradation, got: {:?}",
        result
    );
    let output = result.unwrap();
    assert!(
        output.contains("Alpha Paper"),
        "should still contain papers: {output}"
    );
}

// ── TeamConfig construction with providers ──────────────────────────

#[test]
fn team_config_accepts_deepseek_provider() {
    use research::team::{TeamConfig, TeamLead};

    let _lead = TeamLead::new(TeamConfig {
        team_size: 2,
        provider: LlmProvider::DeepSeek {
            api_key: "test".into(),
            base_url: "https://api.deepseek.com".into(),
        },
        scholar_key: None,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
        tool_config: None,
        scholar_concurrency: None,
        mailto: None,
        output_dir: None,
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });
}

#[test]
fn team_config_accepts_qwen_provider() {
    use research::team::{TeamConfig, TeamLead};

    let _lead = TeamLead::new(TeamConfig {
        team_size: 2,
        provider: LlmProvider::Qwen {
            api_key: "ds-test".into(),
            model: "qwen-plus".into(),
        },
        scholar_key: None,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
        tool_config: None,
        scholar_concurrency: None,
        mailto: None,
        output_dir: None,
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });
}

#[test]
fn team_config_separate_synthesis_provider() {
    use research::team::{TeamConfig, TeamLead};

    let _lead = TeamLead::new(TeamConfig {
        team_size: 2,
        provider: LlmProvider::DeepSeek {
            api_key: "ds-key".into(),
            base_url: "https://api.deepseek.com".into(),
        },
        scholar_key: None,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
        tool_config: None,
        scholar_concurrency: None,
        mailto: None,
        output_dir: None,
        synthesis_provider: Some(LlmProvider::Qwen {
            api_key: "qw-key".into(),
            model: "qwen-max".into(),
        }),
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });
}
