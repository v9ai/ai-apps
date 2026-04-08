use crate::types::{AiSignal, GhRepo, TechStack};

const AI_TOPICS: &[&str] = &[
    "machine-learning",
    "deep-learning",
    "artificial-intelligence",
    "llm",
    "large-language-model",
    "generative-ai",
    "nlp",
    "computer-vision",
    "reinforcement-learning",
    "neural-network",
    "rag",
    "vector-database",
    "embeddings",
    "fine-tuning",
    "ai-agent",
    "multimodal",
];

const AI_NAME_HINTS: &[&str] = &[
    "llm", "gpt", "bert", "rag", "agent", "copilot", "model", "inference",
    "embedding", "finetune", "fine-tune", "train", "diffusion",
];

/// Detect AI/ML signals across repos and tech stack.
pub fn detect(stack: &TechStack, repos: &[GhRepo]) -> Vec<AiSignal> {
    let mut signals: Vec<AiSignal> = Vec::new();

    // 1. Topics on individual repos
    for repo in repos {
        let topics = repo.topics.as_deref().unwrap_or(&[]);
        for topic in topics {
            if AI_TOPICS.iter().any(|t| topic.contains(t)) {
                signals.push(AiSignal::Topic(topic.clone()));
            }
        }
        // 2. Repo name hints
        let name_l = repo.name.to_lowercase();
        if AI_NAME_HINTS.iter().any(|h| name_l.contains(h)) {
            signals.push(AiSignal::RepoName { repo: repo.name.clone() });
        }
    }

    // 3. Detected AI frameworks from tech stack
    for fw in &stack.ai_frameworks {
        // attribute to the first repo that surfaced this framework
        let repo_name = repos
            .iter()
            .find(|r| {
                let name_l = r.name.to_lowercase();
                let desc_l = r.description.as_deref().unwrap_or("").to_lowercase();
                let topics = r.topics.as_deref().unwrap_or(&[]);
                name_l.contains(fw.as_str())
                    || desc_l.contains(fw.as_str())
                    || topics.iter().any(|t| t.contains(fw.as_str()))
            })
            .map(|r| r.name.clone())
            .unwrap_or_default();

        signals.push(AiSignal::Framework {
            name: fw.clone(),
            repo: repo_name,
        });
    }

    // 4. Python-heavy org (≥60% bytes) → strong ML proxy
    let total: u64 = stack.languages.values().sum();
    if total > 0 {
        let python = stack.languages.get("Python").copied().unwrap_or(0);
        if python as f64 / total as f64 >= 0.60 {
            signals.push(AiSignal::PythonHeavy {
                python_bytes: python,
                total_bytes: total,
            });
        }
    }

    // De-duplicate topic signals
    signals.dedup_by(|a, b| matches!((a, b), (AiSignal::Topic(x), AiSignal::Topic(y)) if x == y));
    signals
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{AiSignal, GhRepo, TechStack};
    use chrono::Utc;
    use std::collections::HashMap;

    fn bare_repo(name: &str) -> GhRepo {
        GhRepo {
            id: 1,
            name: name.to_string(),
            full_name: format!("org/{name}"),
            description: None,
            language: None,
            stargazers_count: 0,
            forks_count: 0,
            open_issues_count: 0,
            topics: None,
            pushed_at: None,
            created_at: Utc::now() - chrono::Duration::days(365),
            updated_at: Utc::now(),
            archived: false,
            fork: false,
            size: 1000,
            default_branch: "main".to_string(),
        }
    }

    fn empty_stack() -> TechStack {
        TechStack::default()
    }

    // ── detect ───────────────────────────────────────────────────────────────

    #[test]
    fn detect_empty_input_returns_no_signals() {
        let signals = detect(&empty_stack(), &[]);
        assert!(signals.is_empty());
    }

    #[test]
    fn detect_ai_topic_produces_topic_signal() {
        let mut repo = bare_repo("some-project");
        repo.topics = Some(vec!["machine-learning".to_string()]);
        let signals = detect(&empty_stack(), &[repo]);
        assert!(signals
            .iter()
            .any(|s| matches!(s, AiSignal::Topic(t) if t == "machine-learning")));
    }

    #[test]
    fn detect_repo_name_hint_produces_reponame_signal() {
        let repo = bare_repo("llm-server");
        let signals = detect(&empty_stack(), &[repo]);
        assert!(signals
            .iter()
            .any(|s| matches!(s, AiSignal::RepoName { repo } if repo == "llm-server")));
    }

    #[test]
    fn detect_framework_in_stack_produces_framework_signal() {
        let mut stack = empty_stack();
        stack.ai_frameworks = vec!["pytorch".to_string()];
        // repo whose description mentions pytorch so attribution works
        let mut repo = bare_repo("training-scripts");
        repo.description = Some("PyTorch training code".to_string());
        let signals = detect(&stack, &[repo]);
        assert!(signals.iter().any(|s| matches!(s, AiSignal::Framework { name, .. } if name == "pytorch")));
    }

    #[test]
    fn detect_framework_attribution_falls_back_to_empty_string() {
        // Framework in stack but no repo mentions it → repo field is empty
        let mut stack = empty_stack();
        stack.ai_frameworks = vec!["jax".to_string()];
        let repo = bare_repo("random-project");
        let signals = detect(&stack, &[repo]);
        assert!(signals.iter().any(|s| matches!(s, AiSignal::Framework { name, repo } if name == "jax" && repo.is_empty())));
    }

    #[test]
    fn detect_python_heavy_triggers_at_60_percent() {
        let mut stack = empty_stack();
        stack.languages = HashMap::from([
            ("Python".to_string(), 600u64),
            ("JavaScript".to_string(), 400u64),
        ]);
        let signals = detect(&stack, &[]);
        assert!(signals
            .iter()
            .any(|s| matches!(s, AiSignal::PythonHeavy { .. })));
    }

    #[test]
    fn detect_python_below_threshold_no_signal() {
        let mut stack = empty_stack();
        stack.languages = HashMap::from([
            ("Python".to_string(), 599u64),
            ("JavaScript".to_string(), 401u64),
        ]);
        let signals = detect(&stack, &[]);
        assert!(!signals
            .iter()
            .any(|s| matches!(s, AiSignal::PythonHeavy { .. })));
    }

    #[test]
    fn detect_no_python_heavy_when_no_languages() {
        // total = 0 → skip division guard
        let signals = detect(&empty_stack(), &[]);
        assert!(!signals
            .iter()
            .any(|s| matches!(s, AiSignal::PythonHeavy { .. })));
    }

    // ── score ────────────────────────────────────────────────────────────────

    #[test]
    fn score_empty_signals_is_zero() {
        assert_eq!(score(&[], &empty_stack()), 0.0);
    }

    #[test]
    fn score_framework_adds_0_20() {
        let sigs = vec![AiSignal::Framework { name: "torch".into(), repo: "".into() }];
        assert!((score(&sigs, &empty_stack()) - 0.20).abs() < 1e-4);
    }

    #[test]
    fn score_python_heavy_adds_0_15() {
        let sigs = vec![AiSignal::PythonHeavy { python_bytes: 600, total_bytes: 1000 }];
        assert!((score(&sigs, &empty_stack()) - 0.15).abs() < 1e-4);
    }

    #[test]
    fn score_topic_adds_0_08() {
        let sigs = vec![AiSignal::Topic("llm".into())];
        assert!((score(&sigs, &empty_stack()) - 0.08).abs() < 1e-4);
    }

    #[test]
    fn score_reponame_adds_0_04() {
        let sigs = vec![AiSignal::RepoName { repo: "llm-server".into() }];
        assert!((score(&sigs, &empty_stack()) - 0.04).abs() < 1e-4);
    }

    #[test]
    fn score_three_frameworks_in_stack_adds_bonus() {
        let mut stack = empty_stack();
        stack.ai_frameworks = vec!["torch".into(), "jax".into(), "transformers".into()];
        // one framework signal (0.20) + 3-framework bonus (0.12) = 0.32
        let sigs = vec![AiSignal::Framework { name: "torch".into(), repo: "".into() }];
        assert!((score(&sigs, &stack) - 0.32).abs() < 1e-4);
    }

    #[test]
    fn score_dep_signals_contribute() {
        use crate::types::DepSignal;
        let mut stack = empty_stack();
        stack.dep_signals = vec![
            DepSignal::AiPackage { manager: "pip".into(), name: "torch".into() }, // 0.12
            DepSignal::VectorDb { name: "chromadb".into() },                       // 0.10
        ];
        // no AiSignals → just deps = 0.22
        assert!((score(&[], &stack) - 0.22).abs() < 1e-4);
    }

    #[test]
    fn score_readme_ai_mentions_contribute() {
        use crate::types::ReadmeSignals;
        let mut stack = empty_stack();
        stack.readme = Some(ReadmeSignals {
            ai_mentions: vec!["llm".into(), "rag".into()], // 2 * 0.04 = 0.08
            ..Default::default()
        });
        assert!((score(&[], &stack) - 0.08).abs() < 1e-4);
    }

    #[test]
    fn score_capped_at_one() {
        let sigs: Vec<AiSignal> = (0..20)
            .map(|i| AiSignal::Framework { name: format!("fw-{i}"), repo: "".into() })
            .collect();
        assert!(score(&sigs, &empty_stack()) <= 1.0);
    }
}

/// Score 0.0–1.0 from detected signals, dep manifests, and README.
#[allow(clippy::cast_precision_loss)]
pub fn score(signals: &[AiSignal], stack: &TechStack) -> f32 {
    let mut pts = 0.0_f32;

    for sig in signals {
        pts += match sig {
            AiSignal::Framework { .. } => 0.20,
            AiSignal::PythonHeavy { .. } => 0.15,
            AiSignal::Topic(_) => 0.08,
            AiSignal::RepoName { .. } => 0.04,
        };
    }

    // Dep manifest signals — more reliable than topic scanning
    use crate::types::DepSignal;
    for dep in &stack.dep_signals {
        pts += match dep {
            DepSignal::AiPackage { .. } => 0.12,
            DepSignal::VectorDb { .. }  => 0.10,
        };
    }

    // README AI content
    if let Some(readme) = &stack.readme {
        pts += readme.ai_mentions.len() as f32 * 0.04;
    }

    // Bonus for stacked frameworks (topic + dep combined)
    if stack.ai_frameworks.len() >= 3 {
        pts += 0.12;
    }
    if stack.dep_signals.len() >= 3 {
        pts += 0.10;
    }

    pts.min(1.0)
}
