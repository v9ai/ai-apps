//! Company-focused paper search across multiple academic sources.
//!
//! [`CompanyPaperSearch`] orchestrates queries against OpenAlex (affiliation
//! filter), Semantic Scholar (keyword search), and arXiv (author/abstract
//! search) to discover papers affiliated with a given company. Results are
//! deduplicated by DOI and normalised title.

use std::collections::HashSet;

use crate::arxiv::ArxivClient;
use crate::openalex::OpenAlexClient;
use crate::paper::ResearchPaper;
use crate::scholar::SemanticScholarClient;

/// Orchestrates paper search across OpenAlex, Semantic Scholar, and arXiv
/// for a specific company or set of authors.
pub struct CompanyPaperSearch {
    openalex: OpenAlexClient,
    scholar: SemanticScholarClient,
    arxiv: ArxivClient,
}

impl CompanyPaperSearch {
    pub fn new(
        openalex: OpenAlexClient,
        scholar: SemanticScholarClient,
        arxiv: ArxivClient,
    ) -> Self {
        Self {
            openalex,
            scholar,
            arxiv,
        }
    }

    /// Search all sources for papers affiliated with a company.
    ///
    /// Deduplicates by DOI and normalised title similarity.
    pub async fn search_by_company(
        &self,
        company_name: &str,
        limit: u32,
    ) -> Result<Vec<ResearchPaper>, anyhow::Error> {
        let mut papers = Vec::new();

        // 1. OpenAlex affiliation search (primary -- no API key needed, no strict rate limits)
        match self
            .openalex
            .search_by_affiliation(company_name, 1, limit.min(50))
            .await
        {
            Ok(resp) => {
                for work in resp.results {
                    papers.push(ResearchPaper::from(work));
                }
            }
            Err(e) => tracing::warn!("OpenAlex affiliation search failed: {e}"),
        }

        // 2. Semantic Scholar keyword search (secondary)
        // Search specifically for the company name in quotes to get papers BY the company
        let s2_query = format!("\"{company_name}\"");
        let s2_fields = "paperId,title,abstract,year,citationCount,openAccessPdf,authors,fieldsOfStudy,url,publicationDate,venue";
        match self
            .scholar
            .search(&s2_query, s2_fields, limit.min(20), 0)
            .await
        {
            Ok(resp) => {
                for paper in resp.data {
                    papers.push(ResearchPaper::from(paper));
                }
            }
            Err(e) => tracing::warn!("Semantic Scholar search failed: {e}"),
        }

        // 3. arXiv search (tertiary)
        // Use all: prefix to search across all fields for the company name
        let arxiv_query = format!("all:{company_name}");
        match self
            .arxiv
            .search(&arxiv_query, 0, limit.min(20), None, None)
            .await
        {
            Ok(resp) => {
                for entry in resp.papers {
                    papers.push(ResearchPaper::from(entry));
                }
            }
            Err(e) => tracing::warn!("arXiv search failed: {e}"),
        }

        // Deduplicate
        Self::dedup_papers(&mut papers);

        Ok(papers)
    }

    /// Search by specific author names via OpenAlex.
    pub async fn search_by_authors(
        &self,
        author_names: &[String],
        limit_per_author: u32,
    ) -> Result<Vec<ResearchPaper>, anyhow::Error> {
        let mut papers = Vec::new();

        for name in author_names {
            match self
                .openalex
                .search_by_author_name(name, 1, limit_per_author.min(20))
                .await
            {
                Ok(resp) => {
                    for work in resp.results {
                        papers.push(ResearchPaper::from(work));
                    }
                }
                Err(e) => tracing::warn!("Author search for '{name}' failed: {e}"),
            }
        }

        Self::dedup_papers(&mut papers);
        Ok(papers)
    }

    /// Fetch specific papers by arXiv ID.
    pub async fn fetch_arxiv_papers(
        &self,
        arxiv_ids: &[String],
    ) -> Result<Vec<ResearchPaper>, anyhow::Error> {
        let mut papers = Vec::new();
        for id in arxiv_ids {
            // Strip URL prefixes to get bare ID
            let clean_id = id
                .replace("https://arxiv.org/abs/", "")
                .replace("https://arxiv.org/pdf/", "")
                .replace("http://arxiv.org/abs/", "")
                .trim_end_matches(".pdf")
                .to_owned();

            match self.arxiv.get_paper(&clean_id).await {
                Ok(entry) => papers.push(ResearchPaper::from(entry)),
                Err(e) => tracing::warn!("arXiv fetch for '{clean_id}' failed: {e}"),
            }
        }
        Ok(papers)
    }

    /// Deduplicate papers by DOI first, then by normalised title.
    fn dedup_papers(papers: &mut Vec<ResearchPaper>) {
        let mut seen_dois = HashSet::new();
        let mut seen_titles = HashSet::new();

        papers.retain(|p| {
            // DOI dedup
            if let Some(doi) = &p.doi {
                if !seen_dois.insert(doi.to_lowercase()) {
                    return false;
                }
            }
            // Normalised title dedup
            let normalised: String = p
                .title
                .to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric() || c.is_whitespace())
                .collect();
            if normalised.len() > 10 {
                seen_titles.insert(normalised)
            } else {
                true
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::paper::PaperSource;

    fn paper(title: &str, doi: Option<&str>) -> ResearchPaper {
        ResearchPaper {
            title: title.into(),
            abstract_text: None,
            authors: vec![],
            year: None,
            doi: doi.map(|s| s.into()),
            citation_count: None,
            url: None,
            pdf_url: None,
            source: PaperSource::OpenAlex,
            source_id: title.into(),
            fields_of_study: None,
            published_date: None,
            primary_category: None,
            categories: None,
            affiliations: None,
            venue: None,
        }
    }

    #[test]
    fn dedup_by_doi() {
        let mut papers = vec![
            paper("Paper A", Some("10.1234/a")),
            paper("Paper B", Some("10.1234/A")), // same DOI, different case
            paper("Paper C", Some("10.1234/c")),
        ];
        CompanyPaperSearch::dedup_papers(&mut papers);
        assert_eq!(papers.len(), 2);
        assert_eq!(papers[0].title, "Paper A");
        assert_eq!(papers[1].title, "Paper C");
    }

    #[test]
    fn dedup_by_title() {
        let mut papers = vec![
            paper("Attention Is All You Need", None),
            paper("attention is all you need", None),
            paper("A Different Paper", None),
        ];
        CompanyPaperSearch::dedup_papers(&mut papers);
        assert_eq!(papers.len(), 2);
    }

    #[test]
    fn short_titles_not_deduped() {
        let mut papers = vec![
            paper("Short", None),
            paper("Short", None),
        ];
        CompanyPaperSearch::dedup_papers(&mut papers);
        // "short" has len 5, which is <= 10, so both are kept
        assert_eq!(papers.len(), 2);
    }
}
