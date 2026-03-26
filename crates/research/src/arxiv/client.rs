use std::time::Duration;

use quick_xml::events::Event;
use quick_xml::Reader;
use tokio::time::sleep;
use tracing::info;

use crate::retry::{retry_get, RetryConfig};

use super::error::Error;
use super::types::{
    validate_arxiv_id, ArxivPaper, ArxivSearchResponse, SearchQuery, SortBy, SortOrder,
};

const BASE_URL: &str = "https://export.arxiv.org/api/query";
const POLITE_DELAY: Duration = Duration::from_secs(3);

const RETRY_CONFIG: RetryConfig = RetryConfig {
    max_retries: 3,
    base_delay: Duration::from_secs(2),
    max_delay: Duration::from_secs(30),
    jitter: true,
};

/// Client for the arXiv Atom feed API.
///
/// Respects arXiv's rate-limit guidelines with polite delays between requests
/// and automatic retry on HTTP 429.
#[derive(Clone)]
pub struct ArxivClient {
    http: reqwest::Client,
    base_url: String,
}

impl ArxivClient {
    /// Create a client pointing at the default arXiv API endpoint.
    pub fn new() -> Self {
        Self::with_base_url(BASE_URL)
    }

    /// Create a client with a custom base URL (useful for testing).
    pub fn with_base_url(base_url: &str) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self {
            http,
            base_url: base_url.to_string(),
        }
    }

    /// Simple keyword search (backwards-compatible with the old API).
    pub async fn search(
        &self,
        query: &str,
        start: u32,
        max_results: u32,
        sort_by: Option<&str>,
        sort_order: Option<&str>,
    ) -> Result<ArxivSearchResponse, Error> {
        let sq = SearchQuery::new()
            .terms(query)
            .start(start)
            .max_results(max_results)
            .sort_by(match sort_by.unwrap_or("relevance") {
                "lastUpdatedDate" => SortBy::LastUpdatedDate,
                "submittedDate" => SortBy::SubmittedDate,
                _ => SortBy::Relevance,
            })
            .sort_order(match sort_order.unwrap_or("descending") {
                "ascending" => SortOrder::Ascending,
                _ => SortOrder::Descending,
            });

        self.search_advanced(&sq).await
    }

    /// Advanced search using a fully-configured `SearchQuery`.
    pub async fn search_advanced(
        &self,
        query: &SearchQuery,
    ) -> Result<ArxivSearchResponse, Error> {
        let search_query = query.build_query_string();

        let url = format!(
            "{}?search_query={}&start={}&max_results={}&sortBy={}&sortOrder={}",
            self.base_url,
            search_query,
            query.start,
            query.max_results,
            query.sort_by,
            query.sort_order,
        );

        let body = self.get_xml(&url).await?;
        parse_atom_feed(&body)
    }

    /// Fetch multiple papers by ID in batches via `id_list`.
    /// On rate-limit or error: waits, retries once, then skips that batch.
    pub async fn fetch_batch(
        &self,
        ids: &[String],
        batch_size: usize,
    ) -> Result<Vec<ArxivPaper>, Error> {
        let mut all = Vec::new();
        let bs = batch_size.max(1);
        let total_batches = (ids.len() + bs - 1) / bs;
        for (i, chunk) in ids.chunks(bs).enumerate() {
            let id_list = chunk.join(",");
            let url = format!(
                "{}?id_list={}&max_results={}",
                self.base_url,
                id_list,
                chunk.len()
            );
            match self.get_xml(&url).await {
                Ok(body) => {
                    let resp = parse_atom_feed(&body)?;
                    info!(
                        batch = i + 1,
                        total = total_batches,
                        requested = chunk.len(),
                        fetched = resp.papers.len(),
                        "arXiv batch fetch"
                    );
                    all.extend(resp.papers);
                }
                Err(e) => {
                    info!(
                        batch = i + 1,
                        total = total_batches,
                        "Batch failed ({e}), cooling down 10s..."
                    );
                    sleep(Duration::from_secs(10)).await;
                    match self.get_xml(&url).await {
                        Ok(body) => {
                            let resp = parse_atom_feed(&body)?;
                            info!(batch = i + 1, fetched = resp.papers.len(), "Retry ok");
                            all.extend(resp.papers);
                        }
                        Err(e2) => {
                            info!(batch = i + 1, "Retry failed ({e2}), skipping batch");
                        }
                    }
                }
            }
        }
        Ok(all)
    }

    /// Fetch a single paper by arXiv ID with validation.
    pub async fn get_paper(&self, arxiv_id: &str) -> Result<ArxivPaper, Error> {
        validate_arxiv_id(arxiv_id)?;
        let url = format!("{}?id_list={}&max_results=1", self.base_url, arxiv_id);
        let body = self.get_xml(&url).await?;
        let resp = parse_atom_feed(&body)?;
        resp.papers
            .into_iter()
            .next()
            .ok_or_else(|| Error::Api {
                status: 404,
                message: format!("Paper {arxiv_id} not found"),
            })
    }

    /// Paginate through all results for a query, fetching up to `total_limit`
    /// papers across multiple requests.
    #[allow(unused_assignments)]
    pub async fn search_all(
        &self,
        query: &SearchQuery,
        total_limit: u32,
    ) -> Result<ArxivSearchResponse, Error> {
        let page_size = query.max_results.min(100);
        let mut all_papers = Vec::new();
        let mut start = query.start;
        let mut total_results: u64 = 0;
        let mut items_per_page: u64 = 0;

        loop {
            let mut page_query = query.clone();
            page_query.start = start;
            page_query.max_results = page_size.min(total_limit - all_papers.len() as u32);

            let resp = self.search_advanced(&page_query).await?;
            total_results = resp.total_results;
            items_per_page = resp.items_per_page;

            let fetched = resp.papers.len() as u32;
            all_papers.extend(resp.papers);

            if fetched == 0 || all_papers.len() as u32 >= total_limit {
                break;
            }

            start += fetched;
            if start as u64 >= total_results {
                break;
            }
        }

        Ok(ArxivSearchResponse {
            total_results,
            start_index: query.start as u64,
            items_per_page,
            papers: all_papers,
        })
    }

    async fn get_xml(&self, url: &str) -> Result<String, Error> {
        let resp = retry_get(&self.http, url, &[], &RETRY_CONFIG, "arXiv").await?;
        let status = resp.status();

        if !status.is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(Error::Api {
                status: status.as_u16(),
                message: body,
            });
        }

        let body = resp.text().await?;

        // Polite delay after successful request
        sleep(POLITE_DELAY).await;

        Ok(body)
    }
}

