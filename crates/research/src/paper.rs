//! Unified paper model with `From` conversions from all API-specific types.

use serde::{Deserialize, Serialize};

use crate::arxiv::ArxivPaper;
use crate::core_api::CoreWork;
use crate::crossref::CrossrefWork;
use crate::openalex::Work as OpenAlexWork;
use crate::scholar::Paper;
use crate::zenodo::ZenodoRecord;

/// Which academic API a paper was fetched from.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaperSource {
    SemanticScholar,
    OpenAlex,
    Crossref,
    Core,
    Arxiv,
    Zenodo,
}

/// A normalised research paper that can originate from any supported source.
///
/// Use `From<T>` conversions to create instances from API-specific types
/// (`Paper`, `Work`, `CrossrefWork`, `CoreWork`, `ArxivPaper`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchPaper {
    pub title: String,
    pub abstract_text: Option<String>,
    pub authors: Vec<String>,
    pub year: Option<u32>,
    pub doi: Option<String>,
    pub citation_count: Option<u64>,
    pub url: Option<String>,
    pub pdf_url: Option<String>,
    pub source: PaperSource,
    /// Identifier from the originating source (e.g. S2 paper ID, DOI, arXiv ID).
    pub source_id: String,
    pub fields_of_study: Option<Vec<String>>,
    /// Full publication date string (ISO 8601, e.g. "2026-03-20").
    pub published_date: Option<String>,
    /// Primary arXiv category or main field of study.
    pub primary_category: Option<String>,
    /// All categories / subjects associated with this paper.
    pub categories: Option<Vec<String>>,
}

impl From<Paper> for ResearchPaper {
    fn from(p: Paper) -> Self {
        let authors = p
            .authors
            .unwrap_or_default()
            .into_iter()
            .filter_map(|a| a.name)
            .collect();
        let pdf_url = p.open_access_pdf.and_then(|oa| oa.url);
        let primary_category = p
            .fields_of_study
            .as_ref()
            .and_then(|f| f.first().cloned());
        let categories = p.fields_of_study.clone();
        Self {
            title: p.title.unwrap_or_default(),
            abstract_text: p.abstract_text,
            authors,
            year: p.year,
            doi: None,
            citation_count: p.citation_count,
            url: p.url,
            pdf_url,
            source: PaperSource::SemanticScholar,
            source_id: p.paper_id.unwrap_or_default(),
            fields_of_study: p.fields_of_study,
            published_date: p.publication_date,
            primary_category,
            categories,
        }
    }
}

impl From<OpenAlexWork> for ResearchPaper {
    fn from(w: OpenAlexWork) -> Self {
        let abstract_text = w.reconstruct_abstract();
        let authors = w
            .authorships
            .unwrap_or_default()
            .into_iter()
            .filter_map(|a| a.author.and_then(|ao| ao.display_name))
            .collect();
        let pdf_url = w
            .primary_location
            .as_ref()
            .and_then(|loc| loc.pdf_url.clone())
            .or_else(|| w.open_access.as_ref().and_then(|oa| oa.oa_url.clone()));
        let url = w
            .primary_location
            .as_ref()
            .and_then(|loc| loc.landing_page_url.clone());
        let source_id = w.id.clone().unwrap_or_default();
        let published_date = w.publication_year.map(|y| y.to_string());
        Self {
            title: w.title.unwrap_or_default(),
            abstract_text,
            authors,
            year: w.publication_year,
            doi: w.doi,
            citation_count: w.cited_by_count,
            url,
            pdf_url,
            source: PaperSource::OpenAlex,
            source_id,
            fields_of_study: None,
            published_date,
            primary_category: None,
            categories: None,
        }
    }
}

