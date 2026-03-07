use serial_test::serial;

use research::dual::{
    format_multi_unified_synthesis, format_unified_synthesis, ModelResponse, MultiResponse,
    DualResponse,
};
use research::openalex::OpenAlexClient;
use research::crossref::CrossrefClient;
use research::core_api::CoreClient;
use research::scholar::SemanticScholarClient;
use research::ResearchPaper;

// ── OpenAlex ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn openalex_search_returns_results() {
    let client = OpenAlexClient::new(None);
    let resp = client.search("machine learning", 1, 5).await.unwrap();
    assert!(!resp.results.is_empty(), "expected OpenAlex search results");
}

#[tokio::test]
#[serial]
async fn openalex_get_work_by_id() {
    let client = OpenAlexClient::new(None);
    // "Attention Is All You Need" — well-known, stable OpenAlex ID
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    let title = work.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );
}

#[tokio::test]
#[serial]
async fn openalex_abstract_reconstruction() {
    let client = OpenAlexClient::new(None);
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    if let Some(abstract_text) = work.reconstruct_abstract() {
        assert!(
            abstract_text.len() > 20,
            "reconstructed abstract too short: {abstract_text}"
        );
    }
    // Some works may not have an inverted index — that's OK
}

#[tokio::test]
#[serial]
async fn openalex_to_research_paper() {
    let client = OpenAlexClient::new(None);
    let work = client.get_work("https://openalex.org/W2626778328").await.unwrap();
    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty(), "expected non-empty title");
    assert!(!paper.authors.is_empty(), "expected authors");
}

// ── Crossref ──────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn crossref_search_returns_results() {
    let client = CrossrefClient::new(None);
    let resp = client.search("CRISPR genome editing", 5, 0).await.unwrap();
    let items = resp
        .message
        .as_ref()
        .and_then(|m| m.items.as_ref())
        .expect("expected items in response");
    assert!(!items.is_empty(), "expected Crossref search results");
}

#[tokio::test]
#[serial]
async fn crossref_get_work_by_doi() {
    let client = CrossrefClient::new(None);
    // "CRISPR-Cas9" landmark paper in Nature
    let work = client.get_work("10.1038/nature12373").await.unwrap();
    let title = work
        .title
        .as_ref()
        .and_then(|t| t.first())
        .cloned()
        .unwrap_or_default();
    assert!(!title.is_empty(), "expected non-empty title for DOI");
}

#[tokio::test]
#[serial]
async fn crossref_to_research_paper() {
    let client = CrossrefClient::new(None);
    let work = client.get_work("10.1038/nature12373").await.unwrap();
    let paper: ResearchPaper = work.into();
    assert!(!paper.title.is_empty());
    assert!(paper.doi.is_some(), "expected DOI on crossref paper");
}

// ── CORE ──────────────────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn core_search_returns_results() {
    let client = CoreClient::new(None);
    let resp = client.search("deep learning", 5, 0).await.unwrap();
    assert!(!resp.results.is_empty(), "expected CORE search results");
}

#[tokio::test]
#[serial]
async fn core_get_work_and_convert() {
    let client = CoreClient::new(None);
    // Search first to get a valid ID
    let resp = client.search("neural networks", 1, 0).await.unwrap();
    if let Some(work) = resp.results.into_iter().next() {
        if let Some(id) = work.id {
            let fetched = client.get_work(&id.to_string()).await.unwrap();
            let paper: ResearchPaper = fetched.into();
            assert!(!paper.title.is_empty(), "expected non-empty title from CORE");
        }
    }
}

// ── Semantic Scholar ──────────────────────────────────────────────────

#[tokio::test]
#[serial]
async fn scholar_search_returns_results() {
    let client = SemanticScholarClient::new(None);
    let resp = client
        .search(
            "transformer architecture",
            research::scholar::types::SEARCH_FIELDS,
            5,
            0,
        )
        .await
        .unwrap();
    assert!(!resp.data.is_empty(), "expected Semantic Scholar results");
}

