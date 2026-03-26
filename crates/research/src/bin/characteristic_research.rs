use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};
use serde::{Deserialize, Serialize};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/characteristics";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CharacteristicInput {
    id: Option<i64>,
    title: String,
    description: Option<String>,
    category: String,
    severity: Option<String>,
    age_years: Option<i64>,
    tags: Option<Vec<String>>,
    impairment_domains: Option<Vec<String>>,
    externalized_name: Option<String>,
    strengths: Option<String>,
    family_member_name: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CharacteristicOutput {
    characteristic_id: Option<i64>,
    findings: Vec<Finding>,
    synthesis: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Finding {
    task_id: usize,
    subject: String,
    content: String,
}

fn build_context(input: &CharacteristicInput) -> String {
    let mut ctx = format!("Characteristic: {}", input.title);
    if let Some(desc) = &input.description {
        ctx.push_str(&format!("\nDescription: {desc}"));
    }
    ctx.push_str(&format!("\nCategory: {}", input.category));
    if let Some(sev) = &input.severity {
        ctx.push_str(&format!("\nSeverity: {sev}"));
    }
    if let Some(age) = input.age_years {
        let tier = match age {
            0..=5 => "Early Childhood (2-5)",
            6..=11 => "Middle Childhood (6-11)",
            12..=14 => "Early Adolescence (12-14)",
            15..=18 => "Late Adolescence (15-18)",
            _ => "Adult",
        };
        ctx.push_str(&format!("\nAge: {age} years ({tier})"));
    }
    if let Some(tags) = &input.tags {
        if !tags.is_empty() {
            ctx.push_str(&format!("\nTags: {}", tags.join(", ")));
        }
    }
    if let Some(domains) = &input.impairment_domains {
        if !domains.is_empty() {
            ctx.push_str(&format!(
                "\nImpairment domains: {}",
                domains.join(", ")
            ));
        }
    }
    if let Some(name) = &input.externalized_name {
        ctx.push_str(&format!("\nExternalized name: {name}"));
    }
    if let Some(strengths) = &input.strengths {
        ctx.push_str(&format!("\nStrengths: {strengths}"));
    }
    if let Some(name) = &input.family_member_name {
        ctx.push_str(&format!("\nFamily member: {name}"));
    }
    ctx
}

fn age_qualifier(age: Option<i64>) -> String {
    age.map(|a| {
        match a {
            0..=5 => "in early childhood (ages 2-5)",
            6..=11 => "in middle childhood (ages 6-11)",
            12..=14 => "in early adolescence (ages 12-14)",
            15..=18 => "in late adolescence (ages 15-18)",
            _ => "in adults",
        }
        .to_string()
    })
    .unwrap_or_default()
}

fn research_tasks(input: &CharacteristicInput) -> Vec<ResearchTask> {
    let context = build_context(input);
    let title = &input.title;
    let aq = age_qualifier(input.age_years);

    let severity_q = input
        .severity
        .as_deref()
        .map(|s| format!(" ({} severity)", s.to_lowercase()))
        .unwrap_or_default();

    let domain_q = input
        .impairment_domains
        .as_ref()
        .map(|d| {
            if d.is_empty() {
                String::new()
            } else {
                format!(
                    " affecting {}",
                    d.iter()
                        .map(|s| s.replace('_', " ").to_lowercase())
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            }
        })
        .unwrap_or_default();

    let mut tasks = match input.category.as_str() {
        "PRIORITY_CONCERN" | "SUPPORT_NEED" => vec![
            ResearchTask {
                id: 1,
                subject: "evidence-based-interventions".into(),
                description: format!(
                    "Research evidence-based interventions for '{title}'{severity_q} {aq}. \
                    Focus on: (1) systematic reviews and meta-analyses of treatment approaches, \
                    (2) randomized controlled trials published 2019-2026, \
                    (3) clinical practice guidelines from major professional bodies (APA, NICE, AAP), \
                    (4) effect sizes and number-needed-to-treat where available, \
                    (5) parent-mediated and family-based intervention variants. \
                    Context: {context}"
                ),
                preamble: "You are a clinical child psychology researcher. Find the strongest \
                    evidence-based interventions. Prioritize systematic reviews > RCTs > clinical \
                    guidelines. Report effect sizes when available. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 2,
                subject: "assessment-monitoring".into(),
                description: format!(
                    "Research validated assessment tools and progress monitoring for '{title}' {aq}. \
                    Focus on: (1) standardized instruments with psychometric properties, \
                    (2) brief screening tools suitable for repeated caregiver measurement, \
                    (3) behavioral coding systems and observation protocols, \
                    (4) digital assessment approaches and app-based monitoring, \
                    (5) measurement-based care frameworks for tracking treatment response. \
                    Context: {context}"
                ),
                preamble: "You are a psychometric and clinical assessment researcher. Find validated \
                    tools that families and clinicians can use. Report reliability/validity. \
                    Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 3,
                subject: "family-strategies".into(),
                description: format!(
                    "Research family-based strategies and parent training for '{title}' {aq}{domain_q}. \
                    Focus on: (1) parent management training (PMT) and PCIT evidence, \
                    (2) psychoeducation materials for caregivers, \
                    (3) daily routines and environmental modifications, \
                    (4) communication strategies and de-escalation techniques, \
                    (5) caregiver self-care and burnout prevention. \
                    Context: {context}"
                ),
                preamble: "You are a family therapy researcher specializing in parent-mediated \
                    interventions. Find practical, implementable strategies. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 4,
                subject: "developmental-trajectory".into(),
                description: format!(
                    "Research the developmental trajectory and prognostic factors for '{title}' {aq}. \
                    Focus on: (1) natural course with and without intervention, \
                    (2) protective factors predicting positive outcomes, \
                    (3) risk factors for persistence or escalation, \
                    (4) developmental transition points affecting this concern, \
                    (5) comorbidity patterns and how co-occurring conditions modify trajectory. \
                    Context: {context}"
                ),
                preamble: "You are a developmental psychopathology researcher. Map the longitudinal \
                    trajectory and identify modifiable prognostic factors. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
        ],
        "STRENGTH" => vec![
            ResearchTask {
                id: 1,
                subject: "strength-leveraging".into(),
                description: format!(
                    "Research how '{title}' can be leveraged as a therapeutic resource {aq}. \
                    Focus on: (1) strength-based intervention models (positive psychology, solution-focused), \
                    (2) how this strength buffers against risk factors, \
                    (3) research on using strengths to address co-occurring challenges, \
                    (4) broaden-and-build theory applications, \
                    (5) how to systematically identify and amplify this strength. \
                    Context: {context}"
                ),
                preamble: "You are a positive psychology and strength-based intervention researcher. \
                    Find evidence for therapeutic leveraging. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 2,
                subject: "protective-factors".into(),
                description: format!(
                    "Research '{title}' as a protective factor {aq}. Focus on: \
                    (1) resilience research — how this trait protects against adversity, \
                    (2) longitudinal studies tracking this strength's impact, \
                    (3) how to cultivate and maintain through development, \
                    (4) interaction effects with risk factors and other strengths. \
                    Context: {context}"
                ),
                preamble: "You are a resilience and protective factors researcher. Identify how \
                    this strength operates as a buffer. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 3,
                subject: "strength-development".into(),
                description: format!(
                    "Research evidence-based approaches to further develop '{title}' {aq}. \
                    Focus on: (1) enrichment programs and activities, \
                    (2) deliberate practice research, \
                    (3) scaffolding and zone of proximal development, \
                    (4) how family and school environments can nurture this strength. \
                    Context: {context}"
                ),
                preamble: "You are an educational psychology and talent development researcher. \
                    Find evidence for growing this strength. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
            ResearchTask {
                id: 4,
                subject: "cross-domain-transfer".into(),
                description: format!(
                    "Research how '{title}' transfers across domains {aq}. Focus on: \
                    (1) transfer of learning research, \
                    (2) how mastery in one area builds confidence in others, \
                    (3) generalization of strengths to new contexts, \
                    (4) self-efficacy and identity research. \
                    Context: {context}"
                ),
                preamble: "You are a cognitive and developmental researcher. Find evidence for \
                    cross-domain transfer. Write in Markdown."
                    .into(),
                status: TaskStatus::Pending,
                owner: None,
                dependencies: vec![],
                result: None,
            },
        ],
        _ => vec![],
    };

    // Synthesis task depends on all preceding tasks.
    let dep_ids: Vec<usize> = tasks.iter().map(|t| t.id).collect();
    let synthesis_id = tasks.len() + 1;

    let synthesis_desc = match input.category.as_str() {
        "PRIORITY_CONCERN" | "SUPPORT_NEED" => format!(
            "Synthesize all findings about '{title}' {aq}. Produce: \
            (1) A prioritized intervention plan ranked by evidence strength, \
            (2) A recommended assessment protocol with tools and schedule, \
            (3) Top 5 family strategies the caregiver can start this week, \
            (4) Red flags signaling need for professional referral, \
            (5) Confidence ratings (high/moderate/low evidence) for each recommendation. \
            Context: {context}"
        ),
        "STRENGTH" => format!(
            "Synthesize all findings about '{title}' {aq}. Produce: \
            (1) A strength amplification plan with concrete activities, \
            (2) Cross-domain applications to help in areas of challenge, \
            (3) Top 5 things caregivers can do to nurture this strength, \
            (4) Developmental considerations for sustaining it through transitions, \
            (5) Confidence ratings for each recommendation. \
            Context: {context}"
        ),
        _ => format!("Synthesize findings about '{title}'. Context: {context}"),
    };

    tasks.push(ResearchTask {
        id: synthesis_id,
        subject: "actionable-synthesis".into(),
        description: synthesis_desc,
        preamble: "You are a clinical practice guideline developer. Translate research into \
            actionable, family-friendly recommendations. Use plain language. Structure in Markdown."
            .into(),
        status: TaskStatus::Pending,
        owner: None,
        dependencies: dep_ids,
        result: None,
    });

    tasks
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().with_writer(std::io::stderr).init();
    dotenvy::dotenv().ok();

    // Read characteristic JSON from file arg or stdin.
    let input_json = if let Some(path) = std::env::args().nth(1) {
        std::fs::read_to_string(&path).with_context(|| format!("reading {path}"))?
    } else {
        let mut buf = String::new();
        std::io::Read::read_to_string(&mut std::io::stdin(), &mut buf)?;
        buf
    };

    let input: CharacteristicInput =
        serde_json::from_str(&input_json).context("parsing characteristic JSON")?;

    let safe_title = input
        .title
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .collect::<String>()
        .replace(' ', "-")
        .to_lowercase();
    let out_dir = format!("{OUT_DIR}/{safe_title}");
    std::fs::create_dir_all(&out_dir)
        .with_context(|| format!("creating output dir {out_dir}"))?;

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    let tasks = research_tasks(&input);
    let team_size = 8;
    eprintln!(
        "Launching characteristic research: {team_size} workers, {} tasks for '{}'",
        tasks.len(),
        input.title
    );

    let synthesis_preamble = format!(
        "You are synthesizing research about '{}' for a family-facing therapeutic platform. \
        Be: (1) evidence-graded, (2) action-oriented, (3) family-friendly, (4) safety-aware.",
        input.title,
    );

    let synthesis_template = format!(
        r#"# Research Synthesis: {title}

You have received findings from {{count}} parallel research agents investigating
**{title}** for a family-facing therapeutic platform.

Produce a synthesis with:

1. **Bottom Line** — 2-3 sentence summary a caregiver can read in 30 seconds
2. **What Works** — interventions ranked by evidence strength
3. **How to Track Progress** — recommended measurement tools and schedule
4. **Family Action Plan** — 5 concrete steps starting this week
5. **When to Seek Help** — clear referral triggers
6. **Key Papers** — top 5 papers with one-sentence takeaways

## Agent Findings

{{combined}}"#,
        title = input.title,
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek {
            api_key,
            base_url,
        },
        scholar_key,
        code_root: None,
        synthesis_preamble: Some(synthesis_preamble),
        synthesis_prompt_template: Some(synthesis_template),
        tool_config: None,
        scholar_concurrency: Some(3),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(out_dir.clone()),
        synthesis_provider: None,
        ranker: None,
    });

    let result = lead.run(tasks).await?;

    // Write per-agent results.
    for (id, subject, content) in &result.findings {
        let path = format!("{out_dir}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    // Write synthesis.
    let synthesis_path = format!("{out_dir}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!(
        "  wrote {synthesis_path} ({} bytes)",
        result.synthesis.len()
    );

    // Structured JSON output.
    let output = CharacteristicOutput {
        characteristic_id: input.id,
        findings: result
            .findings
            .iter()
            .map(|(id, subject, content)| Finding {
                task_id: *id,
                subject: subject.clone(),
                content: content.clone(),
            })
            .collect(),
        synthesis: result.synthesis.clone(),
    };

    let json_path = format!("{out_dir}/output.json");
    std::fs::write(
        &json_path,
        serde_json::to_string_pretty(&output)?,
    )
    .with_context(|| format!("writing {json_path}"))?;
    eprintln!("  wrote {json_path}");

    // Also write to stdout for piping.
    println!("{}", serde_json::to_string(&output)?);

    eprintln!("\nDone.");
    Ok(())
}
