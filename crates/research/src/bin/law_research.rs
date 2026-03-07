use anyhow::{Context, Result};
use research::team::{ResearchTask, TaskStatus, TeamConfig, TeamLead};

const DEFAULT_BASE_URL: &str = "https://api.deepseek.com";
const OUT_DIR: &str = "research-output/law-adversarial";

fn research_tasks() -> Vec<ResearchTask> {
    let app_context = "The target app is an Adversarial Brief Stress-Tester — a multi-agent legal AI system \
        where AI agents take opposing sides (attacker/defender/judge) to stress-test a legal brief before filing. \
        It extends the existing BS Detector app (apps/law/) which currently does document verification \
        (citation checking, claim validation). The stress-tester adds symmetric adversarial argument analysis: \
        an Attacker agent finds weaknesses and generates counter-arguments, a Defender agent strengthens \
        the brief against attacks, and a Judge agent scores argument strength with explainable reasoning. \
        Key constraints: must produce explainable outputs (EU AI Act compliance Aug 2026), \
        must ground all arguments in verifiable citations, must detect and flag hallucinated case law, \
        and must output structured argument graphs (not just prose). \
        No existing legal AI product (Harvey, CoCounsel, Lexis+ Protégé) does symmetric adversarial \
        stress-testing — this is a greenfield opportunity.";

    vec![
        // ── Tier 1: Foundational (4 tasks, no dependencies) ──
        ResearchTask {
            id: 1,
            subject: "argumentation-frameworks-formal".into(),
            description: format!(
                "Research formal argumentation frameworks for legal reasoning. Focus on: \
                (1) Dung's abstract argumentation frameworks — complete, preferred, grounded, and stable semantics, \
                (2) ASPIC+ framework for structured argumentation with strict/defeasible rules, \
                (3) defeasible reasoning and non-monotonic logic in legal contexts, \
                (4) bipolar argumentation frameworks (support + attack relations), \
                (5) computational complexity of argument acceptability — practical algorithms for \
                real-time evaluation. Find papers on formal argumentation applied to law, \
                argument acceptability computation, and dialogue games for legal dispute (2018-2026). \
                {app_context}"
            ),
            preamble: "You are a computational argumentation researcher specialising in formal \
                frameworks for legal reasoning. Produce structured findings in Markdown focusing \
                on frameworks that can be implemented as computable argument graphs."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 2,
            subject: "legal-nlp-argument-mining".into(),
            description: format!(
                "Research legal NLP and argument mining pipelines. Focus on: \
                (1) argument mining from legal text — claim detection, premise identification, \
                argument scheme classification, \
                (2) Legal-BERT, LegalBERT, and domain-adapted transformers for legal text, \
                (3) IRAC (Issue-Rule-Application-Conclusion) structure detection in briefs, \
                (4) rhetorical role labelling in court judgments (facts, arguments, rulings, citations), \
                (5) argument component segmentation at paragraph and sentence level. \
                Find papers on legal argument mining, legal NER, rhetorical role prediction, \
                and legal text structure analysis (2019-2026). \
                {app_context}"
            ),
            preamble: "You are a legal NLP researcher specialising in argument mining and \
                legal text analysis. Produce structured findings in Markdown focusing on \
                state-of-the-art extraction pipelines and their accuracy."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 3,
            subject: "multi-agent-debate-frameworks".into(),
            description: format!(
                "Research multi-agent debate and adversarial LLM frameworks. Focus on: \
                (1) debate as an alignment strategy — Irving et al.'s AI safety via debate, \
                (2) multi-LLM debate protocols — Du et al.'s 'Improving Factuality and Reasoning \
                in Language Models through Multiagent Debate', \
                (3) attacker/defender/judge agent architectures in AI systems, \
                (4) self-play and adversarial training for argument improvement, \
                (5) AgentCourt and similar courtroom simulation frameworks, \
                (6) convergence properties — when do multi-agent debates reach stable conclusions? \
                Find papers on LLM debate, multi-agent argumentation, adversarial prompting \
                for reasoning improvement, and AI judge systems (2020-2026). \
                {app_context}"
            ),
            preamble: "You are an AI alignment and multi-agent systems researcher. \
                Produce structured findings in Markdown focusing on practical debate \
                architectures that can be implemented with current LLMs."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },
        ResearchTask {
            id: 4,
            subject: "legal-reasoning-benchmarks".into(),
            description: format!(
                "Research legal reasoning benchmarks and argument quality evaluation. Focus on: \
                (1) LegalBench — task taxonomy and performance of frontier models, \
                (2) ContractEval and other contract analysis benchmarks, \
                (3) argument quality scoring rubrics — cogency, relevance, sufficiency, acceptability, \
                (4) human evaluation protocols for legal AI output quality, \
                (5) inter-annotator agreement on legal argument strength, \
                (6) automated metrics for argument quality (beyond BLEU/ROUGE). \
                Find papers on legal AI evaluation, argument quality assessment, \
                legal reasoning datasets, and benchmark construction (2020-2026). \
                {app_context}"
            ),
            preamble: "You are a legal AI evaluation researcher. Produce structured findings \
                in Markdown focusing on how to measure and score legal argument quality \
                both automatically and with human evaluation."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![],
            result: None,
        },

        // ── Tier 2: Specialized Deep-Dives (12 tasks) ──
        ResearchTask {
            id: 5,
            subject: "counter-argument-generation".into(),
            description: format!(
                "Research automated counter-argument generation for legal briefs. Focus on: \
                (1) methods for generating counter-arguments to legal claims — template-based, \
                retrieval-based, and generative approaches, \
                (2) argument attack types — undermining, undercutting, and rebutting, \
                (3) identifying weakest points in an argument chain for targeted attacks, \
                (4) ensuring generated counter-arguments are legally valid (not fabricated), \
                (5) controlling argument strength — generating weak vs. strong counterpoints. \
                Find papers on counter-argument generation, argumentative text generation, \
                and adversarial argument construction (2020-2026). \
                {app_context}"
            ),
            preamble: "You are a computational argumentation researcher focused on automated \
                counter-argument generation. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2],
            result: None,
        },
        ResearchTask {
            id: 6,
            subject: "argument-strength-prediction".into(),
            description: format!(
                "Research argument strength prediction and scoring. Focus on: \
                (1) computational models for predicting argument persuasiveness, \
                (2) features that correlate with argument strength — evidence quality, \
                logical structure, rhetorical devices, citation authority, \
                (3) pairwise argument comparison — which of two arguments is stronger, \
                (4) neural approaches to argument quality scoring (fine-tuned transformers), \
                (5) calibrating strength scores to human expert judgments. \
                Find papers on argument quality prediction, persuasion detection, \
                and computational persuasion modelling (2019-2026). \
                {app_context}"
            ),
            preamble: "You are a researcher in computational argumentation and persuasion. \
                Produce structured findings in Markdown focusing on implementable scoring models."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 7,
            subject: "explainable-legal-reasoning".into(),
            description: format!(
                "Research explainable AI for legal reasoning and EU AI Act compliance. Focus on: \
                (1) explainability methods for legal AI — attention visualization, \
                chain-of-thought, argument maps as explanations, \
                (2) EU AI Act requirements for high-risk AI systems (legal domain is high-risk), \
                (3) generating human-readable justifications for AI legal conclusions, \
                (4) traceability — linking AI outputs back to specific evidence and rules, \
                (5) contrastive explanations — 'why this conclusion and not that one'. \
                Find papers on XAI in legal tech, explainable legal reasoning, \
                EU AI Act technical standards, and legal AI transparency (2021-2026). \
                {app_context}"
            ),
            preamble: "You are a legal AI researcher specialising in explainability and \
                regulatory compliance. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1],
            result: None,
        },
        ResearchTask {
            id: 8,
            subject: "citation-verification-hallucination".into(),
            description: format!(
                "Research citation verification and hallucination detection in legal AI. Focus on: \
                (1) legal citation hallucination — rates, patterns, and detection methods, \
                (2) automated case law verification — checking if cited cases exist and say what's claimed, \
                (3) Shepardizing automation — verifying case validity and subsequent history, \
                (4) fact-checking pipelines for legal documents, \
                (5) grounding techniques to reduce hallucination in legal generation. \
                The 17-33% hallucination rate in current legal AI tools makes this critical. \
                Find papers on legal hallucination, citation verification, \
                fact-grounded generation, and legal knowledge bases (2022-2026). \
                {app_context}"
            ),
            preamble: "You are a legal AI reliability researcher focused on hallucination \
                detection and citation verification. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4],
            result: None,
        },
        ResearchTask {
            id: 9,
            subject: "temporal-legal-knowledge-graphs".into(),
            description: format!(
                "Research temporal legal knowledge graphs and evolving legal knowledge. Focus on: \
                (1) knowledge graph construction from legal corpora — entities, relations, temporal validity, \
                (2) temporal reasoning over legal precedent — overruled cases, evolving doctrine, \
                (3) statute amendment tracking and version-aware legal reasoning, \
                (4) jurisdiction-aware knowledge representation, \
                (5) linking argument components to knowledge graph entities for grounding. \
                Find papers on legal knowledge graphs, temporal knowledge representation, \
                legal ontologies (LKIF, LegalRuleML), and precedent networks (2019-2026). \
                {app_context}"
            ),
            preamble: "You are a legal knowledge engineering researcher. Produce structured \
                findings in Markdown focusing on knowledge graph architectures for legal reasoning."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 10,
            subject: "judge-pattern-analysis".into(),
            description: format!(
                "Research judicial decision pattern analysis and prediction. Focus on: \
                (1) predicting judicial decisions from case features and argument patterns, \
                (2) judge-specific ruling tendencies and how to model them, \
                (3) which argument types are most persuasive to different judge profiles, \
                (4) court-level analysis — circuit splits, jurisdiction-specific reasoning patterns, \
                (5) ethical considerations of judicial prediction and potential biases. \
                Find papers on judicial analytics, legal prediction, judge profiling, \
                and court outcome forecasting (2018-2026). \
                {app_context}"
            ),
            preamble: "You are a legal analytics researcher focused on judicial decision \
                patterns. Produce structured findings in Markdown with attention to both \
                capability and ethical considerations."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4],
            result: None,
        },
        ResearchTask {
            id: 11,
            subject: "narrative-coherence-analysis".into(),
            description: format!(
                "Research narrative coherence analysis in legal briefs. Focus on: \
                (1) computational models of narrative coherence and story-based reasoning in law, \
                (2) detecting logical gaps, contradictions, and non-sequiturs in legal arguments, \
                (3) measuring argument flow — does each paragraph build on the previous one, \
                (4) discourse coherence models adapted to legal text, \
                (5) the role of narrative persuasion in legal outcomes. \
                Find papers on legal narrative analysis, coherence modelling, \
                discourse analysis in legal text, and story-based legal reasoning (2018-2026). \
                {app_context}"
            ),
            preamble: "You are a legal discourse analysis researcher. Produce structured \
                findings in Markdown focusing on computational approaches to measuring \
                narrative quality in legal briefs."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 12,
            subject: "legal-analogy-detection".into(),
            description: format!(
                "Research legal analogy detection and case similarity. Focus on: \
                (1) computational approaches to identifying legal analogies — fact-pattern matching, \
                issue-based similarity, outcome-based comparison, \
                (2) distinguishing cases — finding relevant differences that change the outcome, \
                (3) embedding-based case similarity using legal-domain models, \
                (4) analogical reasoning engines for the attacker agent (finding cases that \
                undermine the brief's cited precedents), \
                (5) cross-jurisdiction analogy detection. \
                Find papers on case-based reasoning in law, legal analogy, \
                case similarity metrics, and legal information retrieval (2019-2026). \
                {app_context}"
            ),
            preamble: "You are a legal AI researcher specialising in case-based reasoning \
                and analogy. Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2],
            result: None,
        },
        ResearchTask {
            id: 13,
            subject: "adversarial-robustness-legal-nlp".into(),
            description: format!(
                "Research adversarial robustness in legal NLP systems. Focus on: \
                (1) adversarial attacks on legal NLP models — textual adversarial examples, \
                semantic perturbations that flip predictions, \
                (2) robustness of legal AI to paraphrasing, negation, and misdirection, \
                (3) defending legal AI against prompt injection and adversarial inputs, \
                (4) red-teaming methodologies for legal AI systems, \
                (5) ensuring the stress-tester itself is robust to gaming. \
                Find papers on adversarial NLP, robustness testing for legal AI, \
                and red-teaming language models (2021-2026). \
                {app_context}"
            ),
            preamble: "You are an adversarial ML researcher applied to legal NLP. \
                Produce structured findings in Markdown focusing on practical robustness \
                testing approaches."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3],
            result: None,
        },
        ResearchTask {
            id: 14,
            subject: "knowledge-grounded-legal-generation".into(),
            description: format!(
                "Research knowledge-grounded text generation for legal applications. Focus on: \
                (1) RAG architectures specifically for legal argument generation, \
                (2) grounding generated arguments in cited case law and statutes, \
                (3) controllable generation — varying argument style, formality, jurisdiction, \
                (4) faithfulness metrics — ensuring generated text doesn't deviate from sources, \
                (5) hybrid retrieval-generation for producing novel legal arguments \
                that are still grounded in real precedent. \
                Find papers on grounded legal generation, faithful text generation, \
                knowledge-augmented argument construction (2021-2026). \
                {app_context}"
            ),
            preamble: "You are a legal NLG researcher focused on grounded generation. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![2, 3],
            result: None,
        },
        ResearchTask {
            id: 15,
            subject: "confidence-calibration-legal".into(),
            description: format!(
                "Research confidence calibration and uncertainty quantification in legal AI. Focus on: \
                (1) calibrating LLM confidence scores for legal predictions — are models overconfident?, \
                (2) uncertainty quantification methods applicable to legal reasoning, \
                (3) selective prediction — knowing when NOT to make a legal judgment, \
                (4) communicating uncertainty to legal professionals effectively, \
                (5) Bayesian approaches to argument strength under uncertainty. \
                Find papers on LLM calibration, uncertainty in legal AI, \
                selective prediction, and confidence estimation (2021-2026). \
                {app_context}"
            ),
            preamble: "You are an uncertainty quantification researcher applied to legal AI. \
                Produce structured findings in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![3, 4],
            result: None,
        },
        ResearchTask {
            id: 16,
            subject: "real-time-argument-adaptation".into(),
            description: format!(
                "Research real-time argument adaptation and dynamic strategy adjustment. Focus on: \
                (1) adaptive argumentation strategies — adjusting arguments based on opponent responses, \
                (2) game-theoretic models of legal argumentation, \
                (3) reinforcement learning for argument strategy optimisation, \
                (4) Bayesian belief updating during multi-turn debates, \
                (5) streaming/real-time argument evaluation for interactive use. \
                Find papers on strategic argumentation, argument games, \
                RL for dialogue, and interactive argument systems (2019-2026). \
                {app_context}"
            ),
            preamble: "You are a strategic argumentation researcher. Produce structured \
                findings in Markdown focusing on dynamic, interactive argument systems."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 3],
            result: None,
        },

        // ── Tier 3: Synthesis (4 tasks) ──
        ResearchTask {
            id: 17,
            subject: "architecture-synthesis".into(),
            description: format!(
                "Synthesise findings from foundational argumentation frameworks, legal NLP, \
                multi-agent debate, counter-argument generation, argument strength prediction, \
                explainable reasoning, and knowledge-grounded generation into a concrete \
                ARCHITECTURE for the Adversarial Brief Stress-Tester. Produce: \
                (1) system architecture diagram (textual) with attacker/defender/judge agent specs, \
                (2) argument graph data model — nodes (claims, evidence, rules) and edges \
                (supports, attacks, undermines), \
                (3) pipeline flow — brief ingestion → argument extraction → adversarial rounds → \
                scoring → report generation, \
                (4) API design for each agent's interface, \
                (5) technology choices grounded in the research findings. \
                {app_context}"
            ),
            preamble: "You are a senior software architect specialising in multi-agent AI systems. \
                Produce a detailed, implementable architecture document in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![1, 2, 3, 5, 6, 7, 14],
            result: None,
        },
        ResearchTask {
            id: 18,
            subject: "reliability-trust-synthesis".into(),
            description: format!(
                "Synthesise findings on benchmarks, explainability, citation verification, \
                judge patterns, adversarial robustness, and confidence calibration into a \
                RELIABILITY AND TRUST framework for the stress-tester. Produce: \
                (1) hallucination prevention pipeline — multi-stage verification for all generated arguments, \
                (2) confidence scoring system — how to communicate argument strength and uncertainty, \
                (3) EU AI Act compliance checklist — specific technical requirements mapped to implementation, \
                (4) evaluation protocol — how to benchmark the system against human legal experts, \
                (5) bias detection and mitigation strategy for the judge agent. \
                {app_context}"
            ),
            preamble: "You are a legal AI safety and reliability researcher. \
                Produce a comprehensive trust framework document in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![4, 7, 8, 10, 13, 15],
            result: None,
        },
        ResearchTask {
            id: 19,
            subject: "knowledge-layer-synthesis".into(),
            description: format!(
                "Synthesise findings on temporal knowledge graphs, narrative coherence, \
                legal analogy, and knowledge-grounded generation into a KNOWLEDGE LAYER \
                design for the stress-tester. Produce: \
                (1) legal knowledge graph schema — entities, relations, temporal properties, \
                (2) case similarity engine design — how to find analogous and distinguishing cases, \
                (3) narrative coherence checker — algorithm for detecting gaps and contradictions, \
                (4) precedent network analysis — how to evaluate the strength of a citation chain, \
                (5) integration points with the argument graph from the architecture synthesis. \
                {app_context}"
            ),
            preamble: "You are a legal knowledge engineering architect. Produce a detailed \
                knowledge layer design document in Markdown."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![9, 11, 12, 14],
            result: None,
        },
        ResearchTask {
            id: 20,
            subject: "portfolio-demo-synthesis".into(),
            description: format!(
                "Synthesise ALL previous research and synthesis tasks into a PORTFOLIO DEMO \
                BLUEPRINT for the Adversarial Brief Stress-Tester. This is the capstone deliverable. \
                Produce: \
                (1) executive summary — what it is, why it's novel, market positioning, \
                (2) complete technical specification combining architecture, reliability, and knowledge layers, \
                (3) MVP scope definition — minimum viable demo that showcases the core innovation, \
                (4) implementation roadmap — phased build plan with milestones, \
                (5) demo scenario — a specific legal brief stress-test walkthrough showing \
                attacker/defender/judge in action with example outputs, \
                (6) hiring pitch — how to present this in interviews for legal AI engineer roles \
                ($120K-$300K+), what makes it stand out vs. Harvey/CoCounsel/Lexis+. \
                {app_context}"
            ),
            preamble: "You are a legal tech product strategist and senior engineer. \
                Produce a compelling, comprehensive portfolio blueprint in Markdown that \
                combines all research into an actionable build plan."
                .into(),
            status: TaskStatus::Pending,
            owner: None,
            dependencies: vec![17, 18, 19],
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
    let team_size = 20;
    eprintln!(
        "Launching law adversarial research team: {team_size} workers, {} tasks\n",
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

    let mut combined = String::from("# Law Adversarial Brief Stress-Tester Research — Complete Report\n\n");
    for (id, subject, content) in &result.findings {
        combined.push_str(&format!("## Agent {id}: {subject}\n\n{content}\n\n---\n\n"));
    }
    combined.push_str("## Synthesis\n\n");
    combined.push_str(&result.synthesis);

    let combined_path = format!("{OUT_DIR}/law-adversarial-research-complete.md");
    std::fs::write(&combined_path, &combined)
        .with_context(|| format!("writing {combined_path}"))?;
    eprintln!("  wrote {combined_path} ({} bytes)", combined.len());

    eprintln!("\nDone.");
    Ok(())
}
