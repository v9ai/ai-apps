use anyhow::{bail, Result};
use research::dual::{format_multi_unified_synthesis, MultiModelResearcher};
use research::paper::ResearchPaper;
use research::scholar::{SemanticScholarClient, PAPER_FIELDS_FULL, SEARCH_FIELDS};
use research::{CoreClient, CrossrefClient, OpenAlexClient};

const QUERIES: &[&str] = &[
    "\"text to speech\" neural synthesis",
    "\"zero-shot voice cloning\" | \"voice conversion\"",
    "\"codec language model\" speech synthesis",
    "instruction-following TTS | \"controllable speech synthesis\"",
];

async fn search_all_apis(
    query: &str,
    scholar: &SemanticScholarClient,
    openalex: &OpenAlexClient,
    crossref: &CrossrefClient,
    core: &CoreClient,
) -> Vec<ResearchPaper> {
    let (s, o, c, k) = tokio::join!(
        async {
            scholar
                .search_bulk(
                    query,
                    SEARCH_FIELDS,
                    Some("2025-"),
                    Some(0),
                    Some("publicationDate:desc"),
                    15,
                )
                .await
                .map(|r| {
                    eprintln!("  S2 [{query}]: {} papers", r.data.len());
                    r.data.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    eprintln!("  S2 [{query}] failed: {e}");
                    vec![]
                })
        },
        async {
            openalex
                .search(query, 1, 10)
                .await
                .map(|r| {
                    eprintln!("  OpenAlex [{query}]: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    eprintln!("  OpenAlex [{query}] failed: {e}");
                    vec![]
                })
        },
        async {
            crossref
                .search(query, 10, 0)
                .await
                .map(|r| {
                    let items = r.message.and_then(|m| m.items).unwrap_or_default();
                    eprintln!("  Crossref [{query}]: {} papers", items.len());
                    items.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    eprintln!("  Crossref [{query}] failed: {e}");
                    vec![]
                })
        },
        async {
            core.search(query, 10, 0)
                .await
                .map(|r| {
                    eprintln!("  CORE [{query}]: {} papers", r.results.len());
                    r.results.into_iter().map(ResearchPaper::from).collect::<Vec<_>>()
                })
                .unwrap_or_else(|e| {
                    eprintln!("  CORE [{query}] failed: {e}");
                    vec![]
                })
        },
    );

    let mut papers = Vec::new();
    papers.extend(s);
    papers.extend(o);
    papers.extend(c);
    papers.extend(k);
    papers
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();
    let scholar = SemanticScholarClient::new(scholar_key.as_deref());
    let openalex = OpenAlexClient::new(std::env::var("OPENALEX_MAILTO").ok().as_deref());
    let crossref = CrossrefClient::new(std::env::var("CROSSREF_MAILTO").ok().as_deref());
    let core = CoreClient::new(std::env::var("CORE_API_KEY").ok().as_deref());

    // Run all queries in parallel across all APIs
    eprintln!("Searching {} queries across 4 APIs...", QUERIES.len());

    let (r0, r1, r2, r3) = tokio::join!(
        search_all_apis(QUERIES[0], &scholar, &openalex, &crossref, &core),
        search_all_apis(QUERIES[1], &scholar, &openalex, &crossref, &core),
        search_all_apis(QUERIES[2], &scholar, &openalex, &crossref, &core),
        search_all_apis(QUERIES[3], &scholar, &openalex, &crossref, &core),
    );

    let mut all_papers: Vec<ResearchPaper> = Vec::new();
    all_papers.extend(r0);
    all_papers.extend(r1);
    all_papers.extend(r2);
    all_papers.extend(r3);

    // Deduplicate by normalized title
    let mut seen = std::collections::HashSet::new();
    all_papers.retain(|p| {
        let key = p.title.trim().to_lowercase();
        if key.is_empty() {
            return false;
        }
        seen.insert(key)
    });

    // Sort by year descending (newest first), then citations as tiebreaker
    all_papers.sort_by(|a, b| {
        b.year
            .unwrap_or(0)
            .cmp(&a.year.unwrap_or(0))
            .then(b.citation_count.unwrap_or(0).cmp(&a.citation_count.unwrap_or(0)))
    });
    all_papers.truncate(20);

    eprintln!(
        "Merged: {} unique papers after deduplication (top 20)",
        all_papers.len()
    );

    if all_papers.is_empty() {
        bail!("No papers found across any API");
    }

    // Fetch TLDRs for top Semantic Scholar papers
    let top_scholar_ids: Vec<String> = all_papers
        .iter()
        .filter(|p| matches!(p.source, research::paper::PaperSource::SemanticScholar))
        .take(5)
        .map(|p| p.source_id.clone())
        .filter(|id| !id.is_empty())
        .collect();

    let mut tldrs = std::collections::HashMap::new();
    for pid in &top_scholar_ids {
        eprintln!("Fetching TLDR for {pid}...");
        match scholar.get_paper(pid, PAPER_FIELDS_FULL).await {
            Ok(p) => {
                if let Some(tldr) = p.tldr.and_then(|t| t.text) {
                    tldrs.insert(pid.clone(), tldr);
                }
            }
            Err(e) => eprintln!("  Warning: TLDR fetch failed for {pid}: {e}"),
        }
    }

    // Build paper text for synthesis
    let mut paper_text = String::new();
    for (i, p) in all_papers.iter().enumerate() {
        paper_text.push_str(&format!(
            "### Paper {} — {} ({}) [{:?}]\n",
            i + 1,
            p.title,
            p.year.map(|y| y.to_string()).unwrap_or("n/a".into()),
            p.source,
        ));
        paper_text.push_str(&format!("Citations: {}\n", p.citation_count.unwrap_or(0)));
        if let Some(tldr) = tldrs.get(&p.source_id) {
            paper_text.push_str(&format!("TLDR: {tldr}\n"));
        }
        if let Some(abs) = &p.abstract_text {
            let truncated = if abs.len() > 500 {
                let mut end = 500;
                while !abs.is_char_boundary(end) {
                    end -= 1;
                }
                &abs[..end]
            } else {
                abs
            };
            paper_text.push_str(&format!("Abstract: {truncated}\n"));
        }
        if let Some(url) = p.url.as_ref().or(p.pdf_url.as_ref()) {
            paper_text.push_str(&format!("URL: {url}\n"));
        }
        paper_text.push('\n');
    }

    // Synthesize
    let researcher = MultiModelResearcher::from_env()?;
    eprintln!(
        "Running multi-model synthesis (providers: {})...",
        researcher.provider_names().join(", ")
    );

    let system_prompt = "You are a TTS research analyst. Given recent academic papers on \
        text-to-speech synthesis, produce a clear, structured synthesis that: \
        (1) identifies genuinely novel techniques vs incremental improvements, \
        (2) maps innovations to practical TTS capabilities — voice cloning, emotion/style control, \
        long-form synthesis, real-time streaming, multilingual support, \
        (3) highlights what could be integrated into an existing TTS pipeline that uses \
        chunked long-form synthesis via a cloud API (like DashScope/Qwen TTS), \
        (4) notes open-source models and implementations where available, \
        (5) identifies emerging trends and research directions. \
        Write in Markdown. Be specific about architectures, datasets, and results.";

    let user_prompt = format!(
        "Recent TTS research papers ({} total, sorted newest-first):\n\n{paper_text}\n\n\
         Synthesize the state of TTS research innovation as of early 2026. \
         Focus on what's genuinely new and practically useful.",
        all_papers.len()
    );

    let response = researcher.query(system_prompt, &user_prompt).await?;
    let synthesis = format_multi_unified_synthesis(&response);

    eprintln!("Synthesis complete ({} chars)", synthesis.len());

    // Build output markdown
    let mut output = String::from("# TTS Research — Innovation Survey (2025–2026)\n\n");
    output.push_str(&format!("Generated: {}\n\n", chrono_now()));
    output.push_str(&format!("Papers analyzed: {}\n\n", all_papers.len()));
    output.push_str("---\n\n");

    output.push_str("## Paper List\n\n");
    for (i, p) in all_papers.iter().enumerate() {
        let url_part = p
            .url
            .as_ref()
            .or(p.pdf_url.as_ref())
            .map(|u| format!(" — [link]({u})"))
            .unwrap_or_default();
        output.push_str(&format!(
            "{}. **{}** ({}, {:?}, {} citations){}\n",
            i + 1,
            p.title,
            p.year.map(|y| y.to_string()).unwrap_or("n/a".into()),
            p.source,
            p.citation_count.unwrap_or(0),
            url_part,
        ));
    }

    output.push_str("\n---\n\n");
    output.push_str("## Synthesis\n\n");
    output.push_str(&synthesis);
    output.push('\n');

    // Write output
    let out_dir = "research-output/tts-innovation";
    std::fs::create_dir_all(out_dir)?;
    let out_path = format!("{out_dir}/tts-research-2026.md");
    std::fs::write(&out_path, &output)?;

    eprintln!("Written to {out_path}");
    Ok(())
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now} (unix)")
}
