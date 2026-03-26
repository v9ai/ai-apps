use anyhow::Result;
use tracing::info;

use crate::d1::D1Client;

/// Generate a job pipeline status report using D1 aggregates + optional LLM summary.
pub async fn generate_report(
    db: &D1Client,
    deepseek: Option<&deepseek::DeepSeekClient<deepseek::ReqwestClient>>,
) -> Result<JobReport> {
    info!("Generating job pipeline report...");

    // Fetch status counts
    let rows = db
        .query(
            "SELECT status, count(*) as cnt FROM jobs GROUP BY status ORDER BY cnt DESC",
            None,
        )
        .await?;

    let mut status_counts: Vec<(String, i64)> = Vec::new();
    let mut total = 0i64;
    for row in &rows {
        let status = row
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("null")
            .to_string();
        let count = row.get("cnt").and_then(|v| v.as_i64()).unwrap_or(0);
        total += count;
        status_counts.push((status, count));
    }

    // EU remote jobs in last 7 days
    let recent_rows = db
        .query(
            "SELECT count(*) as cnt FROM jobs \
             WHERE status = 'eu-remote' AND updated_at > datetime('now', '-7 days')",
            None,
        )
        .await?;
    let recent_eu = recent_rows
        .first()
        .and_then(|r| r.get("cnt"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    // Top companies with EU remote jobs
    let company_rows = db
        .query(
            "SELECT company_name, count(*) as cnt FROM jobs \
             WHERE status = 'eu-remote' AND company_name IS NOT NULL \
             GROUP BY company_name ORDER BY cnt DESC LIMIT 10",
            None,
        )
        .await?;
    let top_companies: Vec<(String, i64)> = company_rows
        .iter()
        .map(|r| {
            let name = r
                .get("company_name")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown")
                .to_string();
            let cnt = r.get("cnt").and_then(|v| v.as_i64()).unwrap_or(0);
            (name, cnt)
        })
        .collect();

    // Build report text
    let mut text = String::from("# Job Pipeline Report\n\n");
    text.push_str(&format!("**Total jobs:** {total}\n\n"));
    text.push_str("## Status Breakdown\n\n");
    for (status, count) in &status_counts {
        text.push_str(&format!("- {status}: {count}\n"));
    }
    text.push_str(&format!("\n## EU Remote (last 7 days): {recent_eu}\n\n"));
    if !top_companies.is_empty() {
        text.push_str("## Top Companies (EU Remote)\n\n");
        for (name, count) in &top_companies {
            text.push_str(&format!("- {name}: {count}\n"));
        }
    }

    // Optional LLM summary
    let llm_summary = if let Some(ds) = deepseek {
        match generate_llm_summary(ds, &text).await {
            Ok(summary) => Some(summary),
            Err(e) => {
                tracing::warn!("LLM summary generation failed: {e}");
                None
            }
        }
    } else {
        None
    };

    if let Some(ref summary) = llm_summary {
        text.push_str(&format!("\n## AI Summary\n\n{summary}\n"));
    }

    Ok(JobReport {
        total,
        status_counts,
        recent_eu,
        top_companies,
        text,
        llm_summary,
    })
}

async fn generate_llm_summary(
    deepseek: &deepseek::DeepSeekClient<deepseek::ReqwestClient>,
    report_text: &str,
) -> Result<String> {
    let request = deepseek::ChatRequest {
        model: crate::DEFAULT_MODEL.to_string(),
        messages: vec![
            deepseek::system_msg(
                "You are a job market analyst. Summarize the given job pipeline report in 2-3 sentences, \
                 highlighting key trends and actionable insights for someone looking for remote EU AI engineering roles.",
            ),
            deepseek::user_msg(report_text),
        ],
        tools: None,
        tool_choice: None,
        temperature: Some(0.5),
        max_tokens: Some(300),
        stream: Some(false),
    };

    let response = deepseek.chat(&request).await?;
    let content = response
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    Ok(content.to_string())
}

#[derive(Debug)]
pub struct JobReport {
    pub total: i64,
    pub status_counts: Vec<(String, i64)>,
    pub recent_eu: i64,
    pub top_companies: Vec<(String, i64)>,
    pub text: String,
    pub llm_summary: Option<String>,
}
