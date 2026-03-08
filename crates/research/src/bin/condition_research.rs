use anyhow::{bail, Context, Result};
use research::paper::ResearchPaper;
use research::scholar::{SemanticScholarClient, PAPER_FIELDS_FULL, SEARCH_FIELDS};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;
use research::{CoreClient, CrossrefClient, OpenAlexClient};
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
    source: String,
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

impl From<ResearchPaper> for PaperRecord {
    fn from(p: ResearchPaper) -> Self {
        Self {
            paper_id: p.source_id,
            title: p.title,
            year: p.year,
            citation_count: p.citation_count,
            abstract_text: p.abstract_text,
            tldr: None,
            url: p.url.or(p.pdf_url),
            authors: p.authors,
            source: format!("{:?}", p.source),
        }
    }
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

    // 2. Search all research APIs in parallel
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
    eprintln!("Searching all research APIs for: {search_query}");

    let scholar = SemanticScholarClient::new(scholar_key.as_deref());
    let openalex = OpenAlexClient::new(std::env::var("OPENALEX_MAILTO").ok().as_deref());
    let crossref = CrossrefClient::new(std::env::var("CROSSREF_MAILTO").ok().as_deref());
    let core = CoreClient::new(std::env::var("CORE_API_KEY").ok().as_deref());