#[tokio::test]
#[serial]
async fn scholar_get_paper_by_id() {
    let client = SemanticScholarClient::new(None);
    // "Attention Is All You Need" S2 ID
    let paper = client
        .get_paper(
            "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
            research::scholar::types::PAPER_FIELDS_FULL,
        )
        .await
        .unwrap();
    let title = paper.title.as_deref().unwrap_or("");
    assert!(
        title.to_lowercase().contains("attention"),
        "expected 'attention' in title, got: {title}"
    );
}

#[tokio::test]
#[serial]
async fn scholar_to_research_paper() {
    let client = SemanticScholarClient::new(None);
    let paper = client
        .get_paper(
            "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
            research::scholar::types::PAPER_FIELDS_FULL,
        )
        .await
        .unwrap();
    let rp: ResearchPaper = paper.into();
    assert!(!rp.title.is_empty());
    assert!(!rp.authors.is_empty());
}

// ── Paper deduplication ──────────────────────────────────────────────

#[test]
fn dedup_papers_by_normalized_title() {
    use research::paper::PaperSource;

    let make = |title: &str, source: PaperSource, cites: u64| ResearchPaper {
        title: title.to_string(),
        abstract_text: None,
        authors: vec![],
        year: Some(2023),
        doi: None,
        citation_count: Some(cites),
        url: None,
        pdf_url: None,
        source,
        source_id: format!("id-{title}"),
    };

    let mut papers = vec![
        make("Attention Is All You Need", PaperSource::SemanticScholar, 100),
        make("attention is all you need", PaperSource::OpenAlex, 50),
        make("  Attention Is All You Need  ", PaperSource::Crossref, 30),
        make("A Different Paper", PaperSource::Core, 10),
    ];

    let mut seen = std::collections::HashSet::new();
    papers.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() { return false; }
        seen.insert(key)
    });

    assert_eq!(papers.len(), 2, "expected 2 unique papers after dedup");
    assert_eq!(papers[0].title, "Attention Is All You Need");
    assert_eq!(papers[1].title, "A Different Paper");
}

#[test]
fn dedup_removes_empty_titles() {
    use research::paper::PaperSource;

    let papers_raw = vec![
        ResearchPaper {
            title: "".to_string(),
            abstract_text: None,
            authors: vec![],
            year: None,
            doi: None,
            citation_count: None,
            url: None,
            pdf_url: None,
            source: PaperSource::OpenAlex,
            source_id: "empty".into(),
        },
        ResearchPaper {
            title: "   ".to_string(),
            abstract_text: None,
            authors: vec![],
            year: None,
            doi: None,
            citation_count: None,
            url: None,
            pdf_url: None,
            source: PaperSource::Core,
            source_id: "blank".into(),
        },
    ];

    let mut papers = papers_raw;
    let mut seen = std::collections::HashSet::new();
    papers.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() { return false; }
        seen.insert(key)
    });

    assert!(papers.is_empty(), "empty/blank titles should be removed");
}

#[test]
fn papers_sort_by_citations_descending() {
    use research::paper::PaperSource;

    let make = |title: &str, cites: Option<u64>| ResearchPaper {
        title: title.into(),
        abstract_text: None,
        authors: vec![],
        year: None,
        doi: None,
        citation_count: cites,
        url: None,
        pdf_url: None,
        source: PaperSource::SemanticScholar,
        source_id: title.into(),
    };

    let mut papers = vec![
        make("low", Some(5)),
        make("none", None),
        make("high", Some(999)),
        make("mid", Some(50)),
    ];

    papers.sort_by(|a, b| b.citation_count.unwrap_or(0).cmp(&a.citation_count.unwrap_or(0)));

    assert_eq!(papers[0].title, "high");
    assert_eq!(papers[1].title, "mid");
    assert_eq!(papers[2].title, "low");
    assert_eq!(papers[3].title, "none");
}

