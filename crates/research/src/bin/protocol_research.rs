use anyhow::{bail, Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use research::tools::SearchToolConfig;
use serde::Serialize;
use sqlx::postgres::PgPoolOptions;
use sqlx::types::JsonValue;

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";

// ── DB row types ────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct ProtocolRow {
    id: sqlx::types::Uuid,
    user_id: String,
    name: String,
    target_areas: JsonValue,
    notes: Option<String>,
}

#[derive(Debug, sqlx::FromRow)]
struct SupplementRow {
    id: sqlx::types::Uuid,
    name: String,
    dosage: String,
    frequency: String,
    mechanism: Option<String>,
    target_areas: JsonValue,
    notes: Option<String>,
}

// ── Output types for JSONB storage ──────────────────────────────────

#[derive(Debug, Serialize)]
struct SupplementFinding {
    supplement_id: String,
    supplement_name: String,
    task_id: usize,
    findings: String,
}

// ── Task generation ─────────────────────────────────────────────────

fn generate_tasks(protocol: &ProtocolRow, supplements: &[SupplementRow]) -> Vec<ResearchTask> {
    let protocol_context = format!(
        "Protocol: {}\nTarget areas: {}\nNotes: {}",
        protocol.name,
        protocol.target_areas,
        protocol.notes.as_deref().unwrap_or("(none)"),
    );

    let mut tasks: Vec<ResearchTask> = supplements
        .iter()
        .enumerate()
        .map(|(i, supp)| {
            let task_id = i + 1;
            let target_areas: Vec<String> = supp
                .target_areas
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            let mechanism_label = supp.mechanism.as_deref().unwrap_or("unknown");
            let supp_notes = supp.notes.as_deref().unwrap_or("");

            ResearchTask {
                id: task_id,
                subject: format!(
                    "supplement-{}",
                    supp.name
                        .to_lowercase()
                        .replace(' ', "-")
                        .replace('/', "-")
                        .replace('+', "-")
                        .replace('(', "")
                        .replace(')', "")
                ),
                description: format!(
                    "Research the cognitive and neuroprotective effects of **{name}** \
                     ({dosage}, {frequency}). Primary mechanism: {mechanism}. \
                     Target areas: {targets}. Context: {notes}\n\n\
                     Focus on:\n\
                     (1) Clinical evidence for cognitive/neuroprotective benefits — RCTs, \
                     meta-analyses, systematic reviews (2018-2026)\n\
                     (2) Mechanisms of action relevant to brain health — how {name} affects \
                     neuroinflammation, oxidative stress, mitochondrial function, \
                     neurotransmitter systems, or synaptic plasticity\n\
                     (3) Optimal dosing for cognitive outcomes — dose-response data, \
                     bioavailability considerations, timing\n\
                     (4) Safety profile and interactions — especially with other supplements \
                     in a brain health stack\n\
                     (5) Strength of evidence — rate as [Strong] systematic reviews/meta-analyses, \
                     [Moderate] RCTs/large cohorts, [Limited] case series/expert opinion, \
                     [Emerging] pre-clinical/early trials\n\n\
                     Protocol context: {protocol_context}",
                    name = supp.name,
                    dosage = supp.dosage,
                    frequency = supp.frequency,
                    mechanism = mechanism_label,
                    targets = target_areas.join(", "),
                    notes = supp_notes,
                    protocol_context = protocol_context,
                ),
                preamble: format!(
                    "You are a neuropharmacology researcher specialising in {mechanism} \
                     compounds and their effects on brain health. Produce structured findings \
                     in Markdown with paper citations and evidence strength ratings.",
                    mechanism = mechanism_label,
                ),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                ..Default::default()
            }
        })
        .collect();

    // Synthesis task depends on all per-supplement tasks
    let all_task_ids: Vec<usize> = (1..=supplements.len()).collect();
    let supplement_list = supplements
        .iter()
        .map(|s| {
            format!(
                "- {} ({}, {})",
                s.name,
                s.dosage,
                s.mechanism.as_deref().unwrap_or("?")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    tasks.push(ResearchTask {
        id: supplements.len() + 1,
        subject: "protocol-synthesis".into(),
        description: format!(
            "Based on the findings from all {count} supplement research tasks, synthesize \
             a comprehensive protocol analysis for **{name}**.\n\n\
             Supplements in this protocol:\n{supplements}\n\n\
             Address:\n\
             (1) Synergistic effects — which supplements work together and through what mechanisms\n\
             (2) Redundancies — any overlapping mechanisms where one supplement may be sufficient\n\
             (3) Interaction risks — potential negative interactions between supplements\n\
             (4) Evidence hierarchy — rank supplements by strength of clinical evidence\n\
             (5) Optimization recommendations — timing, stacking order, dosing adjustments\n\
             (6) Gaps — what the protocol is missing\n\
             (7) Overall evidence-based verdict on the protocol's likely efficacy\n\n\
             {protocol_context}",
            count = supplements.len(),
            name = protocol.name,
            supplements = supplement_list,
            protocol_context = protocol_context,
        ),
        preamble: "You are a senior integrative medicine researcher synthesising evidence \
            across multiple supplements in a brain health protocol. Produce a balanced, \
            evidence-based assessment in Markdown. Highlight synergies, redundancies, and gaps."
            .into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: all_task_ids,
        ..Default::default()
    });

    tasks
}

fn build_synthesis_preamble(protocol: &ProtocolRow) -> String {
    format!(
        "You are a principal neuroscience researcher synthesising findings from specialist \
         research agents, each analyzing a different supplement in the '{}' protocol. \
         Write in Markdown. Produce an evidence-based protocol assessment that identifies \
         synergies, redundancies, interaction risks, and gaps.",
        protocol.name
    )
}

fn build_synthesis_template(protocol: &ProtocolRow, supplements: &[SupplementRow]) -> String {
    let supplement_list = supplements
        .iter()
        .map(|s| {
            format!(
                "  - {} ({}, {})",
                s.name,
                s.dosage,
                s.mechanism.as_deref().unwrap_or("?")
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

    format!(
        r#"# Synthesis: {name} — Protocol Research Report

You have received findings from {{count}} parallel research agents, each covering a
supplement in **{name}**.

Supplements analyzed:
{supplement_list}

Produce a **master protocol research synthesis** with:

1. **Executive Summary** — 5-7 key findings
2. **Supplement Evidence Rankings** — ranked by clinical evidence strength
3. **Synergistic Combinations** — supplements that amplify each other
4. **Redundancies & Optimization** — where the protocol could be simplified
5. **Interaction Risks** — safety concerns from combining these supplements
6. **Protocol Gaps** — what mechanisms/targets are not covered
7. **Recommended Modifications** — evidence-based improvements
8. **Monitoring Recommendations** — biomarkers and cognitive tests to track efficacy
9. **Top Papers** — most impactful across all supplements

## Agent Findings

{{combined}}
"#,
        name = protocol.name,
        supplement_list = supplement_list,
    )
}

// ── Main ────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    // 1. Parse protocol ID
    let protocol_id = std::env::args()
        .nth(1)
        .or_else(|| std::env::var("PROTOCOL_ID").ok())
        .context("Usage: protocol-research <protocol_id>")?;

    let protocol_uuid: sqlx::types::Uuid = protocol_id
        .parse()
        .context("Invalid UUID format for protocol ID")?;

    // 2. Connect to Neon DB
    let db_url =
        std::env::var("DATABASE_URL").context("DATABASE_URL must be set")?;

    let pool = PgPoolOptions::new()
        .max_connections(3)
        .connect(&db_url)
        .await
        .context("Failed to connect to Neon database")?;

    eprintln!("Connected to Neon DB");

    // 3. Fetch protocol + supplements
    let protocol: ProtocolRow = sqlx::query_as(
        "SELECT id, user_id, name, target_areas, notes \
         FROM brain_health_protocols WHERE id = $1",
    )
    .bind(protocol_uuid)
    .fetch_optional(&pool)
    .await?
    .context("Protocol not found")?;

    let supplements: Vec<SupplementRow> = sqlx::query_as(
        "SELECT id, name, dosage, frequency, mechanism, target_areas, notes \
         FROM protocol_supplements WHERE protocol_id = $1 ORDER BY created_at",
    )
    .bind(protocol_uuid)
    .fetch_all(&pool)
    .await?;

    if supplements.is_empty() {
        bail!("No supplements found for protocol '{}'", protocol.name);
    }

    eprintln!(
        "Protocol: {} ({} supplements)",
        protocol.name,
        supplements.len()
    );
    for s in &supplements {
        eprintln!(
            "  - {} ({}, {})",
            s.name,
            s.dosage,
            s.mechanism.as_deref().unwrap_or("?")
        );
    }

    // 4. Insert a "running" row
    let research_id: sqlx::types::Uuid = sqlx::query_scalar(
        "INSERT INTO protocol_researches \
             (protocol_id, user_id, status, supplement_count) \
         VALUES ($1, $2, 'running', $3) RETURNING id",
    )
    .bind(protocol_uuid)
    .bind(&protocol.user_id)
    .bind(supplements.len().to_string())
    .fetch_one(&pool)
    .await?;

    eprintln!("Research row: {research_id}");
    let start = std::time::Instant::now();

    // 5. Generate tasks
    let tasks = generate_tasks(&protocol, &supplements);
    eprintln!("Generated {} tasks ({} supplements + synthesis)", tasks.len(), supplements.len());

    // 6. Output directory
    let out_dir = format!("research-output/protocol-{}", &protocol_id[..8]);
    std::fs::create_dir_all(&out_dir)
        .with_context(|| format!("creating {out_dir}"))?;

    // 7. Configure and run the team
    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    let team_size = supplements.len().min(10);
    eprintln!("Launching research team: {team_size} workers\n");

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek {
            api_key,
            base_url,
        },
        scholar_key,
        code_root: None,
        tool_config: Some(SearchToolConfig {
            default_limit: 25,
            abstract_max_chars: 1500,
            max_authors: 10,
            include_fields_of_study: true,
            include_venue: true,
            search_description: None,
            detail_description: None,
        }),
        scholar_concurrency: Some(5),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(out_dir.clone()),
        synthesis_preamble: Some(build_synthesis_preamble(&protocol)),
        synthesis_prompt_template: Some(build_synthesis_template(
            &protocol,
            &supplements,
        )),
        synthesis_provider: None,
        ranker: None,
        timeout_check_interval: None,
        progress_report_interval: None,
    });

    let result = lead.run(tasks).await;

    // 8. Save results
    match result {
        Ok(team_result) => {
            let duration_ms = start.elapsed().as_millis() as i64;

            // Build supplement findings
            let supplement_findings: Vec<SupplementFinding> = supplements
                .iter()
                .enumerate()
                .filter_map(|(i, supp)| {
                    let task_id = i + 1;
                    team_result
                        .findings
                        .iter()
                        .find(|(id, _, _)| *id == task_id)
                        .map(|(_, _, content)| SupplementFinding {
                            supplement_id: supp.id.to_string(),
                            supplement_name: supp.name.clone(),
                            task_id,
                            findings: content.clone(),
                        })
                })
                .collect();

            // Write markdown files
            for (id, subject, content) in &team_result.findings {
                let path = format!("{out_dir}/agent-{id:02}-{subject}.md");
                std::fs::write(&path, content)
                    .with_context(|| format!("writing {path}"))?;
                eprintln!("  wrote {path} ({} bytes)", content.len());
            }

            let synthesis_path = format!("{out_dir}/synthesis.md");
            std::fs::write(&synthesis_path, &team_result.synthesis)
                .with_context(|| format!("writing {synthesis_path}"))?;
            eprintln!("  wrote {synthesis_path}");

            // Combined report
            let mut combined =
                format!("# {} — Research Report\n\n", protocol.name);
            for (id, subject, content) in &team_result.findings {
                combined.push_str(&format!(
                    "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
                ));
            }
            combined.push_str("## Synthesis\n\n");
            combined.push_str(&team_result.synthesis);

            let combined_path =
                format!("{out_dir}/protocol-research-complete.md");
            std::fs::write(&combined_path, &combined)
                .with_context(|| format!("writing {combined_path}"))?;
            eprintln!(
                "  wrote {combined_path} ({} bytes)",
                combined.len()
            );

            // Update DB row
            let findings_json = serde_json::to_value(&supplement_findings)?;

            sqlx::query(
                "UPDATE protocol_researches \
                 SET status = 'completed', \
                     supplement_findings = $1, \
                     synthesis = $2, \
                     paper_count = $3, \
                     duration_ms = $4, \
                     updated_at = now() \
                 WHERE id = $5",
            )
            .bind(&findings_json)
            .bind(&team_result.synthesis)
            .bind(supplement_findings.len().to_string())
            .bind(duration_ms.to_string())
            .bind(research_id)
            .execute(&pool)
            .await?;

            eprintln!(
                "\nDone! {} supplements researched in {:.1}s",
                supplement_findings.len(),
                start.elapsed().as_secs_f64()
            );
        }
        Err(e) => {
            sqlx::query(
                "UPDATE protocol_researches \
                 SET status = 'failed', error_message = $1, updated_at = now() \
                 WHERE id = $2",
            )
            .bind(e.to_string())
            .bind(research_id)
            .execute(&pool)
            .await?;
            return Err(e);
        }
    }

    Ok(())
}
