use std::time::Duration;

use quick_xml::events::Event;
use quick_xml::Reader;
use tokio::time::sleep;
use tracing::info;

use super::error::Error;
use super::types::{ArxivPaper, ArxivSearchResponse};

const BASE_URL: &str = "http://export.arxiv.org/api/query";
const MAX_RETRIES: u32 = 3;
const POLITE_DELAY: Duration = Duration::from_secs(3);

#[derive(Clone)]
pub struct ArxivClient {
    http: reqwest::Client,
    base_url: String,
}

impl ArxivClient {
    pub fn new() -> Self {
        Self::with_base_url(BASE_URL)
    }

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

    pub async fn search(
        &self,
        query: &str,
        start: u32,
        max_results: u32,
        sort_by: Option<&str>,
        sort_order: Option<&str>,
    ) -> Result<ArxivSearchResponse, Error> {
        let encoded_query = urlencoded(query);
        let sort_by = sort_by.unwrap_or("relevance");
        let sort_order = sort_order.unwrap_or("descending");

        let url = format!(
            "{}?search_query=all:{}&start={}&max_results={}&sortBy={}&sortOrder={}",
            self.base_url, encoded_query, start, max_results, sort_by, sort_order
        );

        let body = self.get_xml(&url).await?;
        parse_atom_feed(&body)
    }

    /// Fetch multiple papers by ID in batches via `id_list`.
    pub async fn fetch_batch(
        &self,
        ids: &[String],
        batch_size: usize,
    ) -> Result<Vec<ArxivPaper>, Error> {
        let mut all = Vec::new();
        let bs = batch_size.max(1);
        for (i, chunk) in ids.chunks(bs).enumerate() {
            let id_list = chunk.join(",");
            let url = format!(
                "{}?id_list={}&max_results={}",
                self.base_url,
                id_list,
                chunk.len()
            );
            let body = self.get_xml(&url).await?;
            let resp = parse_atom_feed(&body)?;
            info!(
                batch = i + 1,
                requested = chunk.len(),
                fetched = resp.papers.len(),
                "arXiv batch fetch"
            );
            all.extend(resp.papers);
        }
        Ok(all)
    }

    pub async fn get_paper(&self, arxiv_id: &str) -> Result<ArxivPaper, Error> {
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

    async fn get_xml(&self, url: &str) -> Result<String, Error> {
        let mut last_err = None;

        for attempt in 0..MAX_RETRIES {
            if attempt > 0 {
                let backoff = Duration::from_secs(2u64.pow(attempt));
                sleep(backoff).await;
            }

            let resp = self.http.get(url).send().await?;
            let status = resp.status().as_u16();

            if status == 429 {
                last_err = Some(Error::RateLimited { retry_after: 5 });
                continue;
            }

            if status >= 400 {
                let body = resp.text().await.unwrap_or_default();
                return Err(Error::Api {
                    status,
                    message: body,
                });
            }

            let body = resp.text().await?;

            // Polite delay after successful request
            sleep(POLITE_DELAY).await;

            return Ok(body);
        }

        Err(last_err.unwrap_or(Error::Api {
            status: 503,
            message: "Max retries exceeded".into(),
        }))
    }
}

impl Default for ArxivClient {
    fn default() -> Self {
        Self::new()
    }
}

fn urlencoded(s: &str) -> String {
    s.replace(' ', "+").replace('\"', "%22")
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
                let name = std::str::from_utf8(e.name().as_ref())
                    .unwrap_or("")
                    .to_string();
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
                    let mut href = String::new();
                    let mut link_title = String::new();
                    let mut link_type = String::new();
                    for attr in e.attributes().flatten() {
                        match attr.key.as_ref() {
                            b"href" => {
                                href = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            b"title" => {
                                link_title = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            b"type" => {
                                link_type = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            _ => {}
                        }
                    }
                    if link_title == "pdf" || link_type == "application/pdf" {
                        pdf_url = href;
                    } else if link_url.is_empty() {
                        link_url = href;
                    }
                }

                if in_entry && e.name().as_ref() == b"category" {
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"term" {
                            categories
                                .push(String::from_utf8_lossy(&attr.value).to_string());
                        }
                    }
                }
            }
            Ok(Event::Empty(ref e)) => {
                if in_entry && e.name().as_ref() == b"category" {
                    for attr in e.attributes().flatten() {
                        if attr.key.as_ref() == b"term" {
                            categories
                                .push(String::from_utf8_lossy(&attr.value).to_string());
                        }
                    }
                }
                if in_entry && e.name().as_ref() == b"link" {
                    let mut href = String::new();
                    let mut link_title = String::new();
                    let mut link_type = String::new();
                    for attr in e.attributes().flatten() {
                        match attr.key.as_ref() {
                            b"href" => {
                                href = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            b"title" => {
                                link_title = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            b"type" => {
                                link_type = String::from_utf8_lossy(&attr.value).to_string()
                            }
                            _ => {}
                        }
                    }
                    if link_title == "pdf" || link_type == "application/pdf" {
                        pdf_url = href;
                    } else if link_url.is_empty() {
                        link_url = href;
                    }
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
                let name = std::str::from_utf8(&name_bytes).unwrap_or("");
                match name {
                    "entry" => {
                        let arxiv_id = link_url
                            .rsplit("/abs/")
                            .next()
                            .unwrap_or("")
                            .to_string();

                        let clean_title =
                            title.replace('\n', " ").trim().to_string();
                        let clean_summary =
                            summary.replace('\n', " ").trim().to_string();

                        if !clean_title.is_empty() {
                            papers.push(ArxivPaper {
                                arxiv_id,
                                title: clean_title,
                                summary: clean_summary,
                                authors: authors.clone(),
                                published: published.clone(),
                                updated: if updated.is_empty() {
                                    None
                                } else {
                                    Some(updated.clone())
                                },
                                categories: categories.clone(),
                                pdf_url: if pdf_url.is_empty() {
                                    None
                                } else {
                                    Some(pdf_url.clone())
                                },
                                doi: if doi.is_empty() {
                                    None
                                } else {
                                    Some(doi.clone())
                                },
                                comment: if comment.is_empty() {
                                    None
                                } else {
                                    Some(comment.clone())
                                },
                                journal_ref: if journal_ref.is_empty() {
                                    None
                                } else {
                                    Some(journal_ref.clone())
                                },
                                link_url: if link_url.is_empty() {
                                    None
                                } else {
                                    Some(link_url.clone())
                                },
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
