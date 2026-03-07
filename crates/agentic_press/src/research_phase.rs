use std::collections::HashSet;
use std::sync::Arc;

use anyhow::Result;
use tracing::info;

use deepseek::{DeepSeekClient, ReqwestClient};
use research::dual::{format_multi_unified_synthesis, MultiModelResearcher};
use research::paper::ResearchPaper;
use research::scholar::SEARCH_FIELDS;
use research::{CoreClient, CrossrefClient, OpenAlexClient, SemanticScholarClient};

use crate::prompts;

// ── Config ──────────────────────────────────────────────────────────────────

pub struct ResearchConfig {
    pub enable_paper_search: bool,
    pub enable_multi_model: bool,
}

impl Default for ResearchConfig {
    fn default() -> Self {
        Self {
            enable_paper_search: true,
            enable_multi_model: true,
        }
    }
}

// ── Output ──────────────────────────────────────────────────────────────────

pub struct ResearchOutput {
    pub notes: String,
    pub paper_count: usize,
}

// ── Stage A: paper search ───────────────────────────────────────────────────

async fn search_papers(query: &str) -> (Vec<ResearchPaper>, String) {
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();
    let scholar = SemanticScholarClient::new(scholar_key.as_deref());
    let openalex = OpenAlexClient::new(std::env::var("OPENALEX_MAILTO").ok().as_deref());
    let crossref = CrossrefClient::new(std::env::var("CROSSREF_MAILTO").ok().as_deref());
    let core = CoreClient::new(std::env::var("CORE_API_KEY").ok().as_deref());

    let (scholar_res, openalex_res, crossref_res, core_res) = tokio::join!(
        async {
            scholar
                .search_bulk(query, SEARCH_FIELDS, Some("2019-"), Some(3), Some("citationCount:desc"), 15)
                .await
                .map(|r| {
                    info!("  Semantic Scholar: {} papers", r.data.len());
                    r.data.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { info!("  Semantic Scholar failed: {e}"); vec![] })
        },
        async {
            openalex.search(query, 1, 10).await
                .map(|r| {
                    info!("  OpenAlex: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { info!("  OpenAlex failed: {e}"); vec![] })
        },
        async {
            crossref.search(query, 10, 0).await
                .map(|r| {
                    let items = r.message.and_then(|m| m.items).unwrap_or_default();
                    info!("  Crossref: {} papers", items.len());
                    items.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { info!("  Crossref failed: {e}"); vec![] })
        },
        async {
            core.search(query, 10, 0).await
                .map(|r| {
                    info!("  CORE: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { info!("  CORE failed: {e}"); vec![] })
        },
    );

    let mut all: Vec<ResearchPaper> = Vec::new();
    all.extend(scholar_res);
    all.extend(openalex_res);
    all.extend(crossref_res);
    all.extend(core_res);

    // Dedup by normalized title
    let mut seen = HashSet::new();
    all.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() { return false; }
        seen.insert(key)
    });

    // Sort by citations desc, keep top 10
    all.sort_by(|a, b| b.citation_count.unwrap_or(0).cmp(&a.citation_count.unwrap_or(0)));
    all.truncate(10);

    info!("Paper search: {} unique papers after dedup", all.len());

    if all.is_empty() {
        return (vec![], String::new());
    }

    // Format digest
    let mut digest = String::from("## Academic Papers Found\n\n");
    for (i, p) in all.iter().enumerate() {
        let authors = if p.authors.is_empty() {
            "Unknown".to_string()
        } else {
            p.authors.join(", ")
        };
        let year = p.year.map(|y| y.to_string()).unwrap_or("n/a".into());
        let cites = p.citation_count.unwrap_or(0);
        digest.push_str(&format!(
            "### {}. {} ({}) [{}]\n**Authors:** {}\n**Citations:** {}\n",
            i + 1, p.title, year, format!("{:?}", p.source), authors, cites,
        ));
        if let Some(abs) = &p.abstract_text {
            let truncated = if abs.len() > 300 {
                let mut end = 300;
                while !abs.is_char_boundary(end) { end -= 1; }
                format!("{}…", &abs[..end])
            } else {
                abs.clone()
            };
            digest.push_str(&format!("**Abstract:** {truncated}\n"));
        }
        digest.push('\n');
    }

    (all, digest)
}

// ── Stage B: full research phase ────────────────────────────────────────────

pub async fn research_phase(
    topic: &str,
    angle: &str,
    niche: &str,
    config: &ResearchConfig,
    ds_client: &Arc<DeepSeekClient<ReqwestClient>>,
) -> Result<ResearchOutput> {
    let brief = format!("Topic: {topic}\nAngle: {angle}\n");

    // Stage A — paper search
    let (papers, paper_digest) = if config.enable_paper_search {
        info!("Research phase: searching papers for '{topic}'");
        search_papers(topic).await
    } else {
        (vec![], String::new())
    };
    let paper_count = papers.len();

    // Stage B — multi-model or single-model synthesis
    let notes = if config.enable_multi_model {
        match MultiModelResearcher::from_env() {
            Ok(researcher) => {
                info!(
                    "Research phase: multi-model synthesis (providers: {})",
                    researcher.provider_names().join(", ")
                );
                let system = prompts::researcher_with_papers(niche);
                let user_input = if paper_digest.is_empty() {
                    brief.clone()
                } else {
                    format!("{brief}\n{paper_digest}")
                };
                let response = researcher.query(&system, &user_input).await?;
                format_multi_unified_synthesis(&response)
            }
            Err(e) => {
                info!("Multi-model init failed ({e:#}), falling back to DeepSeek-only");
                fallback_deepseek(ds_client, niche, &brief, &paper_digest).await?
            }
        }
    } else {
        fallback_deepseek(ds_client, niche, &brief, &paper_digest).await?
    };

    Ok(ResearchOutput { notes, paper_count })
}

async fn fallback_deepseek(
    client: &Arc<DeepSeekClient<ReqwestClient>>,
    niche: &str,
    brief: &str,
    paper_digest: &str,
) -> Result<String> {
    let system = if paper_digest.is_empty() {
        prompts::researcher(niche)
    } else {
        prompts::researcher_with_papers(niche)
    };
    let input = if paper_digest.is_empty() {
        brief.to_string()
    } else {
        format!("{brief}\n{paper_digest}")
    };
    let output = deepseek::reason_with_retry(client, &system, &input).await?;
    Ok(output.content)
}
