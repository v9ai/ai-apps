use crate::agent::{Tool, ToolDefinition};
use crate::crossref::CrossrefClient;
use crate::openalex::OpenAlexClient;
use crate::paper::ResearchPaper;
use crate::scholar::{SemanticScholarClient, types::{PAPER_FIELDS_FULL, SEARCH_FIELDS}};
use serde::{Deserialize, Serialize};

// Re-export for convenience
pub use SearchToolConfig as ToolConfig;

/// Fallback API clients for when Semantic Scholar is rate-limited.
#[derive(Clone)]
pub struct FallbackClients {
    pub openalex: OpenAlexClient,
    pub crossref: CrossrefClient,
}

/// Configuration for search/detail tool behaviour.
///
/// Different apps use different defaults (e.g. research-thera wants longer
/// abstracts and more authors than nomadically.work). Construct tools via
/// [`SearchPapers::with_config`] / [`GetPaperDetail::with_config`] to override.
#[derive(Clone, Debug)]
pub struct SearchToolConfig {
    pub default_limit: u32,
    pub abstract_max_chars: usize,
    pub max_authors: usize,
    pub include_fields_of_study: bool,
    pub include_venue: bool,
    pub search_description: Option<String>,
    pub detail_description: Option<String>,
}

impl Default for SearchToolConfig {
    fn default() -> Self {
        Self {
            default_limit: 8,
            abstract_max_chars: 350,
            max_authors: 4,
            include_fields_of_study: true,
            include_venue: false,
            search_description: None,
            detail_description: None,
        }
    }
}

// ─── SearchPapers ────────────────────────────────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct SearchArgs {
    pub query: String,
    pub year: Option<String>,
    pub min_citations: Option<u32>,
    pub limit: Option<u32>,
}

pub struct SearchPapers {
    client: SemanticScholarClient,
    config: SearchToolConfig,
    fallback: Option<FallbackClients>,
}

impl SearchPapers {
    pub fn new(client: SemanticScholarClient) -> Self {
        Self { client, config: SearchToolConfig::default(), fallback: None }
    }

    pub fn with_config(client: SemanticScholarClient, config: SearchToolConfig) -> Self {
        Self { client, config, fallback: None }
    }

    pub fn with_fallback(client: SemanticScholarClient, config: SearchToolConfig, fallback: FallbackClients) -> Self {
        Self { client, config, fallback: Some(fallback) }
    }
}

#[async_trait::async_trait]
impl Tool for SearchPapers {
    fn name(&self) -> &str {
        "search_papers"
    }

    fn definition(&self) -> ToolDefinition {
        let description = self.config.search_description.clone().unwrap_or_else(|| {
            "Search 214M+ academic papers on Semantic Scholar sorted by citation \
                 impact. Returns titles, authors, citation counts, abstracts, and PDF \
                 links. Call multiple times with different query terms to cover the topic \
                 from different angles.".to_string()
        });

        ToolDefinition {
            name: self.name().into(),
            description,
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query. Use +must_include, -exclude, \"exact phrase\", term1 | term2"
                    },
                    "year": {
                        "type": "string",
                        "description": "Year filter. Examples: \"2019-\" (2019 onward), \"2020-2024\", \"2023\""
                    },
                    "min_citations": {
                        "type": "integer",
                        "description": "Minimum citation count. Use 5+ to filter out unpublished drafts"
                    },
                    "limit": {
                        "type": "integer",
                        "description": format!("Max papers to return (default {}, max 20)", self.config.default_limit)
                    }
                },
                "required": ["query"]
            }),
        }
    }

    async fn call_json(&self, args: serde_json::Value) -> Result<String, String> {
        let args: SearchArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
        let limit = args.limit.unwrap_or(self.config.default_limit).min(20);

        // Prefer OpenAlex (no rate-limit issues) when available, fall back to S2.
        if let Some(fb) = &self.fallback {
            if let Ok(oa_resp) = fb.openalex.search(&args.query, 1, limit).await {
                if !oa_resp.results.is_empty() {
                    let papers: Vec<ResearchPaper> = oa_resp.results.into_iter().map(Into::into).collect();
                    let total = papers.len() as u64;
                    return Ok(format_research_papers(&papers, &self.config, &args.query, total));
                }
            }

            // OpenAlex empty — try Crossref before S2
            if let Ok(cr_resp) = fb.crossref.search(&args.query, limit, 0).await {
                if let Some(items) = cr_resp.message.and_then(|m| m.items) {
                    if !items.is_empty() {
                        let papers: Vec<ResearchPaper> = items.into_iter().map(Into::into).collect();
                        let total = papers.len() as u64;
                        return Ok(format_research_papers(&papers, &self.config, &args.query, total));
                    }
                }
            }

            tracing::warn!("OpenAlex + Crossref returned no results, falling back to Semantic Scholar");
        }

        // S2 as last resort (or only provider when no fallback configured)
        let resp = self.client
            .search_bulk(
                &args.query,
                SEARCH_FIELDS,
                args.year.as_deref(),
                args.min_citations,
                Some("citationCount:desc"),
                limit,
            )
            .await
            .map_err(|e| e.to_string())?;

        let papers: Vec<ResearchPaper> = resp.data.into_iter().map(Into::into).collect();
        Ok(format_research_papers(&papers, &self.config, &args.query, resp.total.unwrap_or(papers.len() as u64)))
    }
}

