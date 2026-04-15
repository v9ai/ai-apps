//! arXiv + Semantic Scholar API search.

use reqwest::Client;

/// Search arXiv API for papers by author name.
pub async fn arxiv_search(author: &str, max_results: usize) -> String {
    let client = Client::builder()
        .user_agent("ResearchBot/1.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap();

    let query = format!("au:{}", author.replace(' ', "+"));
    let url = format!(
        "http://export.arxiv.org/api/query?search_query={query}&max_results={max_results}&sortBy=submittedDate&sortOrder=descending"
    );

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => return format!("arXiv search failed: {e}"),
    };

    let xml = match resp.text().await {
        Ok(t) => t,
        Err(e) => return format!("arXiv parse failed: {e}"),
    };

    // Simple XML extraction — no full parser needed for Atom feed
    let mut results = Vec::new();
    for entry in xml.split("<entry>").skip(1) {
        let title = extract_tag(entry, "title").unwrap_or_default();
        let summary = extract_tag(entry, "summary").unwrap_or_default();
        let published = extract_tag(entry, "published").unwrap_or_default();
        let id = extract_tag(entry, "id").unwrap_or_default();

        let title = title.trim().replace('\n', " ");
        let summary = summary.trim().replace('\n', " ");
        let summary_short = &summary[..summary.len().min(300)];

        results.push(format!(
            "- [{title}]({id})\n  Published: {published}\n  {summary_short}"
        ));
    }

    if results.is_empty() {
        format!("(no arXiv results for {author})")
    } else {
        results.join("\n")
    }
}

/// Search Semantic Scholar for an author.
pub async fn semantic_scholar_search(author: &str) -> String {
    let client = Client::builder()
        .user_agent("ResearchBot/1.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap();

    let url = format!(
        "https://api.semanticscholar.org/graph/v1/author/search?query={}&fields=name,paperCount,citationCount,hIndex,papers.title,papers.year,papers.citationCount&limit=3",
        urlencoding(author)
    );

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => return format!("Semantic Scholar failed: {e}"),
    };

    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => return format!("Semantic Scholar parse failed: {e}"),
    };

    // Return raw JSON — let the LLM parse it
    if text.len() > 8000 {
        text[..8000].to_string()
    } else {
        text
    }
}

fn extract_tag(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let close = format!("</{tag}>");
    let start = xml.find(&open)?;
    let content_start = xml[start..].find('>')? + start + 1;
    let end = xml[content_start..].find(&close)? + content_start;
    Some(xml[content_start..end].to_string())
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "+".to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
}
