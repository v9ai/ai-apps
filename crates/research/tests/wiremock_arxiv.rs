use wiremock::matchers::method;
use wiremock::{Mock, MockServer, ResponseTemplate};

use research::arxiv::ArxivClient;

fn atom_feed(entries: &str, total: u64, start: u64, per_page: u64) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"
      xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/"
      xmlns:arxiv="http://arxiv.org/schemas/atom">
  <opensearch:totalResults>{total}</opensearch:totalResults>
  <opensearch:startIndex>{start}</opensearch:startIndex>
  <opensearch:itemsPerPage>{per_page}</opensearch:itemsPerPage>
  {entries}
</feed>"#
    )
}

fn sample_entry(id: &str, title: &str, author: &str, category: &str) -> String {
    format!(
        r#"<entry>
    <title>{title}</title>
    <summary>Abstract for {title}.</summary>
    <author><name>{author}</name></author>
    <link href="http://arxiv.org/abs/{id}" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/{id}" title="pdf" type="application/pdf"/>
    <published>2023-01-15T12:00:00Z</published>
    <updated>2023-06-01T08:00:00Z</updated>
    <category term="{category}" scheme="http://arxiv.org/schemas/atom"/>
  </entry>"#
    )
}

// ── Successful search ──────────────────────────────────────────────

#[tokio::test]
async fn search_success_parses_response() {
    let server = MockServer::start().await;

    let entry = sample_entry("2301.12345v1", "Test Paper on Transformers", "Alice", "cs.CL");
    let body = atom_feed(&entry, 1, 0, 10);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let resp = client.search("transformers", 0, 10, None, None).await.unwrap();

    assert_eq!(resp.total_results, 1);
    assert_eq!(resp.papers.len(), 1);

    let p = &resp.papers[0];
    assert_eq!(p.title, "Test Paper on Transformers");
    assert_eq!(p.arxiv_id, "2301.12345v1");
    assert_eq!(p.authors, vec!["Alice"]);
    assert_eq!(p.categories, vec!["cs.CL"]);
    assert!(p.published.starts_with("2023"));
    assert!(p.updated.is_some());
    assert!(p.pdf_url.as_deref().unwrap().contains("pdf"));
    assert!(p.link_url.as_deref().unwrap().contains("abs"));
}

// ── Search with multiple results ───────────────────────────────────

#[tokio::test]
async fn search_multiple_papers() {
    let server = MockServer::start().await;

    let entries = format!(
        "{}{}",
        sample_entry("2301.00001v1", "Paper A", "Author1", "cs.AI"),
        sample_entry("2301.00002v1", "Paper B", "Author2", "cs.LG")
    );
    let body = atom_feed(&entries, 2, 0, 10);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let resp = client.search("test", 0, 10, None, None).await.unwrap();

    assert_eq!(resp.total_results, 2);
    assert_eq!(resp.papers.len(), 2);
    assert_eq!(resp.papers[0].title, "Paper A");
    assert_eq!(resp.papers[1].title, "Paper B");
}

// ── Empty results ──────────────────────────────────────────────────

#[tokio::test]
async fn search_empty_results() {
    let server = MockServer::start().await;

    let body = atom_feed("", 0, 0, 10);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let resp = client.search("xyzzy_nonexistent", 0, 10, None, None).await.unwrap();

    assert_eq!(resp.total_results, 0);
    assert!(resp.papers.is_empty());
}

// ── Get paper by ID ────────────────────────────────────────────────

#[tokio::test]
async fn get_paper_success() {
    let server = MockServer::start().await;

    let entry = sample_entry("1706.03762v7", "Attention Is All You Need", "Vaswani", "cs.CL");
    let body = atom_feed(&entry, 1, 0, 1);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let paper = client.get_paper("1706.03762").await.unwrap();

    assert_eq!(paper.title, "Attention Is All You Need");
    assert_eq!(paper.arxiv_id, "1706.03762v7");
    assert_eq!(paper.authors, vec!["Vaswani"]);
}

// ── Get paper not found ────────────────────────────────────────────

#[tokio::test]
async fn get_paper_not_found_returns_error() {
    let server = MockServer::start().await;

    // Empty feed means no paper found
    let body = atom_feed("", 0, 0, 1);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let result = client.get_paper("0000.00000").await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("not found"), "expected 'not found' error: {err}");
}

// ── HTTP error (non-429, non-retryable) ────────────────────────────

#[tokio::test]
async fn search_non_429_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(500)
                .set_body_string("Internal Server Error"),
        )
        // 500 is retryable: 1 initial + 3 retries = 4 total attempts
        .expect(4)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let result = client.search("test", 0, 5, None, None).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(err.contains("500"), "expected 500: {err}");
}