/// Format a list of `ResearchPaper`s into the JSON response expected by the agent.
pub fn format_research_papers(
    papers: &[ResearchPaper],
    config: &SearchToolConfig,
    query: &str,
    total: u64,
) -> String {
    let max_chars = config.abstract_max_chars;
    let max_authors = config.max_authors;
    let include_fields = config.include_fields_of_study;
    let include_venue = config.include_venue;

    let formatted: Vec<serde_json::Value> = papers
        .iter()
        .map(|p| {
            let abstract_snippet = p.abstract_text.as_ref().map(|a| {
                if a.chars().count() > max_chars {
                    a.chars().take(max_chars).collect::<String>() + "…"
                } else {
                    a.clone()
                }
            });
            let mut obj = serde_json::json!({
                "paper_id": p.source_id,
                "title": p.title,
                "year": p.year,
                "citations": p.citation_count,
                "abstract": abstract_snippet,
                "pdf_url": p.pdf_url,
                "url": p.url,
                "authors": p.authors.iter().take(max_authors).collect::<Vec<_>>(),
                "source": format!("{:?}", p.source),
            });
            if include_fields {
                obj["fields"] = serde_json::json!(p.fields_of_study);
            }
            if include_venue {
                // ResearchPaper doesn't have venue, omit
            }
            obj
        })
        .collect();

    serde_json::to_string_pretty(&serde_json::json!({
        "query": query,
        "total_available": total,
        "returned": formatted.len(),
        "papers": formatted,
    })).unwrap_or_default()
}

/// Format a single `ResearchPaper` into the detail JSON response.
pub fn format_paper_detail(paper: &ResearchPaper) -> String {
    let obj = serde_json::json!({
        "paper_id": paper.source_id,
        "title": paper.title,
        "year": paper.year,
        "citations": paper.citation_count,
        "abstract": paper.abstract_text,
        "authors": paper.authors,
        "doi": paper.doi,
        "url": paper.url,
        "pdf_url": paper.pdf_url,
        "source": format!("{:?}", paper.source),
        "fields_of_study": paper.fields_of_study,
    });
    serde_json::to_string_pretty(&obj).unwrap_or_default()
}

// ─── GetPaperDetail ──────────────────────────────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct PaperDetailArgs {
    pub paper_id: String,
}

pub struct GetPaperDetail {
    client: SemanticScholarClient,
    config: SearchToolConfig,
    fallback: Option<FallbackClients>,
}

impl GetPaperDetail {
    pub fn new(client: SemanticScholarClient) -> Self {
        Self { client, config: SearchToolConfig::default(), fallback: None }
    }

    pub fn with_config(client: SemanticScholarClient, config: SearchToolConfig) -> Self {
        Self { client, config, fallback: None }
    }

    pub fn with_fallback(client: SemanticScholarClient, config: SearchToolConfig, fallback: FallbackClients) -> Self {
        Self { client, config, fallback: Some(fallback) }
    }
}

#[async_trait::async_trait]
impl Tool for GetPaperDetail {
    fn name(&self) -> &str {
        "get_paper_detail"
    }