impl Default for ArxivClient {
    fn default() -> Self {
        Self::new()
    }
}

fn parse_atom_feed(xml: &str) -> Result<ArxivSearchResponse, Error> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut papers = Vec::new();
    let mut in_entry = false;
    let mut current_tag = String::new();

    // Feed-level metadata
    let mut total_results: u64 = 0;
    let mut start_index: u64 = 0;
    let mut items_per_page: u64 = 0;

    // Per-entry fields
    let mut title = String::new();
    let mut summary = String::new();
    let mut authors: Vec<String> = Vec::new();
    let mut author_name = String::new();
    let mut in_author = false;
    let mut categories: Vec<String> = Vec::new();
    let mut published = String::new();
    let mut updated = String::new();
    let mut doi = String::new();
    let mut comment = String::new();
    let mut journal_ref = String::new();
    let mut link_url = String::new();
    let mut pdf_url = String::new();

    let mut buf = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                let name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                match name.as_str() {
                    "entry" => {
                        in_entry = true;
                        title.clear();
                        summary.clear();
                        authors.clear();
                        categories.clear();
                        published.clear();
                        updated.clear();
                        doi.clear();
                        comment.clear();
                        journal_ref.clear();
                        link_url.clear();
                        pdf_url.clear();
                    }
                    "author" if in_entry => in_author = true,
                    "name" if in_author => current_tag = "author_name".into(),
                    _ if in_entry => current_tag = name,
                    _ => current_tag = name,
                }

                if in_entry && e.name().as_ref() == b"link" {
                    extract_link_attrs(e, &mut link_url, &mut pdf_url);
                }

                if in_entry && e.name().as_ref() == b"category" {
                    extract_category_attr(e, &mut categories);
                }
            }
            Ok(Event::Empty(ref e)) => {
                if in_entry && e.name().as_ref() == b"category" {
                    extract_category_attr(e, &mut categories);
                }
                if in_entry && e.name().as_ref() == b"link" {
                    extract_link_attrs(e, &mut link_url, &mut pdf_url);
                }
            }
            Ok(Event::Text(ref e)) => {
                let txt = e.unescape().unwrap_or_default().to_string();
                match current_tag.as_str() {
                    "title" if in_entry => title.push_str(&txt),
                    "summary" => summary.push_str(&txt),
                    "author_name" => author_name.push_str(&txt),
                    "published" if in_entry => published.push_str(&txt),
                    "updated" if in_entry => updated.push_str(&txt),
                    "arxiv:doi" => doi.push_str(&txt),
                    "arxiv:comment" => comment.push_str(&txt),
                    "arxiv:journal_ref" => journal_ref.push_str(&txt),
                    // Feed-level opensearch fields
                    "opensearch:totalResults" if !in_entry => {
                        total_results = txt.trim().parse().unwrap_or(0);
                    }
                    "opensearch:startIndex" if !in_entry => {
                        start_index = txt.trim().parse().unwrap_or(0);
                    }
                    "opensearch:itemsPerPage" if !in_entry => {
                        items_per_page = txt.trim().parse().unwrap_or(0);
                    }
                    _ => {}
                }
            }
            Ok(Event::End(ref e)) => {
                let name_bytes = e.name().as_ref().to_vec();
                let name = String::from_utf8_lossy(&name_bytes);
                match name.as_ref() {
                    "entry" => {
                        let arxiv_id = link_url
                            .rsplit("/abs/")
                            .next()
                            .unwrap_or("")
                            .to_string();

                        let clean_title = title.replace('\n', " ").trim().to_string();
                        let clean_summary = summary.replace('\n', " ").trim().to_string();

                        // Only push entries that have at least a title or ID —
                        // skip genuinely empty / malformed entries.
                        if !clean_title.is_empty() || !arxiv_id.is_empty() {
                            papers.push(ArxivPaper {
                                arxiv_id,
                                title: clean_title,
                                summary: clean_summary,
                                authors: authors.clone(),
                                published: published.clone(),
                                updated: non_empty(updated.clone()),
                                categories: categories.clone(),
                                pdf_url: non_empty(pdf_url.clone()),
                                doi: non_empty(doi.clone()),
                                comment: non_empty(comment.clone()),
                                journal_ref: non_empty(journal_ref.clone()),
                                link_url: non_empty(link_url.clone()),
                            });
                        }
                        in_entry = false;
                    }
                    "author" => {
                        if !author_name.trim().is_empty() {
                            authors.push(author_name.trim().to_string());
                        }
                        author_name.clear();
                        in_author = false;
                    }
                    _ => {}
                }
                current_tag.clear();
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(Error::Xml(format!("XML parse error: {e}"))),
            _ => {}
        }
        buf.clear();
    }

    info!(
        total = total_results,
        returned = papers.len(),
        "Parsed arXiv Atom feed"
    );

    Ok(ArxivSearchResponse {
        total_results,
        start_index,
        items_per_page,
        papers,
    })
}

