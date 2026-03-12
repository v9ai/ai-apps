use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/calm-parent";

fn research_tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "mindful-parenting".into(),
            description:
                "Research mindfulness-based parenting programs and their impact on reducing \
                parental reactivity. Focus on: (1) structured programs such as Mindful Parenting \
                (Bogels & Restifo), MBSR-P (Mindfulness-Based Stress Reduction for Parents), and \
                MYmind; key outcome measures including parental stress, over-reactivity, and \
                child emotional and behavioral outcomes, (2) emotion contagion mechanisms — how \
                parental emotional arousal transmits to children and how mindfulness interrupts \
                this process, (3) reactive vs. responsive parenting — neurobiological and \
                psychological evidence for how mindfulness training shifts parents from automatic \
                threat-response to intentional responding, (4) RCTs and meta-analyses measuring \
                program dosage effects (how many sessions? which components are active?), \
                (5) digital and app-based adaptations of mindful parenting programs (2015–2026)."
                    .into(),
            preamble: "You are a clinical psychologist specialising in mindfulness-based \
                parenting interventions. Produce structured evidence-based findings in Markdown, \
                focusing on program components, mechanisms of change, and practical \
                implementation for parents."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "emotion-regulation-parents".into(),
            description:
                "Research parental emotion regulation strategies and their effectiveness for \
                reducing anger and reactive parenting. Focus on: (1) cognitive reappraisal vs. \
                expressive suppression in parenting contexts — which strategy reduces reactive \
                behaviour without emotional detachment?, (2) DBT (Dialectical Behaviour Therapy) \
                skills adapted for parents: distress tolerance, emotion regulation modules, \
                interpersonal effectiveness in parent–child conflict, (3) anger dysregulation \
                interventions specifically targeting parents — evidence from RCTs and clinical \
                trials (2015–2026), (4) parental affect regulation and child outcomes — \
                longitudinal studies linking parent regulatory capacity to child attachment \
                security, externalising behaviours, and emotional development, (5) brief \
                intervention formats (single-session, online, app-based) for teaching emotion \
                regulation skills to parents who are not in therapy (2015–2026)."
                    .into(),
            preamble: "You are a clinical researcher specialising in emotion regulation and \
                parenting science. Produce rigorous Markdown findings with emphasis on \
                intervention mechanisms, effect sizes, and practical skill-building strategies."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "behavioral-parent-training".into(),
            description:
                "Research evidence-based behavioural parent training programs that reduce \
                parent–child conflict and promote calm, consistent discipline. Focus on: \
                (1) Triple P (Positive Parenting Program) — levels, active ingredients, and \
                meta-analytic evidence for reducing parental stress and negative parenting, \
                (2) Incredible Years — group-based strategies for managing child behaviour \
                without escalation; caregiver skill components most predictive of calmer responses, \
                (3) Parent–Child Interaction Therapy (PCIT) — CDI and PDI phases; evidence for \
                reducing parental harsh discipline and increasing positive affect, \
                (4) Parent Management Training (Oregon/Kazdin) — operant conditioning principles \
                for consistent, non-reactive parenting responses, \
                (5) comparative effectiveness studies: which program works best for which family \
                profile? (e.g. high parental stress, low socioeconomic status, cultural \
                adaptations); online and digital delivery evidence (2015–2026)."
                    .into(),
            preamble: "You are a behavioural psychologist specialising in evidence-based \
                parenting programs. Produce structured Markdown findings on program efficacy, \
                active components, and implementation fidelity factors."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "act-compassion-parenting".into(),
            description:
                "Research Acceptance and Commitment Therapy (ACT) and self-compassion \
                interventions applied to parenting for reducing self-criticism and psychological \
                rigidity in parenting responses. Focus on: (1) ACT for parents — psychological \
                flexibility model applied to parenting: defusion from self-critical parenting \
                thoughts ('I'm a bad parent'), acceptance of difficult emotions during \
                challenging child behaviour, values-based parenting action, (2) self-compassion \
                (Neff's MSC framework) in parenting — evidence that parental self-compassion \
                predicts reduced authoritarian parenting, less harsh discipline, and greater \
                emotional availability, (3) Compassion-Focused Therapy (CFT) applications to \
                parenting — activating the soothing/affiliative system to counter threat-based \
                reactions in parent–child interactions, (4) RCTs and pilot studies of ACT-based \
                and compassion-based parenting programs (2015–2026), (5) mechanisms: how \
                acceptance and defusion reduce parental experiential avoidance and reactive \
                responding in the heat of the moment (2015–2026)."
                    .into(),
            preamble: "You are a third-wave CBT researcher specialising in ACT and \
                compassion-focused approaches to parenting. Produce evidence-based Markdown \
                findings focusing on psychological mechanisms and clinical applications."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "physiological-regulation-parents".into(),
            description:
                "Research physiological self-regulation techniques for reducing parental stress \
                reactivity and improving vagal tone as a foundation for calm parenting. Focus on: \
                (1) HRV biofeedback for parents — evidence that increasing heart rate variability \
                through resonance frequency breathing reduces parenting stress and reactive anger; \
                portable device studies and app-based protocols (2015–2026), \
                (2) diaphragmatic (slow) breathing protocols — evidence for rapid down-regulation \
                of the stress response in acute parenting situations; optimal breath rate (4.5–6 \
                breaths/min); duration needed for effect, (3) progressive muscle relaxation (PMR) \
                and body scan techniques adapted for parenting contexts — brief (5–10 min) \
                formats for daily practice, (4) vagal tone and parenting reactivity — evidence \
                linking resting HRV to emotional regulation capacity in parents; interventions \
                that increase vagal tone and improve parenting outcomes, (5) somatic regulation \
                for caregivers: cold exposure (face immersion, cold shower), grounding techniques, \
                and physical exercise as regulatory tools before high-stress parenting moments \
                (2015–2026)."
                    .into(),
            preamble: "You are a psychophysiologist and clinical researcher specialising in \
                autonomic nervous system regulation and its application to parenting behaviour. \
                Produce rigorous Markdown findings on physiological mechanisms and practical \
                self-regulation protocols for parents."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "calm-parent-synthesis".into(),
            description:
                "Based on the findings from the previous 5 research tasks (mindful parenting, \
                emotion regulation, behavioural parent training, ACT and self-compassion, and \
                physiological regulation), synthesise the evidence base for becoming a calmer \
                parent. Identify the TOP 10 evidence-based techniques with the strongest \
                empirical support across at minimum two independent sources. For each technique \
                provide the mechanism of action, the quality of evidence (meta-analysis > RCT > \
                review > case series), and practical implementation guidance for a parent without \
                a clinical background. \
                \
                IMPORTANT: End your response with a JSON code block (```json ... ```) containing \
                a JSON array of the most important academic papers found across all 5 research \
                tasks. Include 8–15 papers. Each paper must follow this exact schema: \
                { \
                  \"title\": \"...\", \
                  \"authors\": [\"LastName1, F.\", \"LastName2, F.\"], \
                  \"year\": 2023, \
                  \"journal\": \"...\", \
                  \"doi\": \"...\", \
                  \"url\": \"...\", \
                  \"abstract\": \"2-3 sentence summary of the paper\", \
                  \"key_findings\": [\"finding 1\", \"finding 2\", \"finding 3\"], \
                  \"therapeutic_techniques\": [\"technique1\", \"technique2\"], \
                  \"evidence_level\": \"meta-analysis|RCT|review|cohort|case-series\", \
                  \"relevance_score\": 0.92, \
                  \"extraction_confidence\": 0.88 \
                } \
                Use null for unknown fields (e.g. doi, url). relevance_score and \
                extraction_confidence must be floats between 0 and 1."
                    .into(),
            preamble: "You are a clinical research synthesiser with expertise in parenting \
                interventions. Produce a comprehensive synthesis in Markdown identifying the \
                top evidence-based techniques for calmer parenting, then end with the required \
                JSON code block of key papers."
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
        "Launching calm-parent research team: {team_size} workers, {} tasks\n",
        tasks.len()
    );

    let lead = TeamLead::new(TeamConfig {
        team_size,
        api_key,
        base_url,
        scholar_key,
        code_root: None,
        synthesis_preamble: None,
        synthesis_prompt_template: None,
        tool_config: None,
        scholar_concurrency: Some(3),
        mailto: std::env::var("RESEARCH_MAILTO").ok(),
        output_dir: Some(OUT_DIR.into()),
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
        String::from("# Calm Parent Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/calm-parent-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