    fn definition(&self) -> ToolDefinition {
        let description = self.config.detail_description.clone().unwrap_or_else(|| {
            "Get full details for a specific paper: complete abstract, AI-generated \
             TLDR summary, all authors, venue, and PDF link. Use this on the most \
             relevant papers from search_papers to extract precise insights."
                .into()
        });

        ToolDefinition {
            name: self.name().into(),
            description,
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "paper_id": {
                        "type": "string",
                        "description": "Paper ID from search results (S2PaperId), or arXiv:xxxx, DOI:xxx/yyy, PMID:xxx"
                    }
                },
                "required": ["paper_id"]
            }),
        }
    }

    async fn call_json(&self, args: serde_json::Value) -> Result<String, String> {
        let args: PaperDetailArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;

        // Try DOI-based lookup via OpenAlex/Crossref first (no rate limits).
        let doi = if args.paper_id.starts_with("DOI:") {
            Some(args.paper_id.strip_prefix("DOI:").unwrap().to_string())
        } else if args.paper_id.starts_with("10.") {
            Some(args.paper_id.clone())
        } else {
            None
        };

        if let (Some(fb), Some(doi)) = (&self.fallback, &doi) {
            if let Ok(work) = fb.openalex.get_work(&format!("https://doi.org/{doi}")).await {
                let paper: ResearchPaper = work.into();
                return Ok(format_paper_detail(&paper));
            }
            if let Ok(work) = fb.crossref.get_work(doi).await {
                let paper: ResearchPaper = work.into();
                return Ok(format_paper_detail(&paper));
            }
            tracing::warn!("OpenAlex + Crossref failed for DOI {doi}, falling back to S2");
        }

        // S2 as last resort (or only provider when no fallback/DOI)
        let p = self.client.get_paper(&args.paper_id, PAPER_FIELDS_FULL).await.map_err(|e| e.to_string())?;
        let mut obj = serde_json::json!({
            "paper_id": p.paper_id,
            "title": p.title,
            "year": p.year,
            "citations": p.citation_count,
            "influential_citations": p.influential_citation_count,
            "tldr": p.tldr.as_ref().and_then(|t| t.text.as_deref()),
            "abstract": p.abstract_text,
            "authors": p.authors.as_ref().map(|a| {
                a.iter().filter_map(|au| au.name.as_deref()).collect::<Vec<_>>()
            }),
            "venue": p.venue,
            "publication_date": p.publication_date,
            "is_open_access": p.is_open_access,
            "pdf_url": p.open_access_pdf.as_ref().and_then(|x| x.url.as_deref()),
            "url": p.url,
        });
        if self.config.include_fields_of_study {
            obj["fields_of_study"] = serde_json::json!(p.fields_of_study);
        }
        serde_json::to_string_pretty(&obj).map_err(|e| e.to_string())
    }
}

// ─── GetRecommendations ─────────────────────────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct RecommendationsArgs {
    pub paper_id: String,
    pub limit: Option<u32>,
}

pub struct GetRecommendations {
    client: SemanticScholarClient,
    config: SearchToolConfig,
}

impl GetRecommendations {
    pub fn new(client: SemanticScholarClient) -> Self {
        Self { client, config: SearchToolConfig::default() }
    }

    pub fn with_config(client: SemanticScholarClient, config: SearchToolConfig) -> Self {
        Self { client, config }
    }
}

#[async_trait::async_trait]
impl Tool for GetRecommendations {
    fn name(&self) -> &str {
        "get_recommendations"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Get papers similar to a given paper using SPECTER2 embeddings. \
                Use on the most relevant paper from search results to discover closely \
                related work that keyword search might miss.".into(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "paper_id": {
                        "type": "string",
                        "description": "Paper ID from search results (S2PaperId), or arXiv:xxxx, DOI:xxx/yyy"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max papers to return (default 5, max 10)"
                    }
                },
                "required": ["paper_id"]
            }),
        }
    }

    async fn call_json(&self, args: serde_json::Value) -> Result<String, String> {
        let args: RecommendationsArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
        let limit = args.limit.unwrap_or(5).min(10);

        let resp = self.client
            .get_recommendations(&args.paper_id, SEARCH_FIELDS, limit)
            .await
            .map_err(|e| e.to_string())?;

        let max_chars = self.config.abstract_max_chars;
        let max_authors = self.config.max_authors;
        let include_fields = self.config.include_fields_of_study;

        let papers: Vec<serde_json::Value> = resp
            .recommended_papers
            .iter()
            .map(|p| {
                let abstract_snippet = p.abstract_text.as_ref().map(|a| {
                    if a.chars().count() > max_chars {
                        a.chars().take(max_chars).collect::<String>() + "…"
                    } else {
                        a.clone()
                    }
                });
                let mut obj = serde_json::json!({
                    "paper_id": p.paper_id,
                    "title": p.title,
                    "year": p.year,
                    "citations": p.citation_count,
                    "abstract": abstract_snippet,
                    "pdf_url": p.open_access_pdf.as_ref().and_then(|x| x.url.as_deref()),
                    "url": p.url,
                    "authors": p.authors.as_ref().map(|a| {
                        a.iter().filter_map(|au| au.name.as_deref()).take(max_authors).collect::<Vec<_>>()
                    }),
                });
                if include_fields {
                    obj["fields"] = serde_json::json!(p.fields_of_study);
                }
                obj
            })
            .collect();

        serde_json::to_string_pretty(&serde_json::json!({
            "source_paper": args.paper_id,
            "returned": papers.len(),
            "papers": papers,
        })).map_err(|e| e.to_string())
    }
}
