use serde::{Deserialize, Serialize};

use crate::core_api::CoreWork;
use crate::crossref::CrossrefWork;
use crate::openalex::Work as OpenAlexWork;
use crate::scholar::Paper;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaperSource {
    SemanticScholar,
    OpenAlex,
    Crossref,
    Core,
}

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
    pub source_id: String,
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
        }
    }
}
