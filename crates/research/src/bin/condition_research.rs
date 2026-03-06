use anyhow::{bail, Context, Result};
use research::dual::{format_unified_synthesis, DualModelResearcher};
use research::scholar::{SemanticScholarClient, PAPER_FIELDS_FULL, SEARCH_FIELDS};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct Condition {
    id: String,
    user_id: String,
    name: String,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
struct PaperRecord {
    paper_id: String,
    title: String,
    year: Option<u32>,
    citation_count: Option<u64>,
    #[serde(rename = "abstract")]
    abstract_text: Option<String>,
    tldr: Option<String>,
    url: Option<String>,
    authors: Vec<String>,
}

#[derive(Debug, Serialize)]
struct UpsertBody {
    condition_id: String,
    user_id: String,
    papers: serde_json::Value,
    synthesis: String,
    paper_count: usize,
    search_query: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let condition_id = std::env::args()
        .nth(1)
        .context("Usage: condition-research <condition_id>")?;

    let supabase_url =
        std::env::var("SUPABASE_URL").context("SUPABASE_URL must be set")?;
    let service_key = std::env::var("SUPABASE_SERVICE_ROLE_KEY")
        .context("SUPABASE_SERVICE_ROLE_KEY must be set")?;
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    // 1. Fetch condition from Supabase
    eprintln!("Fetching condition {condition_id}...");
    let http = reqwest::Client::new();
    let conditions: Vec<Condition> = http
        .get(format!(
            "{supabase_url}/rest/v1/conditions?id=eq.{condition_id}&select=id,user_id,name,notes"
        ))
        .header("apikey", &service_key)
        .header("Authorization", format!("Bearer {service_key}"))
        .send()
        .await
        .context("Supabase request failed")?
        .json()
        .await
        .context("Failed to parse condition response")?;

    let condition = conditions
        .into_iter()
        .next()
        .context("Condition not found")?;

    eprintln!(
        "Condition: {} (user: {})",
        condition.name, condition.user_id
    );

    // 2. Search Semantic Scholar
    let search_query = match &condition.notes {
        Some(notes) if !notes.is_empty() => {
            let max = notes.len().min(200);
            let mut end = max;
            while !notes.is_char_boundary(end) && end > 0 {
                end -= 1;
            }
            format!("{} {}", condition.name, &notes[..end])
        }
        _ => condition.name.clone(),
    };
    eprintln!("Searching Semantic Scholar for: {search_query}");

    let scholar = SemanticScholarClient::new(scholar_key.as_deref());
    let bulk = scholar
        .search_bulk(
            &search_query,
            SEARCH_FIELDS,
            Some("2019-"),
            Some(3),
            Some("citationCount:desc"),
            15,
        )
        .await
        .context("Semantic Scholar bulk search failed")?;

    eprintln!(
        "Found {} papers (total: {})",
        bulk.data.len(),
        bulk.total.unwrap_or(0)
    );

    if bulk.data.is_empty() {
        bail!("No papers found for query: {search_query}");
    }

    // 3. Get full details on top 3 papers (for TLDRs)
    let top_ids: Vec<String> = bulk
        .data
        .iter()
        .take(3)
        .filter_map(|p| p.paper_id.clone())
        .collect();

    let mut detailed_papers = Vec::new();
    for pid in &top_ids {
        eprintln!("Fetching details for paper {pid}...");
        match scholar.get_paper(pid, PAPER_FIELDS_FULL).await {
            Ok(p) => detailed_papers.push(p),
            Err(e) => eprintln!("  Warning: failed to fetch {pid}: {e}"),
        }
    }

    // Build paper records for storage (top 15 only)
    let paper_records: Vec<PaperRecord> = bulk
        .data
        .iter()
        .take(15)
        .map(|p| {
            let tldr = detailed_papers
                .iter()
                .find(|d| d.paper_id == p.paper_id)
                .and_then(|d| d.tldr.as_ref())
                .and_then(|t| t.text.clone());

            PaperRecord {
                paper_id: p.paper_id.clone().unwrap_or_default(),
                title: p.title.clone().unwrap_or_default(),
                year: p.year,
                citation_count: p.citation_count,
                abstract_text: p.abstract_text.clone(),
                tldr,
                url: p.url.clone(),
                authors: p
                    .authors
                    .as_ref()
                    .map(|a| a.iter().filter_map(|a| a.name.clone()).collect())
                    .unwrap_or_default(),
            }
        })
        .collect();

    // 4. Synthesize with DualModelResearcher
    eprintln!("Running dual-model synthesis...");
    let researcher = DualModelResearcher::from_env()?;

    let mut paper_text = String::new();
    for (i, pr) in paper_records.iter().enumerate() {
        paper_text.push_str(&format!(
            "### Paper {} — {} ({})\n",
            i + 1,
            pr.title,
            pr.year.map(|y| y.to_string()).unwrap_or("n/a".into())
        ));
        paper_text.push_str(&format!(
            "Citations: {}\n",
            pr.citation_count.unwrap_or(0)
        ));
        if let Some(tldr) = &pr.tldr {
            paper_text.push_str(&format!("TLDR: {tldr}\n"));
        }
        if let Some(abs) = &pr.abstract_text {
            let truncated = if abs.len() > 500 {
                let mut end = 500;
                while !abs.is_char_boundary(end) { end -= 1; }
                &abs[..end]
            } else { abs };
            paper_text.push_str(&format!("Abstract: {truncated}\n"));
        }
        paper_text.push('\n');
    }

    let system_prompt = "You are a medical research synthesizer. Given a health condition and \
        relevant academic papers, produce a clear, evidence-based synthesis that: \
        (1) summarizes the key findings across papers, \
        (2) identifies consensus and disagreements, \
        (3) highlights practical clinical implications, \
        (4) notes gaps in the research. \
        Write for a knowledgeable but non-specialist audience. Use Markdown.";

    let notes_section = condition
        .notes
        .as_deref()
        .map(|n| format!("\n\nPatient notes: {n}"))
        .unwrap_or_default();

    let user_prompt = format!(
        "Condition: {}{notes_section}\n\n\
         Academic papers found ({} total):\n\n{paper_text}\n\n\
         Please synthesize the research findings for this condition.",
        condition.name,
        paper_records.len()
    );

    let response = researcher.query(system_prompt, &user_prompt).await?;
    let synthesis = format_unified_synthesis(&response);

    eprintln!("Synthesis complete ({} chars)", synthesis.len());

    // 5. Upsert to condition_researches
    eprintln!("Saving to condition_researches...");
    let body = UpsertBody {
        condition_id: condition.id,
        user_id: condition.user_id,
        papers: serde_json::to_value(&paper_records)?,
        synthesis,
        paper_count: paper_records.len(),
        search_query,
    };

    let resp = http
        .post(format!("{supabase_url}/rest/v1/condition_researches?on_conflict=condition_id"))
        .header("apikey", &service_key)
        .header("Authorization", format!("Bearer {service_key}"))
        .header("Content-Type", "application/json")
        .header("Prefer", "resolution=merge-duplicates")
        .json(&body)
        .send()
        .await
        .context("Supabase upsert failed")?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        bail!("Supabase upsert returned {status}: {text}");
    }

    eprintln!(
        "Done! Saved {} papers + synthesis for condition '{}'",
        body.paper_count, condition.name
    );

    Ok(())
}
