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

/// Score 0.0–1.0 from detected signals.
pub fn score(signals: &[AiSignal], stack: &TechStack) -> f32 {
    let mut pts = 0.0_f32;

    for sig in signals {
        pts += match sig {
            AiSignal::Framework { .. } => 0.25,
            AiSignal::PythonHeavy { .. } => 0.20,
            AiSignal::Topic(_) => 0.10,
            AiSignal::RepoName { .. } => 0.05,
        };
    }

    // Bonus for stacked frameworks
    if stack.ai_frameworks.len() >= 3 {
        pts += 0.15;
    }

    pts.min(1.0)
}