/// Convert an empty string to `None`.
fn non_empty(s: String) -> Option<String> {
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

/// Extract href/title/type attributes from a `<link>` element and assign to
/// the appropriate target.
fn extract_link_attrs(
    e: &quick_xml::events::BytesStart<'_>,
    link_url: &mut String,
    pdf_url: &mut String,
) {
    let mut href = String::new();
    let mut link_title = String::new();
    let mut link_type = String::new();
    for attr in e.attributes().flatten() {
        match attr.key.as_ref() {
            b"href" => href = String::from_utf8_lossy(&attr.value).to_string(),
            b"title" => link_title = String::from_utf8_lossy(&attr.value).to_string(),
            b"type" => link_type = String::from_utf8_lossy(&attr.value).to_string(),
            _ => {}
        }
    }
    if link_title == "pdf" || link_type == "application/pdf" {
        *pdf_url = href;
    } else if link_url.is_empty() {
        *link_url = href;
    }
}

/// Extract the `term` attribute from a `<category>` element.
fn extract_category_attr(
    e: &quick_xml::events::BytesStart<'_>,
    categories: &mut Vec<String>,
) {
    for attr in e.attributes().flatten() {
        if attr.key.as_ref() == b"term" {
            categories.push(String::from_utf8_lossy(&attr.value).to_string());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::arxiv::types::{validate_arxiv_id, validate_category, ArxivCategory, DateRange};
    use wiremock::matchers::{method, query_param};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    const SAMPLE_FEED: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <title>Attention Is All You Need</title>
    <summary>The dominant sequence transduction models...</summary>
    <author><name>Ashish Vaswani</name></author>
    <author><name>Noam Shazeer</name></author>
    <link href="http://arxiv.org/abs/1706.03762v7" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/1706.03762v7" title="pdf" type="application/pdf"/>
    <published>2017-06-12T17:57:34Z</published>
    <updated>2023-08-02T01:05:42Z</updated>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:doi>10.48550/arXiv.1706.03762</arxiv:doi>
  </entry>
</feed>"#;

    #[test]
    fn parse_sample_feed() {
        let resp = parse_atom_feed(SAMPLE_FEED).unwrap();
        assert_eq!(resp.total_results, 1);
        assert_eq!(resp.papers.len(), 1);

        let p = &resp.papers[0];
        assert_eq!(p.title, "Attention Is All You Need");
        assert_eq!(p.arxiv_id, "1706.03762v7");
        assert_eq!(p.authors, vec!["Ashish Vaswani", "Noam Shazeer"]);
        assert_eq!(p.categories, vec!["cs.CL", "cs.LG"]);
        assert!(p.published.starts_with("2017"));
        assert!(p.pdf_url.as_deref().unwrap().contains("pdf"));
        assert!(p.doi.is_some());
    }

    #[test]
    fn parse_empty_feed() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>0</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>10</opensearch:itemsPerPage>
</feed>"#;
        let resp = parse_atom_feed(xml).unwrap();
        assert_eq!(resp.total_results, 0);
        assert!(resp.papers.is_empty());
    }

    #[test]
    fn parse_entry_missing_optional_fields() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <title>Minimal Paper</title>
    <summary>No optional fields here.</summary>
    <author><name>Solo Author</name></author>
    <link href="http://arxiv.org/abs/2301.00001v1" rel="alternate" type="text/html"/>
    <published>2023-01-01T00:00:00Z</published>
  </entry>
</feed>"#;
        let resp = parse_atom_feed(xml).unwrap();
        assert_eq!(resp.papers.len(), 1);
        let p = &resp.papers[0];
        assert_eq!(p.title, "Minimal Paper");
        assert_eq!(p.authors, vec!["Solo Author"]);
        assert!(p.updated.is_none());
        assert!(p.pdf_url.is_none());
        assert!(p.doi.is_none());
        assert!(p.comment.is_none());
        assert!(p.journal_ref.is_none());
    }

    #[test]
    fn parse_entry_with_all_optional_fields() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <title>Full Paper With Everything</title>
    <summary>A paper with all optional fields populated.</summary>
    <author><name>Author One</name></author>
    <author><name>Author Two</name></author>
    <link href="http://arxiv.org/abs/2301.99999v3" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/2301.99999v3" title="pdf" type="application/pdf"/>
    <published>2023-01-15T12:00:00Z</published>
    <updated>2023-06-20T08:00:00Z</updated>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <category term="stat.ML" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:doi>10.1234/example.2023</arxiv:doi>
    <arxiv:comment>20 pages, 5 figures</arxiv:comment>
    <arxiv:journal_ref>Journal of ML Research, 2023</arxiv:journal_ref>
  </entry>
</feed>"#;
        let resp = parse_atom_feed(xml).unwrap();
        let p = &resp.papers[0];
        assert_eq!(p.title, "Full Paper With Everything");
        assert_eq!(p.authors, vec!["Author One", "Author Two"]);
        assert_eq!(p.categories, vec!["cs.AI", "cs.LG", "stat.ML"]);
        assert_eq!(p.updated.as_deref(), Some("2023-06-20T08:00:00Z"));
        assert_eq!(p.doi.as_deref(), Some("10.1234/example.2023"));
        assert_eq!(p.comment.as_deref(), Some("20 pages, 5 figures"));
        assert_eq!(
            p.journal_ref.as_deref(),
            Some("Journal of ML Research, 2023")
        );
    }

    #[test]
    fn parse_malformed_entry_skipped() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>2</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>2</opensearch:itemsPerPage>
  <entry>
    <title></title>
    <summary></summary>
  </entry>
  <entry>
    <title>Good Paper</title>
    <summary>Has a title.</summary>
    <link href="http://arxiv.org/abs/2301.11111v1" rel="alternate" type="text/html"/>
    <published>2023-01-10T00:00:00Z</published>
  </entry>
</feed>"#;
        let resp = parse_atom_feed(xml).unwrap();
        // The empty entry has no title AND no link_url so arxiv_id is also empty —
        // it gets skipped.
        assert_eq!(resp.papers.len(), 1);
        assert_eq!(resp.papers[0].title, "Good Paper");
    }

    #[test]
    fn parse_multiline_title_and_summary() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>1</opensearch:totalResults>
  <opensearch:startIndex>0</opensearch:startIndex>
  <opensearch:itemsPerPage>1</opensearch:itemsPerPage>
  <entry>
    <title>Multi
