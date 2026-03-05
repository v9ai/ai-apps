use crate::agent::{Tool, ToolDefinition};
use crate::scholar::{SemanticScholarClient, types::{PAPER_FIELDS_FULL, SEARCH_FIELDS}};
use serde::{Deserialize, Serialize};

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
}

impl SearchPapers {
    pub fn new(client: SemanticScholarClient) -> Self {
        Self { client, config: SearchToolConfig::default() }
    }

    pub fn with_config(client: SemanticScholarClient, config: SearchToolConfig) -> Self {
        Self { client, config }
    }
}

#[async_trait::async_trait]
impl Tool for SearchPapers {
    fn name(&self) -> &str {
        "search_papers"
    }

    fn definition(&self) -> ToolDefinition {
        let description = self.config.search_description.clone().unwrap_or_else(|| {
            format!(
                "Search 214M+ academic papers on Semantic Scholar sorted by citation \
                 impact. Returns titles, authors, citation counts, abstracts, and PDF \
                 links. Call multiple times with different query terms to cover the topic \
                 from different angles.",
            )
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

        let max_chars = self.config.abstract_max_chars;
        let max_authors = self.config.max_authors;
        let include_fields = self.config.include_fields_of_study;
        let include_venue = self.config.include_venue;

        let papers: Vec<serde_json::Value> = resp
            .data
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
                if include_venue {
                    obj["venue"] = serde_json::json!(p.venue);
                }
                obj
            })
            .collect();

        serde_json::to_string_pretty(&serde_json::json!({
            "query": args.query,
            "total_available": resp.total,
            "returned": papers.len(),
            "papers": papers,
        })).map_err(|e| e.to_string())
    }
}

// ─── GetPaperDetail ──────────────────────────────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct PaperDetailArgs {
    pub paper_id: String,
}

pub struct GetPaperDetail {
    client: SemanticScholarClient,
    config: SearchToolConfig,
}

impl GetPaperDetail {
    pub fn new(client: SemanticScholarClient) -> Self {
        Self { client, config: SearchToolConfig::default() }
    }

    pub fn with_config(client: SemanticScholarClient, config: SearchToolConfig) -> Self {
        Self { client, config }
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