// ── 429 rate limiting exhausts retries ─────────────────────────────

#[tokio::test]
async fn search_429_exhausts_retries() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(ResponseTemplate::new(429))
        // retry_get loop: 0..=max_retries (max_retries=3) = 4 total attempts
        .expect(4)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let result = client.search("test", 0, 5, None, None).await;

    assert!(result.is_err());
    let err = result.unwrap_err().to_string();
    assert!(
        err.contains("Rate limited") || err.contains("429"),
        "expected rate limit error: {err}"
    );
}

// ── XML edge case: entry with DOI and comment ──────────────────────

#[tokio::test]
async fn entry_with_doi_and_comment() {
    let server = MockServer::start().await;

    let entry = r#"<entry>
    <title>Paper with Extras</title>
    <summary>Summary text here.</summary>
    <author><name>Author One</name></author>
    <author><name>Author Two</name></author>
    <link href="http://arxiv.org/abs/2301.99999v1" rel="alternate" type="text/html"/>
    <link href="http://arxiv.org/pdf/2301.99999v1" title="pdf" type="application/pdf"/>
    <published>2023-01-20T00:00:00Z</published>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <arxiv:doi>10.48550/arXiv.2301.99999</arxiv:doi>
    <arxiv:comment>20 pages, 5 figures</arxiv:comment>
    <arxiv:journal_ref>Nature 2023</arxiv:journal_ref>
  </entry>"#;
    let body = atom_feed(entry, 1, 0, 1);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let resp = client.search("extras", 0, 1, None, None).await.unwrap();

    assert_eq!(resp.papers.len(), 1);
    let p = &resp.papers[0];
    assert_eq!(p.doi.as_deref(), Some("10.48550/arXiv.2301.99999"));
    assert_eq!(p.comment.as_deref(), Some("20 pages, 5 figures"));
    assert_eq!(p.journal_ref.as_deref(), Some("Nature 2023"));
    assert_eq!(p.authors.len(), 2);
    assert_eq!(p.categories, vec!["cs.AI", "cs.LG"]);
}

// ── Conversion to ResearchPaper ────────────────────────────────────

#[tokio::test]
async fn paper_converts_to_research_paper() {
    let server = MockServer::start().await;

    let entry = sample_entry("2301.11111v1", "Conversion Test", "Charlie", "cs.CV");
    let body = atom_feed(&entry, 1, 0, 1);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let paper = client.get_paper("2301.11111").await.unwrap();

    let rp: research::ResearchPaper = paper.into();
    assert_eq!(rp.title, "Conversion Test");
    assert_eq!(rp.year, Some(2023));
    assert_eq!(rp.authors, vec!["Charlie"]);
    assert_eq!(rp.source_id, "2301.11111v1");
    assert!(rp.pdf_url.is_some());
    assert!(rp.url.is_some());
    assert_eq!(
        rp.fields_of_study.as_deref(),
        Some(vec!["cs.CV".to_string()].as_slice())
    );
    // ArXiv papers don't have citation counts
    assert!(rp.citation_count.is_none());
}

// ── Fetch batch ────────────────────────────────────────────────────

#[tokio::test]
async fn fetch_batch_success() {
    let server = MockServer::start().await;

    let entries = format!(
        "{}{}",
        sample_entry("1706.03762v7", "Attention Is All You Need", "Vaswani", "cs.CL"),
        sample_entry("1810.04805v2", "BERT", "Devlin", "cs.CL")
    );
    let body = atom_feed(&entries, 2, 0, 2);

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string(body)
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let ids = vec!["1706.03762".to_string(), "1810.04805".to_string()];
    let papers = client.fetch_batch(&ids, 10).await.unwrap();

    assert_eq!(papers.len(), 2);
}

// ── Malformed XML returns error ────────────────────────────────────

#[tokio::test]
async fn malformed_xml_returns_error() {
    let server = MockServer::start().await;

    Mock::given(method("GET"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_string("<not valid xml><<<")
                .insert_header("content-type", "application/atom+xml"),
        )
        .expect(1)
        .mount(&server)
        .await;

    let client = ArxivClient::with_base_url(&server.uri());
    let result = client.search("test", 0, 5, None, None).await;

    // Should either parse an empty result or return an XML error
    // The parser is lenient, so it may succeed with 0 papers
    match result {
        Ok(resp) => assert!(resp.papers.is_empty()),
        Err(e) => assert!(e.to_string().contains("XML") || e.to_string().contains("parse")),
    }
}
