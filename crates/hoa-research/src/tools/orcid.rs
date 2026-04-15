//! ORCID API — fetch publications by ORCID ID.

use reqwest::Client;

/// Fetch works from ORCID public API.
pub async fn orcid_works(orcid_id: &str) -> String {
    let client = Client::builder()
        .user_agent("ResearchBot/1.0")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap();

    let url = format!("https://pub.orcid.org/v3.0/{orcid_id}/works");

    let resp = match client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => return format!("ORCID fetch failed: {e}"),
    };

    if !resp.status().is_success() {
        return format!("(ORCID HTTP {})", resp.status());
    }

    let text = match resp.text().await {
        Ok(t) => t,
        Err(e) => return format!("ORCID parse failed: {e}"),
    };

    // Return raw JSON — truncated to 8k chars, LLM will extract what it needs
    if text.len() > 8000 {
        text[..8000].to_string()
    } else {
        text
    }
}
