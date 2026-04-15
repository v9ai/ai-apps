//! DuckDuckGo web search via HTML scraping (no API key needed).

use reqwest::Client;
use scraper::{Html, Selector};

/// Search DuckDuckGo and return formatted results.
pub async fn web_search(query: &str) -> String {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (compatible; ResearchBot/1.0)")
        .build()
        .unwrap();

    let url = format!("https://html.duckduckgo.com/html/?q={}", urlencoding(query));

    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => return format!("Search failed: {e}"),
    };

    let html = match resp.text().await {
        Ok(t) => t,
        Err(e) => return format!("Search failed: {e}"),
    };

    let document = Html::parse_document(&html);
    let result_sel = Selector::parse(".result__body").unwrap();
    let title_sel = Selector::parse(".result__a").unwrap();
    let snippet_sel = Selector::parse(".result__snippet").unwrap();
    let url_sel = Selector::parse(".result__url").unwrap();

    let mut results = Vec::new();
    for result in document.select(&result_sel).take(15) {
        let title = result
            .select(&title_sel)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();
        let snippet = result
            .select(&snippet_sel)
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();
        let href = result
            .select(&url_sel)
            .next()
            .map(|e| e.text().collect::<String>().trim().to_string())
            .unwrap_or_default();

        if !title.is_empty() {
            results.push(format!("- [{title}]({href})\n  {}", &snippet[..snippet.len().min(300)]));
        }
    }

    if results.is_empty() {
        "(no results)".to_string()
    } else {
        results.join("\n")
    }
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