    let (scholar_res, openalex_res, crossref_res, core_res) = tokio::join!(
        async {
            scholar
                .search(&search_query, SEARCH_FIELDS, 15, 0)
                .await
                .map(|r| {
                    eprintln!("  Semantic Scholar: {} papers (relevance-ranked)", r.data.len());
                    r.data.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { eprintln!("  Semantic Scholar failed: {e}"); vec![] })
        },
        async {
            openalex.search(&search_query, 1, 10).await
                .map(|r| {
                    eprintln!("  OpenAlex: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { eprintln!("  OpenAlex failed: {e}"); vec![] })
        },
        async {
            crossref.search(&search_query, 10, 0).await
                .map(|r| {
                    let items = r.message.and_then(|m| m.items).unwrap_or_default();
                    eprintln!("  Crossref: {} papers", items.len());
                    items.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { eprintln!("  Crossref failed: {e}"); vec![] })
        },
        async {
            core.search(&search_query, 10, 0).await
                .map(|r| {
                    eprintln!("  CORE: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| { eprintln!("  CORE failed: {e}"); vec![] })
        },
    );

    // Merge and deduplicate by normalized title
    let mut all_papers: Vec<ResearchPaper> = Vec::new();
    all_papers.extend(scholar_res);
    all_papers.extend(openalex_res);
    all_papers.extend(crossref_res);
    all_papers.extend(core_res);

    // Deduplicate: prefer first occurrence (Semantic Scholar first = has TLDRs)
    let mut seen_titles = std::collections::HashSet::new();
    all_papers.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() { return false; }
        seen_titles.insert(key)
    });

    // Filter by medical relevance (keep papers from non-Scholar APIs that lack field data)
    const MEDICAL_FIELDS: &[&str] = &["Medicine", "Biology", "Chemistry", "Psychology"];
    all_papers.retain(|p| {
        match &p.fields_of_study {
            Some(fields) => fields.iter().any(|f| MEDICAL_FIELDS.iter().any(|m| f.contains(m))),
            None => true,
        }
    });

    // Sort by citations descending, take top 15
    all_papers.sort_by(|a, b| b.citation_count.unwrap_or(0).cmp(&a.citation_count.unwrap_or(0)));
    all_papers.truncate(15);

    eprintln!("Merged: {} unique papers after deduplication", all_papers.len());

    if all_papers.is_empty() {
        bail!("No papers found across any API for query: {search_query}");
    }

    // Get TLDRs for top 3 Semantic Scholar papers
    let top_scholar_ids: Vec<String> = all_papers.iter()
        .filter(|p| matches!(p.source, research::paper::PaperSource::SemanticScholar))
        .take(3)
        .map(|p| p.source_id.clone())
        .filter(|id| !id.is_empty())
        .collect();

    let mut tldrs = std::collections::HashMap::new();
    for pid in &top_scholar_ids {
        eprintln!("Fetching TLDR for paper {pid}...");
        match scholar.get_paper(pid, PAPER_FIELDS_FULL).await {
            Ok(p) => {
                if let Some(tldr) = p.tldr.and_then(|t| t.text) {
                    tldrs.insert(pid.clone(), tldr);
                }
            }
            Err(e) => eprintln!("  Warning: failed to fetch {pid}: {e}"),
        }
    }

    // Convert to PaperRecords with TLDRs
    let paper_records: Vec<PaperRecord> = all_papers
        .into_iter()
        .map(|p| {
            let tldr = tldrs.get(&p.source_id).cloned();
            let mut record = PaperRecord::from(p);
            record.tldr = tldr;
            record
        })
        .collect();

    // 4. Synthesize with team-based research agents
    let api_key = std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| "https://api.deepseek.com".to_string());

    let paper_context = build_paper_context(&paper_records);
    let tasks = condition_tasks(&condition.name, condition.notes.as_deref(), &paper_context);
    let team_size = 5;

    eprintln!(
        "Launching condition research team: {team_size} workers, {} tasks",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        api_key,
        base_url,
        scholar_key,
        code_root: None,
        tool_config: Some(SearchToolConfig {
            default_limit: 12,
            abstract_max_chars: 800,
            max_authors: 6,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        synthesis_preamble: Some(
            "You are a principal medical research synthesiser. You combine findings from \
             specialist research agents into a coherent, evidence-based clinical report. \
             Write in Markdown. Be concise but comprehensive. Cite specific papers where \
             possible and highlight the strength of evidence."
                .to_string(),
        ),
        synthesis_prompt_template: Some(format!(
            r#"# Synthesis Request: {condition_name} — Comprehensive Research Report

You have received findings from {{count}} parallel research agents, each covering a different
aspect of **{condition_name}**.

Your task: produce a **master clinical research synthesis** with:

1. **Executive Summary** — 3-5 bullet points
2. **Pathophysiology** — mechanisms and disease biology
3. **Diagnosis & Biomarkers** — identification and monitoring
4. **Differential Diagnosis** — overlapping conditions and distinguishing features
5. **Current Treatment Landscape** — evidence-based management
6. **Monitoring & Response Assessment** — what to track and how often
7. **Emerging Research & Clinical Trials** — promising new directions
8. **Patient Quality of Life** — psychological impact, lifestyle considerations
9. **Clinical Implications** — practical takeaways
10. **Evidence Gaps** — what the literature hasn't resolved
11. **Top Papers** — most impactful, with evidence strength ratings [Strong/Moderate/Limited/Emerging]

## Agent Findings

{{combined}}
"#,
            condition_name = condition.name,
        )),
    });

    let result = lead.run(tasks).await?;
    let synthesis = result.synthesis;

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

fn build_paper_context(papers: &[PaperRecord]) -> String {
    let mut text = String::new();
    for (i, pr) in papers.iter().enumerate() {
        text.push_str(&format!(
            "### Paper {} — {} ({}) [{}]\n",
            i + 1,
            pr.title,
            pr.year.map(|y| y.to_string()).unwrap_or("n/a".into()),
            pr.source,
        ));
        text.push_str(&format!("Citations: {}\n", pr.citation_count.unwrap_or(0)));
        if let Some(tldr) = &pr.tldr {
            text.push_str(&format!("TLDR: {tldr}\n"));
        }
        if let Some(abs) = &pr.abstract_text {
            let truncated = if abs.len() > 800 {
                let mut end = 800;
                while !abs.is_char_boundary(end) {
                    end -= 1;
                }
                &abs[..end]
            } else {
                abs
            };
            text.push_str(&format!("Abstract: {truncated}\n"));
        }
        text.push('\n');
    }
    text
}

fn condition_tasks(name: &str, notes: Option<&str>, paper_context: &str) -> Vec<ResearchTask> {
    let notes_section = notes
        .map(|n| format!("\nPatient notes: {n}\n"))
        .unwrap_or_default();

    let evidence_grading = "\nRate evidence strength: [Strong] systematic reviews/meta-analyses, \
         [Moderate] RCTs/large cohorts, [Limited] case series/expert opinion, \
         [Emerging] pre-clinical/early trials.\n";

    let context_block = format!(
        "Condition: {name}\n{notes_section}\n{evidence_grading}\n\
         The following papers have already been retrieved from academic APIs. \
         Use them as seed context and search for additional relevant papers.\n\n{paper_context}"
    );

    vec![
        ResearchTask {
            id: 1,
            subject: "pathophysiology-mechanisms".into(),
            description: format!(
                "Research the pathophysiology and biological mechanisms of {name}. Focus on: \
                 (1) underlying disease mechanisms and pathways, \
                 (2) genetic and molecular factors, \
                 (3) risk factors and disease progression models, \
                 (4) comorbidity relationships. \
                 Search for recent high-impact papers (2019-2026).\n\n{context_block}"
            ),
            preamble: "You are a biomedical researcher specialising in disease mechanisms \
                and pathophysiology. Produce structured findings in Markdown with paper citations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "diagnosis-biomarkers".into(),
            description: format!(
                "Research diagnostic approaches and biomarkers for {name}. Focus on: \
                 (1) established and emerging diagnostic criteria, \
                 (2) blood-based and molecular biomarkers, \
                 (3) screening recommendations and early detection, \
                 (4) differential diagnosis challenges, \
                 (5) differential diagnosis — conditions with overlapping presentation and distinguishing features. \
                 Search for recent clinical and laboratory papers (2019-2026).\n\n{context_block}"
            ),
            preamble: "You are a clinical diagnostics researcher specialising in biomarkers \
                and laboratory medicine. Produce structured findings in Markdown with citations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "treatment-management".into(),
            description: format!(
                "Research current treatment and management approaches for {name}. Focus on: \
                 (1) evidence-based pharmacological treatments, \
                 (2) non-pharmacological interventions (lifestyle, diet, exercise), \
                 (3) treatment guidelines and protocols, \
                 (4) comparative effectiveness of different approaches. \
                 Search for recent clinical trials and meta-analyses (2019-2026).\n\n{context_block}"
            ),
            preamble: "You are a clinical researcher specialising in treatment protocols \
                and evidence-based medicine. Produce structured findings in Markdown with citations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "emerging-research-trials".into(),
            description: format!(
                "Research emerging therapies and active clinical trials for {name}. Focus on: \
                 (1) novel therapeutic targets and drug candidates, \
                 (2) gene therapy and precision medicine approaches, \
                 (3) ongoing phase II/III clinical trials, \
                 (4) breakthrough findings in the last 2 years. \
                 Search for the most recent papers and trial results (2023-2026).\n\n{context_block}"
            ),
            preamble: "You are a translational medicine researcher tracking cutting-edge \
                therapies and clinical trials. Produce forward-looking findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "clinical-implications-synthesis".into(),
            description: format!(
                "Based on the findings from tasks 1-4, synthesise the key clinical implications \
                 for {name}. Address: \
                 (1) what patients and clinicians should know now, \
                 (2) which emerging approaches are most promising and realistic, \
                 (3) practical monitoring and management recommendations, \
                 (4) where the evidence is strong vs. where gaps remain. \
                 Integrate findings across all research angles.\n\n{context_block}"
            ),
            preamble: "You are a senior clinical advisor synthesising research findings into \
                actionable clinical guidance. Produce a clear, balanced assessment in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4],
            result: None,
        },
    ]
}
