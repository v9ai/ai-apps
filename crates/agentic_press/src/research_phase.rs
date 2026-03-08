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

// ── Extracted pure functions ────────────────────────────────────────────────

/// Deduplicate papers by normalized title, remove empty titles, sort by
/// citations descending, and truncate to `limit`.
pub fn deduplicate_and_rank(mut papers: Vec<ResearchPaper>, limit: usize) -> Vec<ResearchPaper> {
    let mut seen = HashSet::new();
    papers.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() {
            return false;
        }
        seen.insert(key)
    });
    papers.sort_by(|a, b| {
        b.citation_count
            .unwrap_or(0)
            .cmp(&a.citation_count.unwrap_or(0))
    });
    papers.truncate(limit);
    papers
}

/// Format a list of papers into a readable markdown digest.
pub fn format_paper_digest(papers: &[ResearchPaper]) -> String {
    if papers.is_empty() {
        return String::new();
    }

    let mut digest = String::from("## Academic Papers Found\n\n");
    for (i, p) in papers.iter().enumerate() {
        let authors = if p.authors.is_empty() {
            "Unknown".to_string()
        } else {
            p.authors.join(", ")
        };
        let year = p.year.map(|y| y.to_string()).unwrap_or("n/a".into());
        let cites = p.citation_count.unwrap_or(0);
        digest.push_str(&format!(
            "### {}. {} ({}) [{:?}]\n**Authors:** {}\n**Citations:** {}\n",
            i + 1, p.title, year, p.source, authors, cites,
        ));
        if let Some(abs) = &p.abstract_text {
            let truncated = if abs.len() > 300 {
                let mut end = 300;
                while !abs.is_char_boundary(end) {
                    end -= 1;
                }
                format!("{}…", &abs[..end])
            } else {
                abs.clone()
            };
            digest.push_str(&format!("**Abstract:** {truncated}\n"));
        }
        digest.push('\n');
    }

    digest
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
                .search_bulk(
                    query,
                    SEARCH_FIELDS,
                    Some("2019-"),
                    Some(3),
                    Some("citationCount:desc"),
                    15,
                )
                .await
                .map(|r| {
                    info!("  Semantic Scholar: {} papers", r.data.len());
                    r.data
                        .into_iter()
                        .map(ResearchPaper::from)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    info!("  Semantic Scholar failed: {e}");
                    vec![]
                })
        },
        async {
            openalex
                .search(query, 1, 10)
                .await
                .map(|r| {
                    info!("  OpenAlex: {} papers", r.results.len());
                    r.results
                        .into_iter()
                        .map(ResearchPaper::from)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    info!("  OpenAlex failed: {e}");
                    vec![]
                })
        },
        async {
            crossref
                .search(query, 10, 0)
                .await
                .map(|r| {
                    let items = r.message.and_then(|m| m.items).unwrap_or_default();
                    info!("  Crossref: {} papers", items.len());
                    items
                        .into_iter()
                        .map(ResearchPaper::from)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    info!("  Crossref failed: {e}");
                    vec![]
                })
        },
        async {
            core.search(query, 10, 0)
                .await
                .map(|r| {
                    info!("  CORE: {} papers", r.results.len());
                    r.results
                        .into_iter()
                        .map(ResearchPaper::from)
                        .collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    info!("  CORE failed: {e}");
                    vec![]
                })
        },
    );

    let mut all: Vec<ResearchPaper> = Vec::new();
    all.extend(scholar_res);
    all.extend(openalex_res);
    all.extend(crossref_res);
    all.extend(core_res);

    let all = deduplicate_and_rank(all, 10);
    let paper_count = all.len();

    info!("Paper search: {} unique papers after dedup", paper_count);

    if all.is_empty() {
        return (vec![], String::new());
    }

    let digest = format_paper_digest(&all);
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

#[cfg(test)]
mod tests {
    use super::*;
    use research::paper::PaperSource;

    fn make_paper(title: &str, citations: Option<u64>, authors: Vec<&str>) -> ResearchPaper {
        ResearchPaper {
            title: title.to_string(),
            authors: authors.into_iter().map(String::from).collect(),
            year: Some(2024),
            citation_count: citations,
            abstract_text: Some(format!("Abstract for {title}")),
            doi: None,
            url: None,
            pdf_url: None,
            source: PaperSource::SemanticScholar,
            source_id: String::new(),
            fields_of_study: None,
        }
    }

