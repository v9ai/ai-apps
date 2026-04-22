use crate::lance::Lance;
use crate::sqlite::{self, Db};
use crate::types::{paper_stable_id, ResearchPaper};
use anyhow::Result;
use research::{ArxivClient, OpenAlexClient};
use sha2::{Digest, Sha256};

pub struct Fetchers {
    pub arxiv: ArxivClient,
    pub openalex: OpenAlexClient,
}

impl Default for Fetchers {
    fn default() -> Self {
        Self {
            arxiv: ArxivClient::new(),
            openalex: OpenAlexClient::new(None),
        }
    }
}

impl Fetchers {
    /// Search OpenAlex + arXiv for papers authored by `author_name`, normalize to
    /// `ResearchPaper`, and return combined results (OpenAlex first, arXiv appended
    /// where DOI/title don't collide). Both sources are queried concurrently.
    pub async fn by_author(&self, author_name: &str, per_source: u32) -> Result<Vec<ResearchPaper>> {
        let arxiv_query = format!("au:\"{}\"", author_name);
        let openalex_fut = self.openalex.search_by_author_name(author_name, 1, per_source);
        let arxiv_fut = self.arxiv.search(&arxiv_query, 0, per_source, None, None);
        let (openalex_res, arxiv_res) = tokio::join!(openalex_fut, arxiv_fut);

        let mut out: Vec<ResearchPaper> = Vec::new();
        match openalex_res {
            Ok(resp) => {
                for w in resp.results {
                    out.push(ResearchPaper::from(w));
                }
            }
            Err(e) => tracing::warn!("openalex search_by_author_name({}): {}", author_name, e),
        }
        match arxiv_res {
            Ok(resp) => {
                for p in resp.papers {
                    let candidate = ResearchPaper::from(p);
                    if !duplicates(&out, &candidate) {
                        out.push(candidate);
                    }
                }
            }
            Err(e) => tracing::warn!("arxiv search(au:{}): {}", author_name, e),
        }
        Ok(out)
    }

    /// Topic-driven discovery: query OpenAlex and arXiv concurrently.
    #[allow(dead_code)]
    pub async fn by_topic(&self, query: &str, per_source: u32) -> Result<Vec<ResearchPaper>> {
        let openalex_fut = self.openalex.search(query, 1, per_source);
        let arxiv_fut = self.arxiv.search(query, 0, per_source, None, None);
        let (openalex_res, arxiv_res) = tokio::join!(openalex_fut, arxiv_fut);

        let mut out: Vec<ResearchPaper> = Vec::new();
        match openalex_res {
            Ok(resp) => {
                for w in resp.results {
                    out.push(ResearchPaper::from(w));
                }
            }
            Err(e) => tracing::warn!("openalex search({}): {}", query, e),
        }
        match arxiv_res {
            Ok(resp) => {
                for p in resp.papers {
                    let candidate = ResearchPaper::from(p);
                    if !duplicates(&out, &candidate) {
                        out.push(candidate);
                    }
                }
            }
            Err(e) => tracing::warn!("arxiv search({}): {}", query, e),
        }
        Ok(out)
    }
}

fn duplicates(existing: &[ResearchPaper], p: &ResearchPaper) -> bool {
    if let Some(doi) = &p.doi {
        if existing.iter().any(|e| e.doi.as_deref() == Some(doi.as_str())) {
            return true;
        }
    }
    existing.iter().any(|e| e.title.eq_ignore_ascii_case(&p.title))
}

/// Persist the `ResearchPaper[]` metadata into SQLite `papers`, and mirror a
/// sha256-keyed cache-hit record into both SQLite `fetch_cache` and Lance
/// `fetch_cache` (empty body for now — full HTML/PDF fetching happens in a
/// separate step). Returns the stable ids of the persisted papers.
pub async fn persist_papers(
    sqlite_db: &Db,
    lance: &Lance,
    papers: &[ResearchPaper],
) -> Result<Vec<String>> {
    let mut ids = Vec::with_capacity(papers.len());
    for p in papers {
        let id = paper_stable_id(p);
        let arxiv_id = extract_arxiv_id(p);
        let source = match p.source {
            research::paper::PaperSource::SemanticScholar => "s2",
            research::paper::PaperSource::OpenAlex => "openalex",
            research::paper::PaperSource::Crossref => "crossref",
            research::paper::PaperSource::Core => "core",
            research::paper::PaperSource::Arxiv => "arxiv",
            research::paper::PaperSource::Zenodo => "zenodo",
        };
        let fields: Vec<String> = p.fields_of_study.clone().unwrap_or_default();
        let affils: Vec<String> = p.affiliations.clone().unwrap_or_default();
        sqlite::upsert_paper(
            sqlite_db,
            &id,
            p.doi.as_deref(),
            arxiv_id.as_deref(),
            &p.title,
            p.year.map(|y| y as i32),
            p.venue.as_deref(),
            p.citation_count.map(|c| c.min(i32::MAX as u64) as i32),
            source,
            p.pdf_url.as_deref(),
            p.url.as_deref(),
            &fields,
            &p.authors,
            &affils,
            p.abstract_text.as_deref(),
        )
        .await?;

        if let Some(url) = p.url.as_deref() {
            let key = cache_key(&id);
            if !sqlite::has_fetch(sqlite_db, &key).await? {
                lance.put_fetch_blob(&key, b"", "placeholder", url).await.ok();
                sqlite::record_fetch(sqlite_db, &key, "placeholder", url).await.ok();
            }
        }

        ids.push(id);
    }
    Ok(ids)
}

fn extract_arxiv_id(p: &ResearchPaper) -> Option<String> {
    if matches!(p.source, research::paper::PaperSource::Arxiv) {
        return Some(p.source_id.clone());
    }
    p.url.as_ref().and_then(|u| {
        u.find("arxiv.org/abs/")
            .map(|i| u[i + "arxiv.org/abs/".len()..].trim_end_matches('/').to_string())
    })
}

pub fn cache_key(paper_id: &str) -> String {
    let mut h = Sha256::new();
    h.update(paper_id.as_bytes());
    hex::encode(h.finalize())
}
