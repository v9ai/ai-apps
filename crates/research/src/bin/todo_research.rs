use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "../../apps/todo/research";

fn research_tasks() -> Vec<ResearchTask> {
    vec![
        ResearchTask {
            id: 1,
            subject: "task-management-ux".into(),
            description:
                "Research UX/UI patterns for modern todo and task management applications. \
                Focus on: (1) GTD (Getting Things Done) digital implementations — how top apps \
                translate Allen's workflow (capture, clarify, organize, reflect, engage) into UI \
                patterns; evidence for GTD effectiveness in digital vs. analog formats, \
                (2) progressive disclosure in task interfaces — hiding complexity until needed; \
                studies on how layered UIs reduce abandonment and increase task completion rates, \
                (3) one-tap capture and quick-add patterns — friction reduction for task entry; \
                natural language parsing for dates, priorities, and tags; voice-to-task pipelines, \
                (4) swipe gestures and micro-interactions — evidence for gesture-based task \
                management (complete, snooze, delete) reducing cognitive overhead vs. tap-based UIs, \
                (5) keyboard shortcuts and power-user workflows — evidence from Todoist, Things 3, \
                TickTick, and Google Tasks on how shortcut density correlates with retention among \
                power users (2024–2026)."
                    .into(),
            preamble: "You are a UX researcher specialising in productivity application design. \
                Produce structured evidence-based findings in Markdown, focusing on interaction \
                patterns, usability studies, and design principles for task management interfaces."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "cognitive-load-task-interfaces".into(),
            description:
                "Research cognitive load theory applied to task management user interfaces. \
                Focus on: (1) Miller's law in list design — evidence for optimal list lengths, \
                chunking strategies, and how exceeding 7±2 visible items affects task selection \
                and completion rates, (2) Hick's law in priority selection — how the number of \
                priority levels (binary vs. 4-level vs. continuous) affects decision speed and \
                user satisfaction; evidence for simplified priority models, (3) Zeigarnik effect \
                in task apps — how incomplete tasks create intrusive thoughts; evidence for how \
                capturing tasks in a trusted system reduces cognitive load and anxiety, \
                (4) attentional residue — research on how switching between task contexts in apps \
                fragments attention; implications for single-focus vs. multi-list views, \
                (5) decision fatigue in task management — evidence for how daily planning depletes \
                cognitive resources; auto-scheduling and smart defaults as mitigation strategies \
                (2024–2026)."
                    .into(),
            preamble: "You are a cognitive psychologist specialising in human-computer interaction \
                and information processing. Produce rigorous Markdown findings on cognitive load \
                mechanisms and their implications for task management interface design."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "gamification-productivity".into(),
            description:
                "Research gamification mechanics in productivity and task management applications. \
                Focus on: (1) streak mechanics — evidence for how daily streaks drive habit \
                formation and task completion; optimal streak length before diminishing returns; \
                streak recovery mechanisms to prevent abandonment after breaks, (2) completion \
                dopamine and reward pathways — neuroscience of task completion satisfaction; how \
                visual completion feedback (checkmarks, animations, sounds) reinforces behaviour, \
                (3) progress bars and visual progress — Endowed Progress Effect (Nunes & Dreze) \
                in task management; evidence for how pre-loaded progress bars increase completion \
                rates; optimal progress visualization patterns, (4) Fogg Behavior Model applied \
                to productivity — how motivation, ability, and prompts interact for habit formation \
                around task management; tiny habits methodology for building consistent review \
                habits, (5) gamification pitfalls — evidence for over-justification effect, \
                extrinsic motivation crowding out intrinsic motivation, and when game mechanics \
                backfire in productivity contexts (2024–2026)."
                    .into(),
            preamble: "You are a behavioural scientist specialising in gamification and habit \
                formation. Produce structured Markdown findings on gamification mechanics, their \
                psychological underpinnings, and evidence-based design recommendations for \
                productivity applications."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "priority-scheduling-algorithms".into(),
            description:
                "Research priority frameworks and intelligent scheduling algorithms for task \
                management. Focus on: (1) Eisenhower matrix — digital implementations, evidence \
                for effectiveness vs. simpler priority systems, and UX patterns for \
                urgent/important classification, (2) autoscaling priority — algorithms that \
                dynamically adjust task priority based on deadlines, dependencies, and context; \
                evidence from operations research applied to personal productivity, \
                (3) energy-aware scheduling — matching tasks to circadian rhythm and energy levels; \
                evidence for chronotype-based scheduling improving completion rates and quality, \
                (4) ML-based task duration estimation — research on using historical completion \
                data to predict task duration; calibration accuracy and user trust in AI estimates, \
                (5) spaced repetition for recurring tasks — applying SM-2 or FSRS algorithms to \
                optimize review intervals for recurring tasks; evidence from learning science \
                applied to task management (2024–2026)."
                    .into(),
            preamble: "You are an operations researcher and productivity scientist specialising \
                in scheduling algorithms and priority frameworks. Produce rigorous Markdown \
                findings on algorithmic approaches to task prioritization and scheduling."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 5,
            subject: "subtask-hierarchies".into(),
            description:
                "Research nested task management and hierarchical task structures. Focus on: \
                (1) optimal nesting depth — evidence for how many levels of subtasks users can \
                effectively manage before losing context; studies comparing 2-level, 3-level, \
                and unlimited nesting, (2) Work Breakdown Structure (WBS) patterns from project \
                management applied to personal task management — evidence for top-down vs. \
                bottom-up decomposition effectiveness, (3) recursive completion semantics — \
                how should parent task status relate to child task completion? Auto-complete vs. \
                manual rollup; evidence for which model reduces errors and cognitive load, \
                (4) flat vs. hierarchical task lists — comparative effectiveness studies; evidence \
                for when hierarchy helps (complex projects) vs. hurts (daily tasks); hybrid \
                approaches using tags and filters as virtual hierarchy, (5) dependency management \
                in personal task apps — evidence for lightweight dependency tracking (blockers, \
                predecessors) improving completion rates without adding excessive complexity \
                (2024–2026)."
                    .into(),
            preamble: "You are a project management researcher specialising in task decomposition \
                and work structure design. Produce structured Markdown findings on hierarchical \
                task management patterns and their effectiveness."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "time-blocking-calendar".into(),
            description:
                "Research time-blocking methodologies and calendar-task integration. Focus on: \
                (1) deep work scheduling — Cal Newport's deep work evidence applied to task \
                management; optimal block durations for different task types; evidence for \
                scheduled deep work vs. reactive task completion, (2) timeboxing effectiveness — \
                research on fixed-duration work blocks improving focus and reducing Parkinson's \
                law effects; evidence from Pomodoro Technique and its variations (25/5, 52/17, \
                90-minute ultradian cycles), (3) calendar-task unification — evidence for \
                integrating task lists with calendar views; time-blocking apps (Sunsama, Motion, \
                Reclaim.ai) and their effectiveness claims; studies on planned vs. actual time \
                allocation, (4) Parkinson's law mitigation — evidence that tasks expand to fill \
                available time; how artificial deadlines and timeboxing constrain task duration, \
                (5) buffer time and scheduling slack — evidence for building slack into schedules \
                to reduce stress and accommodate interruptions; optimal buffer ratios for \
                knowledge workers (2024–2026)."
                    .into(),
            preamble: "You are a productivity researcher specialising in time management and \
                scheduling science. Produce rigorous Markdown findings on time-blocking \
                methodologies, their evidence base, and practical implementation patterns."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 7,
            subject: "todo-synthesis".into(),
            description:
                "Based on the findings from the previous 6 research tasks (task management UX, \
                cognitive load in task interfaces, gamification in productivity, priority and \
                scheduling algorithms, subtask hierarchies, and time-blocking/calendar \
                integration), synthesise the evidence base for building an optimal todo \
                application. Identify the TOP 10 evidence-based design principles with the \
                strongest empirical support across at minimum two independent sources. For each \
                principle provide the mechanism of action, the quality of evidence \
                (meta-analysis > RCT > review > case series), and practical implementation \
                guidance for a developer building a modern task management application. \
                \
                IMPORTANT: End your response with a JSON code block (```json ... ```) containing \
                a JSON array of the most important academic papers found across all 6 research \
                tasks. Include 8–15 papers. Each paper must follow this exact schema: \
                { \
                  \"title\": \"...\", \
                  \"authors\": [\"LastName1, F.\", \"LastName2, F.\"], \
                  \"year\": 2024, \
                  \"journal\": \"...\", \
                  \"doi\": \"...\", \
                  \"url\": \"...\", \
                  \"abstract\": \"2-3 sentence summary of the paper\", \
                  \"key_findings\": [\"finding 1\", \"finding 2\", \"finding 3\"], \
                  \"design_implications\": [\"implication 1\", \"implication 2\"], \
                  \"evidence_level\": \"meta-analysis|RCT|review|cohort|case-series\", \
                  \"relevance_score\": 0.92, \
                  \"extraction_confidence\": 0.88 \
                } \
                Use null for unknown fields (e.g. doi, url). relevance_score and \
                extraction_confidence must be floats between 0 and 1."
                    .into(),
            preamble: "You are a research synthesiser with expertise in productivity science, \
                HCI, and application design. Produce a comprehensive synthesis in Markdown \
                identifying the top evidence-based design principles for building an optimal \
                todo application, then end with the required JSON code block of key papers."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 4, 5, 6],
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
        "Launching todo research team: {team_size} workers, {} tasks\n",
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
        String::from("# Todo App Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!(
            "## Agent {id}: {subject}\n\n{content}\n\n---\n\n"
        ));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/todo-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