    #[test]
    fn test_dedup_removes_duplicate_titles() {
        let papers = vec![
            make_paper("Paper A", Some(10), vec!["Alice"]),
            make_paper("Paper A", Some(5), vec!["Bob"]),
            make_paper("Paper B", Some(3), vec!["Charlie"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_dedup_removes_empty_titles() {
        let papers = vec![
            make_paper("", Some(100), vec!["Alice"]),
            make_paper("  ", Some(50), vec!["Bob"]),
            make_paper("Real Paper", Some(10), vec!["Charlie"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].title, "Real Paper");
    }

    #[test]
    fn test_dedup_sorts_by_citations_desc() {
        let papers = vec![
            make_paper("Low", Some(1), vec!["A"]),
            make_paper("High", Some(100), vec!["B"]),
            make_paper("Mid", Some(50), vec!["C"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result[0].title, "High");
        assert_eq!(result[1].title, "Mid");
        assert_eq!(result[2].title, "Low");
    }

    #[test]
    fn test_dedup_truncates_to_limit() {
        let papers = (0..20)
            .map(|i| make_paper(&format!("Paper {i}"), Some(i as u64), vec!["Author"]))
            .collect();
        let result = deduplicate_and_rank(papers, 5);
        assert_eq!(result.len(), 5);
        // Highest citations first
        assert_eq!(result[0].citation_count, Some(19));
    }

    #[test]
    fn test_format_digest_empty_papers() {
        let digest = format_paper_digest(&[]);
        assert!(digest.is_empty());
    }

    #[test]
    fn test_format_digest_includes_authors_and_citations() {
        let papers = vec![make_paper("Test Paper", Some(42), vec!["Alice", "Bob"])];
        let digest = format_paper_digest(&papers);
        assert!(digest.contains("Test Paper"));
        assert!(digest.contains("Alice, Bob"));
        assert!(digest.contains("42"));
        assert!(digest.contains("## Academic Papers Found"));
    }

    #[test]
    fn test_format_digest_truncates_long_abstracts() {
        let long_abstract = "x".repeat(500);
        let mut paper = make_paper("Long Abstract Paper", Some(1), vec!["Author"]);
        paper.abstract_text = Some(long_abstract);
        let digest = format_paper_digest(&[paper]);
        // The abstract should be truncated at 300 chars + "…"
        assert!(digest.contains("…"));
        // Full 500-char abstract should NOT appear
        assert!(!digest.contains(&"x".repeat(500)));
    }

    #[test]
    fn test_dedup_case_insensitive() {
        let papers = vec![
            make_paper("Attention Is All You Need", Some(50000), vec!["Vaswani"]),
            make_paper("attention is all you need", Some(100), vec!["Imposter"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_dedup_none_citations_treated_as_zero() {
        let papers = vec![
            make_paper("No Cites", None, vec!["A"]),
            make_paper("Some Cites", Some(5), vec!["B"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result[0].title, "Some Cites");
        assert_eq!(result[1].title, "No Cites");
    }

    #[test]
    fn test_dedup_empty_input() {
        let result = deduplicate_and_rank(vec![], 10);
        assert!(result.is_empty());
    }

    #[test]
    fn test_dedup_limit_zero() {
        let papers = vec![make_paper("A", Some(1), vec!["X"])];
        let result = deduplicate_and_rank(papers, 0);
        assert!(result.is_empty());
    }

    #[test]
    fn test_format_digest_no_abstract() {
        let mut paper = make_paper("No Abstract", Some(10), vec!["Author"]);
        paper.abstract_text = None;
        let digest = format_paper_digest(&[paper]);
        assert!(digest.contains("No Abstract"));
        assert!(!digest.contains("Abstract:"));
    }

    #[test]
    fn test_format_digest_unknown_authors() {
        let paper = make_paper("Solo Paper", Some(5), vec![]);
        let digest = format_paper_digest(&[paper]);
        assert!(digest.contains("Unknown"));
    }

    #[test]
    fn test_format_digest_year_and_source() {
        let paper = make_paper("Yearly Paper", Some(1), vec!["Author"]);
        let digest = format_paper_digest(&[paper]);
        assert!(digest.contains("2024"));
        assert!(digest.contains("SemanticScholar"));
    }

    #[test]
    fn test_format_digest_numbering() {
        let papers = vec![
            make_paper("First", Some(10), vec!["A"]),
            make_paper("Second", Some(5), vec!["B"]),
            make_paper("Third", Some(1), vec!["C"]),
        ];
        let digest = format_paper_digest(&papers);
        assert!(digest.contains("### 1."));
        assert!(digest.contains("### 2."));
        assert!(digest.contains("### 3."));
    }

    #[test]
    fn test_dedup_preserves_first_occurrence() {
        let papers = vec![
            make_paper("Duplicate", Some(10), vec!["First Author"]),
            make_paper("Duplicate", Some(99), vec!["Second Author"]),
        ];
        let result = deduplicate_and_rank(papers, 10);
        assert_eq!(result.len(), 1);
        // retain keeps the first one encountered
        assert_eq!(result[0].authors, vec!["First Author"]);
    }
}
