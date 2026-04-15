/// README signal extractor.
///
/// Fetches the default-branch README from a repo and scores it for
/// hiring, AI/ML content, and engineering quality signals — all locally.
use crate::client::GhClient;
use crate::types::ReadmeSignals;
use tracing::debug;

const HIRING_KEYWORDS: &[&str] = &[
    "we are hiring", "we're hiring", "join our team", "join us",
    "open positions", "open roles", "job openings", "careers",
    "work with us", "come work", "apply now", "job board",
    "we are looking for", "we're looking for", "recruiting",
];

const AI_KEYWORDS: &[&str] = &[
    "machine learning", "deep learning", "neural network", "large language model",
    "llm", "gpt", "transformer", "foundation model", "generative ai",
    "reinforcement learning", "computer vision", "natural language processing",
    "nlp", "embedding", "fine-tuning", "fine tuning", "rag",
    "retrieval-augmented", "vector database", "semantic search",
    "ai agent", "autonomous agent", "multimodal",
];

const QUALITY_SIGNALS: &[&str] = &[
    "ci", "coverage", "passing", "build", "license", "pypi", "crates.io",
    "docker", "kubernetes", "terraform", "github actions",
];

/// Fetch and analyse the README for a repo.
/// Returns `None` if the repo has no README or the fetch fails.
pub async fn analyse(client: &GhClient, owner: &str, repo: &str) -> Option<ReadmeSignals> {
    // Try common README filenames in order
    let candidates = ["README.md", "README.rst", "README.txt", "README"];
    let mut content = None;
    for name in candidates {
        match client.get_file_content(owner, repo, name).await {
            Ok(Some(c)) => { content = Some(c); break; }
            Ok(None)    => continue,
            Err(e)      => { debug!("README fetch {owner}/{repo}/{name}: {e}"); continue; }
        }
    }
    let content = content?;
    Some(extract(&content))
}

/// Pure extraction from raw README text.
pub fn extract(content: &str) -> ReadmeSignals {
    let lower = content.to_lowercase();

    let hiring = HIRING_KEYWORDS.iter().any(|kw| lower.contains(kw));

    let ai_mentions: Vec<String> = AI_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .map(|kw| kw.to_string())
        .collect();

    let has_ci_badge  = lower.contains("![") && (lower.contains("build") || lower.contains("ci") || lower.contains("workflow"));
    let has_docker    = lower.contains("docker") || lower.contains("dockerfile") || lower.contains("container");
    let word_count    = content.split_whitespace().count();
    let has_quality   = QUALITY_SIGNALS.iter().any(|s| lower.contains(s));

    ReadmeSignals {
        hiring,
        ai_mentions,
        has_ci_badge,
        has_docker,
        word_count,
        has_quality_signals: has_quality,
    }
}

#[cfg(test)]
mod tests {
    use super::extract;

    #[test]
    fn detects_hiring() {
        let readme = "We are hiring engineers! Join our team and apply now.";
        let s = extract(readme);
        assert!(s.hiring);
    }

    #[test]
    fn no_false_positive_hiring() {
        let readme = "A library for training neural networks with PyTorch.";
        let s = extract(readme);
        assert!(!s.hiring);
    }

    #[test]
    fn detects_ai_mentions() {
        let readme = "We use large language models and RAG for semantic search.";
        let s = extract(readme);
        assert!(s.ai_mentions.iter().any(|m| m.contains("large language model")));
        assert!(s.ai_mentions.iter().any(|m| m.contains("rag")));
        assert!(s.ai_mentions.iter().any(|m| m.contains("semantic search")));
    }

    #[test]
    fn no_ai_mentions_in_plain_readme() {
        let readme = "A REST API built with Go and PostgreSQL.";
        let s = extract(readme);
        assert!(s.ai_mentions.is_empty());
    }

    #[test]
    fn detects_ci_badge() {
        let readme = "[![Build Status](https://github.com/org/repo/actions/badge.svg)](url)";
        let s = extract(readme);
        assert!(s.has_ci_badge);
    }

    #[test]
    fn detects_docker() {
        let readme = "Run with: `docker build -t my-app .`";
        let s = extract(readme);
        assert!(s.has_docker);
    }

    #[test]
    fn word_count_accurate() {
        let readme = "one two three four five";
        let s = extract(readme);
        assert_eq!(s.word_count, 5);
    }

    #[test]
    fn empty_readme_does_not_panic() {
        let s = extract("");
        assert!(!s.hiring);
        assert!(s.ai_mentions.is_empty());
        assert_eq!(s.word_count, 0);
    }
}