Line
Title</title>
    <summary>Summary with
newlines in it.</summary>
    <author><name>Test Author</name></author>
    <link href="http://arxiv.org/abs/2301.22222v1" rel="alternate" type="text/html"/>
    <published>2023-01-20T00:00:00Z</published>
  </entry>
</feed>"#;
        let resp = parse_atom_feed(xml).unwrap();
        let p = &resp.papers[0];
        assert_eq!(p.title, "Multi Line Title");
        assert_eq!(p.summary, "Summary with newlines in it.");
    }

    // --- ArXiv ID validation tests ---

    #[test]
    fn validate_new_format_ids() {
        assert!(validate_arxiv_id("2301.12345").is_ok());
        assert!(validate_arxiv_id("2301.12345v2").is_ok());
        assert!(validate_arxiv_id("2412.00001v1").is_ok());
        assert!(validate_arxiv_id("9912.99999").is_ok());
    }

    #[test]
    fn validate_old_format_ids() {
        assert!(validate_arxiv_id("hep-th/9901001").is_ok());
        assert!(validate_arxiv_id("hep-th/9901001v1").is_ok());
        assert!(validate_arxiv_id("math/0512345").is_ok());
    }

    #[test]
    fn reject_invalid_ids() {
        assert!(validate_arxiv_id("").is_err());
        assert!(validate_arxiv_id("not-an-id").is_err());
        assert!(validate_arxiv_id("2301.123").is_err()); // too short
        assert!(validate_arxiv_id("23X1.12345").is_err()); // non-digit
        assert!(validate_arxiv_id("hep-th/123").is_err()); // too short old format
    }

    // --- Category validation tests ---

    #[test]
    fn validate_categories() {
        assert!(validate_category("cs.AI").is_ok());
        assert!(validate_category("cs.CL").is_ok());
        assert!(validate_category("stat.ML").is_ok());
        assert!(validate_category("math.OC").is_ok());
        assert!(validate_category("quant-ph").is_ok());
        assert!(validate_category("hep-th").is_ok());
        assert!(validate_category("eess.SP").is_ok());
    }

    #[test]
    fn reject_invalid_categories() {
        assert!(validate_category("").is_err());
        assert!(validate_category(".AI").is_err());
        assert!(validate_category("cs.").is_err());
        assert!(validate_category("cs AI").is_err()); // space
    }

    // --- DateRange tests ---

    #[test]
    fn date_range_valid() {
        let dr = DateRange::new("20230101", "20231231").unwrap();
        assert_eq!(
            dr.to_query_fragment(),
            "submittedDate:[20230101+TO+20231231]"
        );
    }

    #[test]
    fn date_range_with_wildcard() {
        let dr = DateRange::new("20230101", "*").unwrap();
        assert_eq!(dr.to_query_fragment(), "submittedDate:[20230101+TO+*]");
    }

    #[test]
    fn date_range_invalid() {
        assert!(DateRange::new("2023-01-01", "2023-12-31").is_err()); // dashes
        assert!(DateRange::new("20230", "20231231").is_err()); // wrong length
    }

    // --- SearchQuery builder tests ---

    #[test]
    fn search_query_terms_only() {
        let q = SearchQuery::new().terms("transformer attention");
        assert_eq!(q.build_query_string(), "all:transformer+attention");
    }

    #[test]
    fn search_query_with_category() {
        let q = SearchQuery::new()
            .terms("LLM")
            .category(ArxivCategory::CsCL);
        assert_eq!(q.build_query_string(), "all:LLM+AND+cat:cs.CL");
    }

    #[test]
    fn search_query_multiple_categories() {
        let q = SearchQuery::new()
            .category(ArxivCategory::CsAI)
            .category(ArxivCategory::CsLG);
        assert_eq!(q.build_query_string(), "cat:cs.AI+AND+cat:cs.LG");
    }

    #[test]
    fn search_query_with_date_range() {
        let dr = DateRange::new("20240101", "20240630").unwrap();
        let q = SearchQuery::new().terms("diffusion").date_range(dr);
        assert_eq!(
            q.build_query_string(),
            "all:diffusion+AND+submittedDate:[20240101+TO+20240630]"
        );
    }

    #[test]
    fn search_query_category_and_date() {
        let dr = DateRange::new("20240101", "*").unwrap();
        let q = SearchQuery::new()
            .terms("RL")
            .category(ArxivCategory::CsAI)
            .date_range(dr);
        assert_eq!(
            q.build_query_string(),
            "all:RL+AND+cat:cs.AI+AND+submittedDate:[20240101+TO+*]"
        );
    }

    #[test]
    fn search_query_no_terms_no_categories() {
        let q = SearchQuery::new();
        assert_eq!(q.build_query_string(), "all:*");
    }

    #[test]
    fn search_query_category_str_valid() {
        let q = SearchQuery::new().category_str("cs.AI").unwrap();
        assert_eq!(q.categories, vec!["cs.AI"]);
    }

    #[test]
    fn search_query_category_str_invalid() {
        let result = SearchQuery::new().category_str("");
        assert!(result.is_err());
    }

    // --- Sort display tests ---

    #[test]
    fn sort_display() {
        assert_eq!(SortBy::Relevance.to_string(), "relevance");
        assert_eq!(SortBy::LastUpdatedDate.to_string(), "lastUpdatedDate");
        assert_eq!(SortBy::SubmittedDate.to_string(), "submittedDate");
        assert_eq!(SortOrder::Ascending.to_string(), "ascending");
        assert_eq!(SortOrder::Descending.to_string(), "descending");
    }

    // --- ArxivCategory display ---

    #[test]
    fn category_enum_display() {
        assert_eq!(ArxivCategory::CsAI.as_str(), "cs.AI");
        assert_eq!(ArxivCategory::CsCL.as_str(), "cs.CL");
        assert_eq!(ArxivCategory::StatML.as_str(), "stat.ML");
        assert_eq!(ArxivCategory::QuantPhysics.as_str(), "quant-ph");
    }

    // --- Wiremock integration tests ---

    #[tokio::test]
    async fn wiremock_search_returns_papers() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(query_param("max_results", "10"))
            .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_FEED))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let resp = client
            .search("attention", 0, 10, None, None)
            .await
            .unwrap();

        assert_eq!(resp.papers.len(), 1);
        assert_eq!(resp.papers[0].title, "Attention Is All You Need");
    }

    #[tokio::test]
    async fn wiremock_get_paper_validates_id() {
        let client = ArxivClient::new();
        let err = client.get_paper("bad-id").await.unwrap_err();
        assert!(matches!(err, Error::InvalidId(_)));
    }

    #[tokio::test]
    async fn wiremock_get_paper_by_id() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(query_param("id_list", "1706.03762"))
            .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_FEED))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let paper = client.get_paper("1706.03762").await.unwrap();
        assert_eq!(paper.title, "Attention Is All You Need");
    }

    #[tokio::test]
    async fn wiremock_advanced_search_with_category() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_FEED))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let query = SearchQuery::new()
            .terms("attention")
            .category(ArxivCategory::CsCL)
            .sort_by(SortBy::SubmittedDate)
            .sort_order(SortOrder::Descending)
            .max_results(5);

        let resp = client.search_advanced(&query).await.unwrap();
        assert_eq!(resp.papers.len(), 1);
    }

    #[tokio::test]
    async fn wiremock_fetch_batch() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_FEED))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let ids = vec!["1706.03762v7".to_string()];
        let papers = client.fetch_batch(&ids, 10).await.unwrap();
        assert_eq!(papers.len(), 1);
    }

    #[tokio::test]
    async fn wiremock_404_returns_api_error() {
        let server = MockServer::start().await;

        Mock::given(method("GET"))
            .respond_with(ResponseTemplate::new(404).set_body_string("Not Found"))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let err = client
            .search("nothing", 0, 10, None, None)
            .await
            .unwrap_err();
        assert!(matches!(err, Error::Api { status: 404, .. }));
    }

    #[tokio::test]
    async fn wiremock_search_all_pagination() {
        let server = MockServer::start().await;

        // Return SAMPLE_FEED (1 paper, total_results=1) for any request.
        // With total_limit=5, search_all should stop after the first page
        // since total_results(1) < start.
        Mock::given(method("GET"))
            .respond_with(ResponseTemplate::new(200).set_body_string(SAMPLE_FEED))
            .mount(&server)
            .await;

        let client = ArxivClient::with_base_url(&server.uri());
        let query = SearchQuery::new().terms("attention").max_results(10);
        let resp = client.search_all(&query, 5).await.unwrap();
        assert_eq!(resp.papers.len(), 1);
        assert_eq!(resp.total_results, 1);
    }
}