impl From<CrossrefWork> for ResearchPaper {
    fn from(w: CrossrefWork) -> Self {
        let title = w
            .title
            .as_ref()
            .and_then(|t| t.first().cloned())
            .unwrap_or_default();
        let authors = w
            .author
            .unwrap_or_default()
            .into_iter()
            .map(|a| {
                match (a.given.as_deref(), a.family.as_deref()) {
                    (Some(g), Some(f)) => format!("{g} {f}"),
                    (None, Some(f)) => f.to_string(),
                    (Some(g), None) => g.to_string(),
                    (None, None) => String::new(),
                }
            })
            .filter(|s| !s.is_empty())
            .collect();
        // Strip simple JATS/HTML tags from abstract
        let abstract_text = w.abstract_text.map(|abs| {
            let mut clean = abs.clone();
            // Remove XML/HTML tags like <jats:p>, </jats:p>, etc.
            while let Some(start) = clean.find('<') {
                if let Some(end) = clean[start..].find('>') {
                    clean.replace_range(start..start + end + 1, "");
                } else {
                    break;
                }
            }
            clean.trim().to_string()
        });
        let published_date = w.published.as_ref().and_then(|d| {
            d.date_parts.as_ref().and_then(|outer| {
                outer.first().map(|parts| {
                    parts
                        .iter()
                        .map(|p| format!("{:02}", p))
                        .collect::<Vec<_>>()
                        .join("-")
                })
            })
        });
        let year = w.published.and_then(|d| d.year());
        let pdf_url = w
            .link
            .and_then(|links| links.into_iter().find_map(|l| l.url));
        Self {
            title,
            abstract_text,
            authors,
            year,
            doi: w.doi.clone(),
            citation_count: w.is_referenced_by_count,
            url: w.url,
            pdf_url,
            source: PaperSource::Crossref,
            source_id: w.doi.unwrap_or_default(),
            fields_of_study: None,
            published_date,
            primary_category: None,
            categories: None,
        }
    }
}

impl From<CoreWork> for ResearchPaper {
    fn from(w: CoreWork) -> Self {
        let authors = w
            .authors
            .unwrap_or_default()
            .into_iter()
            .filter_map(|a| a.name)
            .collect();
        let pdf_url = w
            .download_url
            .clone()
            .or_else(|| {
                w.source_fulltext_urls
                    .as_ref()
                    .and_then(|urls| urls.first().cloned())
            });
        let source_id = w
            .id
            .map(|id| id.to_string())
            .unwrap_or_default();
        let published_date = w.year_published.map(|y| y.to_string());
        Self {
            title: w.title.unwrap_or_default(),
            abstract_text: w.abstract_text,
            authors,
            year: w.year_published,
            doi: w.doi,
            citation_count: w.citation_count,
            url: None,
            pdf_url,
            source: PaperSource::Core,
            source_id,
            fields_of_study: None,
            published_date,
            primary_category: None,
            categories: None,
        }
    }
}

impl From<ArxivPaper> for ResearchPaper {
    fn from(p: ArxivPaper) -> Self {
        let year = p.published.get(..4).and_then(|s| s.parse::<u32>().ok());
        let url = p
            .link_url
            .unwrap_or_else(|| format!("https://arxiv.org/abs/{}", p.arxiv_id));
        let published_date = p.published.get(..10).map(|s| s.to_string());
        let primary_category = p.categories.first().cloned();
        let categories = if p.categories.is_empty() {
            None
        } else {
            Some(p.categories.clone())
        };
        Self {
            title: p.title.trim().to_string(),
            abstract_text: Some(p.summary.trim().to_string()),
            authors: p.authors,
            year,
            doi: p.doi,
            citation_count: None,
            url: Some(url),
            pdf_url: p.pdf_url,
            source: PaperSource::Arxiv,
            source_id: p.arxiv_id,
            fields_of_study: if p.categories.is_empty() {
                None
            } else {
                Some(p.categories)
            },
            published_date,
            primary_category,
            categories,
        }
    }
}

impl From<ZenodoRecord> for ResearchPaper {
    fn from(r: ZenodoRecord) -> Self {
        // Extract fields that borrow `r` before any moves.
        let pdf_url = r.pdf_url();
        let url = r.links.as_ref().and_then(|l| l.self_html.clone());
        let source_id = r.id.map(|id| id.to_string()).unwrap_or_default();

        let meta = r.metadata.unwrap_or_default();
        let title = meta.title.or(r.title).unwrap_or_default();
        let abstract_text = meta
            .description
            .as_deref()
            .map(crate::zenodo::types::strip_html);
        let authors = meta
            .creators
            .unwrap_or_default()
            .into_iter()
            .filter_map(|c| c.name)
            .collect();
        let year = meta
            .publication_date
            .as_deref()
            .and_then(|d| d.get(..4).and_then(|s| s.parse::<u32>().ok()));
        let doi = meta.doi.or(r.doi);
        let published_date = meta.publication_date;
        let keywords = meta.keywords;
        let primary_category = meta
            .resource_type
            .as_ref()
            .and_then(|rt| rt.title.clone().or(rt.subtype.clone()));
        let categories = meta
            .resource_type
            .map(|rt| {
                let mut cats = Vec::new();
                if let Some(t) = rt.resource_type {
                    cats.push(t);
                }
                if let Some(s) = rt.subtype {
                    cats.push(s);
                }
                cats
            })
            .filter(|c| !c.is_empty());

        Self {
            title,
            abstract_text,
            authors,
            year,
            doi,
            citation_count: None,
            url,
            pdf_url,
            source: PaperSource::Zenodo,
            source_id,
            fields_of_study: keywords,
            published_date,
            primary_category,
            categories,
        }
    }
}

