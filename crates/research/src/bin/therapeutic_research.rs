use anyhow::{Context, Result};
use research::team::{LlmProvider, ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/therapeutic";

fn research_tasks() -> Vec<ResearchTask> {
    let stack_context = "The target app is Research-Thera (researchthera.com), an AI-powered therapeutic \
        intervention platform built with: Next.js (App Router), Cloudflare D1 (SQLite via Drizzle), \
        Cloudflare R2 (audio storage), Mastra AI (agent framework with DeepSeek LLM), \
        Clerk (auth), Apollo GraphQL, and OpenAI TTS. Current features: multi-source academic \
        research (7 APIs: Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite), \
        goal management per family member, therapeutic question generation, interactive branching \
        stories, journal with mood tracking, behavior observations, claim cards with evidence \
        verification, and TTS audio delivery. The platform serves families, clinicians, and \
        educators developing evidence-based interventions for children/adolescents.";

    vec![
        ResearchTask {
            id: 1,
            subject: "jitai-adaptive-interventions".into(),
            description: format!(
                "Research Just-In-Time Adaptive Interventions (JITAIs) for family therapy contexts. \
                Focus on: (1) micro-randomized trials and decision rules for intervention timing — \
                when and how to deliver therapeutic content based on real-time behavioral signals, \
                (2) how behavioral data (journal mood entries, behavior observations, goal progress) \
                can trigger personalized nudges or suggest specific interventions, \
                (3) JITAI frameworks specifically applied to child/family therapy (2019–2026), \
                (4) tailoring variables (mood state, time since last engagement, observation patterns) \
                and decision points for a digital therapeutic platform, \
                (5) practical implementations that work without wearable sensors — using app engagement \
                data and caregiver-reported observations as proximal outcomes. \
                {stack_context}"
            ),
            preamble: "You are a behavioral intervention scientist specialising in adaptive \
                digital interventions for children and families. Produce structured findings in \
                Markdown focusing on practical, implementable JITAI designs for a consumer app."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "n-of-1-trial-design".into(),
            description: format!(
                "Research N-of-1 trial designs for personalized therapy evaluation. Focus on: \
                (1) single-subject experimental designs (AB, ABA, multiple baseline) to evaluate \
                whether a specific intervention works for THIS particular child/family, \
                (2) Bayesian N-of-1 analysis methods that can detect treatment effects with small \
                sample sizes from a single participant's repeated measures, \
                (3) crossover designs adapted for behavioral interventions — how to alternate between \
                intervention and control periods using app-collected data, \
                (4) practical implementation in a consumer app without clinical overhead — \
                automated phase scheduling, data collection through existing journal/observation features, \
                and statistical analysis that a non-statistician caregiver can understand, \
                (5) visual analysis tools and Bayesian posterior summaries for communicating \
                'is this working for my child?' to families (2019–2026). \
                {stack_context}"
            ),
            preamble: "You are a clinical trials methodologist specialising in single-case \
                experimental designs and Bayesian statistics. Produce evidence-based findings \
                in Markdown with emphasis on consumer-friendly implementations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "implementation-science-feasibility".into(),
            description: format!(
                "Research implementation science frameworks for scoring and filtering therapeutic \
                interventions by feasibility. Focus on: (1) the CFIR (Consolidated Framework for \
                Implementation Research) and RE-AIM frameworks — how to extract implementability \
                dimensions from academic papers automatically, \
                (2) acceptability and burden measures — quantifying caregiver time, skill requirements, \
                material costs, and training needs for each intervention, \
                (3) automated feasibility scoring: can an LLM read a research paper and extract \
                structured feasibility data (cost, complexity, required expertise, setting requirements)?, \
                (4) matching interventions to family context — filtering by available resources, \
                caregiver capacity, child's age/needs, and home vs clinical setting, \
                (5) papers on implementation science applied to parent-mediated interventions \
                and digital therapeutic platforms (2019–2026). \
                {stack_context}"
            ),
            preamble: "You are an implementation science researcher specialising in translating \
                evidence-based interventions into real-world family settings. Produce structured \
                findings in Markdown with practical scoring rubrics."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "automated-evidence-synthesis".into(),
            description: format!(
                "Research automated evidence synthesis and living systematic review methods. Focus on: \
                (1) moving from individual research papers to aggregated evidence strength — how to \
                automatically compute confidence in an intervention across multiple studies, \
                (2) GRADE framework automation — can an LLM assess study quality, risk of bias, \
                consistency, and directness from extracted paper data?, \
                (3) Bayesian meta-analysis from extracted effect sizes — lightweight approaches \
                that update incrementally as new papers arrive through the 7 API sources, \
                (4) living systematic reviews that auto-update when new evidence is published — \
                change detection, significance thresholds for alerting users, \
                (5) presenting evidence strength to non-researchers: visual confidence indicators, \
                plain-language evidence summaries, and 'evidence changed' notifications (2020–2026). \
                {stack_context}"
            ),
            preamble: "You are an evidence synthesis methodologist specialising in systematic \
                reviews and meta-analysis automation. Produce rigorous findings in Markdown \
                with implementable algorithms."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "digital-phenotyping-behavioral-signals".into(),
            description: format!(
                "Research digital phenotyping from behavioral observations in family therapy. Focus on: \
                (1) using journal mood entries, behavior observation logs, and goal progress data as \
                digital phenotyping signals — what patterns are clinically meaningful?, \
                (2) Ecological Momentary Assessment (EMA) methods adapted for family therapy — \
                optimal sampling strategies for caregiver-reported data, \
                (3) early warning systems for intervention failure or adverse effects — detecting \
                when a child is not responding to treatment or worsening, using only app-collected data, \
                (4) temporal pattern mining in behavioral observations — cyclical patterns, \
                trend detection, and context-dependent behavior (time of day, day of week, \
                environmental triggers noted in journals), \
                (5) computational approaches to identifying behavioral phenotypes from sparse, \
                caregiver-reported data without wearables or sensors (2019–2026). \
                {stack_context}"
            ),
            preamble: "You are a digital mental health researcher specialising in computational \
                phenotyping from behavioral data. Produce innovative findings in Markdown \
                with practical signal processing approaches."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "novel-feature-synthesis".into(),
            description: format!(
                "Based on the findings from the previous 5 research tasks (JITAIs, N-of-1 trials, \
                implementation science, automated evidence synthesis, and digital phenotyping), \
                identify the SINGLE most innovative feature that can be added to the Research-Thera \
                platform. Criteria: (1) genuinely novel — not a standard feature in therapy apps or \
                health platforms, (2) high family value — gives families actionable insights about \
                whether interventions are actually working for their specific child, \
                (3) technically feasible within the existing stack: Next.js + Cloudflare D1 (SQLite) + \
                Mastra AI (DeepSeek LLM) + existing 7 academic API sources, \
                (4) leverages the unique combination of academic research + personal behavioral data \
                that Research-Thera already collects. \
                Produce a detailed feature proposal with: name, one-paragraph description, \
                why it's novel, technical architecture (D1 schema changes, Mastra agent design, \
                API integrations), implementation phases, and expected user impact. \
                {stack_context}"
            ),
            preamble: "You are a health-tech product innovator with deep knowledge of both \
                clinical research methods and modern web development. Produce a single, \
                compelling feature proposal in Markdown that bridges research science \
                and consumer product design."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4, 5],
            result: None,
        },
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    dotenvy::dotenv().ok();

    let api_key =
        std::env::var("DEEPSEEK_API_KEY").context("DEEPSEEK_API_KEY must be set")?;
    let base_url = std::env::var("DEEPSEEK_BASE_URL")
        .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string());
    let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();

    std::fs::create_dir_all(OUT_DIR)
        .with_context(|| format!("creating output dir {OUT_DIR}"))?;

    let tasks = research_tasks();
    let team_size = 10;
    eprintln!(
        "Launching therapeutic research team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        provider: LlmProvider::DeepSeek { api_key, base_url },
        scholar_key,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
        tool_config: None,
        scholar_concurrency: Some(3),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
        synthesis_provider: None,
    });

    let result = lead.run(tasks).await?;

    for (id, subject, content) in &result.findings {
        let path = format!("{OUT_DIR}/agent-{id:02}-{subject}.md");
        std::fs::write(&path, content)
            .with_context(|| format!("writing {path}"))?;
        eprintln!("  wrote {path} ({} bytes)", content.len());
    }

    let synthesis_path = format!("{OUT_DIR}/synthesis.md");
    std::fs::write(&synthesis_path, &result.synthesis)
        .with_context(|| format!("writing {synthesis_path}"))?;
    eprintln!("  wrote {synthesis_path} ({} bytes)", result.synthesis.len());

    let mut combined =
        String::from("# Therapeutic Intervention Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/therapeutic-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