// ── Synthesis selection ──────────────────────────────────────────────

#[test]
fn multi_synthesis_picks_longest_successful() {
    let resp = MultiResponse {
        question: "test".into(),
        responses: vec![
            ModelResponse {
                model: "deepseek-reasoner".into(),
                content: "Short answer.".into(),
                reasoning: String::new(),
            },
            ModelResponse {
                model: "qwen-max".into(),
                content: "This is a much longer and more detailed answer with lots of content.".into(),
                reasoning: String::new(),
            },
        ],
    };

    let result = format_multi_unified_synthesis(&resp);
    assert!(result.contains("much longer"), "should pick the longer response");
}

#[test]
fn multi_synthesis_skips_errors() {
    let resp = MultiResponse {
        question: "test".into(),
        responses: vec![
            ModelResponse {
                model: "deepseek-reasoner".into(),
                content: "[DeepSeek error: timeout]".into(),
                reasoning: String::new(),
            },
            ModelResponse {
                model: "qwen-max".into(),
                content: "Valid synthesis content here.".into(),
                reasoning: String::new(),
            },
        ],
    };

    let result = format_multi_unified_synthesis(&resp);
    assert_eq!(result, "Valid synthesis content here.");
}

#[test]
fn multi_synthesis_all_errors_fallback() {
    let resp = MultiResponse {
        question: "test".into(),
        responses: vec![
            ModelResponse {
                model: "deepseek-reasoner".into(),
                content: "[DeepSeek error: fail]".into(),
                reasoning: String::new(),
            },
            ModelResponse {
                model: "qwen-max".into(),
                content: "[Qwen error: fail]".into(),
                reasoning: String::new(),
            },
        ],
    };

    let result = format_multi_unified_synthesis(&resp);
    assert!(result.contains("could not be generated"), "should return fallback message");
}

#[test]
fn dual_synthesis_prefers_longer() {
    let resp = DualResponse {
        question: "test".into(),
        deepseek: ModelResponse {
            model: "deepseek-reasoner".into(),
            content: "A very detailed deepseek response with many insights.".into(),
            reasoning: String::new(),
        },
        qwen: ModelResponse {
            model: "qwen-max".into(),
            content: "Short qwen.".into(),
            reasoning: String::new(),
        },
    };

    let result = format_unified_synthesis(&resp);
    assert!(result.contains("deepseek"), "should pick longer deepseek response");
}

#[test]
fn dual_synthesis_falls_back_on_single_error() {
    let resp = DualResponse {
        question: "test".into(),
        deepseek: ModelResponse {
            model: "deepseek-reasoner".into(),
            content: "[DeepSeek error: rate limited]".into(),
            reasoning: String::new(),
        },
        qwen: ModelResponse {
            model: "qwen-max".into(),
            content: "Qwen provided this synthesis.".into(),
            reasoning: String::new(),
        },
    };

    let result = format_unified_synthesis(&resp);
    assert_eq!(result, "Qwen provided this synthesis.");
}

// ── Crossref abstract cleaning ───────────────────────────────────────

#[test]
fn crossref_strips_jats_tags() {
    use research::crossref::CrossrefWork;

    let work = CrossrefWork {
        doi: Some("10.1234/test".into()),
        title: Some(vec!["Test".into()]),
        abstract_text: Some("<jats:p>This is <jats:italic>important</jats:italic> text.</jats:p>".into()),
        author: None,
        published: None,
        is_referenced_by_count: None,
        url: None,
        link: None,
        container_title: None,
        work_type: None,
    };

    let paper: ResearchPaper = work.into();
    let abs = paper.abstract_text.unwrap();
    assert!(!abs.contains('<'), "JATS tags should be stripped: {abs}");
    assert!(abs.contains("important"), "content should remain");
}