// ─── Embedding-based dedup ───────────────────────────────────────────────────

/// Remove near-duplicate papers using cosine similarity of their embeddings.
///
/// For each pair of papers with cosine similarity >= `threshold`, the paper
/// with fewer citations is dropped (or the later one if citations are equal).
///
/// `embeddings` must be one vector per paper (same order). Vectors are assumed
/// L2-normalized.
#[cfg(feature = "local-vector")]
#[cfg_attr(docsrs, doc(cfg(feature = "local-vector")))]
pub fn dedup_by_embedding(
    papers: Vec<ResearchPaper>,
    embeddings: &[Vec<f32>],
    threshold: f32,
) -> Vec<ResearchPaper> {
    if papers.len() != embeddings.len() || papers.len() < 2 {
        return papers;
    }

    let n = papers.len();
    let mut keep = vec![true; n];

    for i in 0..n {
        if !keep[i] {
            continue;
        }
        for j in (i + 1)..n {
            if !keep[j] {
                continue;
            }
            let sim = crate::local_embeddings::EmbeddingEngine::cosine(
                &embeddings[i],
                &embeddings[j],
            );
            if sim >= threshold {
                // Drop the paper with fewer citations. When both lack
                // citation data (e.g. Zenodo), prefer the earlier paper.
                match (papers[i].citation_count, papers[j].citation_count) {
                    (Some(ci), Some(cj)) => {
                        if ci >= cj {
                            keep[j] = false;
                        } else {
                            keep[i] = false;
                            break;
                        }
                    }
                    // Keep the paper that has citation data.
                    (Some(_), None) => keep[j] = false,
                    (None, Some(_)) => {
                        keep[i] = false;
                        break;
                    }
                    // Neither has citations — keep the earlier one.
                    (None, None) => keep[j] = false,
                }
            }
        }
    }

    papers
        .into_iter()
        .zip(keep.iter())
        .filter_map(|(p, &k)| if k { Some(p) } else { None })
        .collect()
}

#[cfg(all(test, feature = "local-vector"))]
mod dedup_tests {
    use super::*;

    fn paper(title: &str, cites: u64) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text: None,
            authors: vec![],
            year: None,
            doi: None,
            citation_count: Some(cites),
            url: None,
            pdf_url: None,
            source: PaperSource::Arxiv,
            source_id: title.into(),
            fields_of_study: None,
            published_date: None,
            primary_category: None,
            categories: None,
        }
    }

    #[test]
    fn identical_embeddings_dedup() {
        let papers = vec![paper("A", 100), paper("B", 10)];
        let embs = vec![vec![1.0f32; 384], vec![1.0f32; 384]];
        let result = dedup_by_embedding(papers, &embs, 0.95);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].title, "A"); // keeps higher citations
    }

    #[test]
    fn orthogonal_embeddings_keep_both() {
        let papers = vec![paper("A", 10), paper("B", 10)];
        let mut e1 = vec![0.0f32; 384];
        let mut e2 = vec![0.0f32; 384];
        e1[0] = 1.0;
        e2[1] = 1.0;
        let result = dedup_by_embedding(papers, &[e1, e2], 0.95);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn single_paper_unchanged() {
        let papers = vec![paper("A", 10)];
        let embs = vec![vec![1.0f32; 384]];
        let result = dedup_by_embedding(papers, &embs, 0.95);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn mismatched_lengths_returns_original() {
        let papers = vec![paper("A", 10), paper("B", 10)];
        let embs = vec![vec![1.0f32; 384]]; // wrong length
        let result = dedup_by_embedding(papers, &embs, 0.95);
        assert_eq!(result.len(), 2);
    }
}
