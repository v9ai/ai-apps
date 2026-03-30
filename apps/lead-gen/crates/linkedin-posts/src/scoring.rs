use crate::models::Post;

/// Relevance verdict — keep or discard, with reason.
#[derive(Debug, Clone)]
pub struct Verdict {
    pub keep: bool,
    pub score: i32,
    pub reason: &'static str,
}

const THRESHOLD: i32 = 2;

/// Legacy keyword-based scorer — kept for backward compatibility and tests.
/// Use `analysis::analyze()` for the ML-enhanced multi-label version.
pub fn score_legacy(post: &Post) -> Verdict {
    let text = match &post.post_text {
        Some(t) if !t.is_empty() => t,
        _ => {
            return Verdict {
                keep: false,
                score: -5,
                reason: "no text",
            }
        }
    };

    let lower = text.to_lowercase();
    let mut s: i32 = 0;

    // ── Hiring signals (+3 each, cap at 6) ──
    let hiring_hits = HIRING_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s += (hiring_hits * 3).min(6);

    // ── AI/ML keywords (+2 each, cap at 6) ──
    let ai_hits = AI_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s += (ai_hits * 2).min(6);

    // ── Remote / global signals (+2 each, cap at 4) ──
    let remote_hits = REMOTE_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s += (remote_hits * 2).min(4);

    // ── Engineering keywords (+1 each, cap at 3) ──
    let eng_hits = ENGINEERING_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s += eng_hits.min(3);

    // ── Company/culture insight (+1 each, cap at 2) ──
    let culture_hits = CULTURE_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s += culture_hits.min(2);

    // ── Negative: pure social noise ──
    let noise_hits = NOISE_KEYWORDS
        .iter()
        .filter(|kw| lower.contains(*kw))
        .count() as i32;
    s -= noise_hits * 2;

    // ── Negative: very short (<80 chars) ──
    if text.len() < 80 {
        s -= 2;
    }

    // ── Repost penalty (less original signal) ──
    if post.is_repost {
        s -= 1;
    }

    let keep = s >= THRESHOLD;
    let reason = if keep {
        if hiring_hits > 0 {
            "hiring signal"
        } else if ai_hits > 0 {
            "AI/ML content"
        } else if remote_hits > 0 {
            "remote signal"
        } else {
            "relevant"
        }
    } else if s <= -3 {
        "noise"
    } else {
        "low relevance"
    };

    Verdict { keep, score: s, reason }
}

pub static HIRING_KEYWORDS: &[&str] = &[
    "we're hiring",
    "we are hiring",
    "hiring for",
    "looking for",
    "open role",
    "open position",
    "join our team",
    "join us",
    "now hiring",
    "apply now",
    "job opening",
    "job opportunity",
    "come work with",
    "growing our team",
    "building our team",
    "talent acquisition",
    "new role",
    "new opening",
];

pub static AI_KEYWORDS: &[&str] = &[
    "machine learning",
    "deep learning",
    "artificial intelligence",
    " llm ",
    "llm,",
    "llms",
    "large language model",
    "natural language processing",
    " nlp ",
    "computer vision",
    "neural network",
    "pytorch",
    "tensorflow",
    "transformer",
    " gpt",
    "langchain",
    "rag ",
    "retrieval augmented",
    "fine-tuning",
    "embeddings",
    "vector database",
    "mlops",
    "ml engineer",
    "ai engineer",
    "data scientist",
    "generative ai",
    "gen ai",
    "diffusion model",
    "reinforcement learning",
];

pub static REMOTE_KEYWORDS: &[&str] = &[
    "fully remote",
    "remote-first",
    "remote first",
    "work from anywhere",
    "remote position",
    "remote role",
    "remote opportunity",
    "distributed team",
    "async-first",
    "global team",
    "worldwide",
];

pub static ENGINEERING_KEYWORDS: &[&str] = &[
    "software engineer",
    "backend engineer",
    "frontend engineer",
    "full-stack",
    "fullstack",
    "devops",
    "infrastructure",
    "platform engineer",
    "site reliability",
    " sre ",
    "distributed systems",
    "microservices",
    "kubernetes",
    " k8s",
    "typescript",
    "python",
    " rust ",
    " golang",
    "system design",
    "tech lead",
    "staff engineer",
    "principal engineer",
    "engineering manager",
];

pub static CULTURE_KEYWORDS: &[&str] = &[
    "engineering culture",
    "tech stack",
    "engineering blog",
    "tech talk",
    "open source",
    "developer experience",
    "team culture",
    "how we build",
    "our engineering",
    "series a",
    "series b",
    "series c",
    "raised",
    "funding",
    "yc ",
    "y combinator",
];

pub static NOISE_KEYWORDS: &[&str] = &[
    "happy birthday",
    "work anniversary",
    "congratulations on",
    "congrats on your",
    "thrilled to announce my",
    "blessed to",
    "grateful for this journey",
    "like if you agree",
    "share if you",
    "agree or disagree",
    "hot take:",
    "unpopular opinion",
    "thoughts?",
    "#motivation",
    "#mondaymotivation",
    "#blessed",
    "#grateful",
    "personal news:",
];

/// Check if a position title contains AI/ML keywords.
/// Check keyword match accounting for space-padded keywords at string boundaries.
/// Keywords like " llm " won't match "LLM Engineer" via plain contains because
/// there's no leading space at position 0. This checks both the original keyword
/// and the trimmed variant.
fn keyword_match(text: &str, keywords: &[&str]) -> bool {
    keywords.iter().any(|kw| {
        text.contains(kw) || {
            let trimmed = kw.trim();
            trimmed != *kw && (text.starts_with(trimmed) || text.contains(&format!(" {}", trimmed)) || text.contains(&format!("{} ", trimmed)))
        }
    })
}

pub fn title_has_ai_signal(position: &str) -> bool {
    let lower = position.to_lowercase();
    keyword_match(&lower, AI_KEYWORDS)
}

/// Check if a position title contains any engineering keywords.
pub fn title_has_engineering_signal(position: &str) -> bool {
    let lower = position.to_lowercase();
    keyword_match(&lower, ENGINEERING_KEYWORDS)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn post(text: &str) -> Post {
        Post {
            post_url: None,
            post_text: Some(text.to_string()),
            posted_date: None,
            reactions_count: 0,
            comments_count: 0,
            reposts_count: 0,
            media_type: "none".to_string(),
            is_repost: false,
            original_author: None,
        }
    }

    #[test]
    fn keeps_hiring_post() {
        let v = score_legacy(&post(
            "We're hiring a Senior ML Engineer to join our team in Berlin. Fully remote, working on LLMs and RAG pipelines.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
        assert!(v.score >= 6);
    }

    #[test]
    fn keeps_ai_content() {
        let v = score_legacy(&post(
            "Just published our engineering blog post about how we fine-tuned a large language model for code review. The results with PyTorch were impressive.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_birthday() {
        let v = score_legacy(&post("Happy birthday to my amazing colleague! Wishing you the best!"));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_empty() {
        let v = score_legacy(&Post {
            post_text: None,
            ..post("")
        });
        assert!(!v.keep);
        assert_eq!(v.reason, "no text");
    }

    #[test]
    fn filters_short_noise() {
        let v = score_legacy(&post("Agree or disagree?"));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn keeps_remote_role() {
        let v = score_legacy(&post(
            "Open position: Platform Engineer. We're remote-first and looking for someone passionate about Kubernetes and distributed systems. Work from anywhere.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_generic_motivation() {
        let v = score_legacy(&post(
            "Like if you agree: the best investment you can make is in yourself. #motivation #mondaymotivation Keep pushing forward!",
        ));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }

    // ── title_has_ai_signal tests ──

    #[test]
    fn title_ai_signal_ml_engineer() {
        assert!(title_has_ai_signal("ML Engineer"));
    }

    #[test]
    fn title_ai_signal_llm_at_position_zero() {
        // " llm " has leading space — must still match at start of title
        assert!(title_has_ai_signal("LLM Infrastructure Lead"));
    }

    #[test]
    fn title_ai_signal_data_scientist() {
        assert!(title_has_ai_signal("Senior Data Scientist"));
    }

    #[test]
    fn title_ai_signal_case_insensitive() {
        assert!(title_has_ai_signal("MACHINE LEARNING ENGINEER"));
    }

    #[test]
    fn title_ai_signal_no_match() {
        assert!(!title_has_ai_signal("Sales Manager"));
    }

    #[test]
    fn title_ai_signal_empty() {
        assert!(!title_has_ai_signal(""));
    }

    #[test]
    fn title_ai_signal_nlp_at_start() {
        assert!(title_has_ai_signal("NLP Researcher"));
    }

    // ── title_has_engineering_signal tests ──

    #[test]
    fn title_eng_signal_software_engineer() {
        assert!(title_has_engineering_signal("Software Engineer"));
    }

    #[test]
    fn title_eng_signal_rust_at_start() {
        // " rust " has spaces — must match at start of title
        assert!(title_has_engineering_signal("Rust Developer"));
    }

    #[test]
    fn title_eng_signal_sre_at_start() {
        assert!(title_has_engineering_signal("SRE Lead"));
    }

    #[test]
    fn title_eng_signal_tech_lead() {
        assert!(title_has_engineering_signal("Tech Lead"));
    }

    #[test]
    fn title_eng_signal_no_match() {
        assert!(!title_has_engineering_signal("Marketing Director"));
    }

    // ── score_legacy edge cases ──

    #[test]
    fn score_legacy_repost_penalty() {
        let mut p = post("We're hiring a Senior ML Engineer for our fully remote team.");
        p.is_repost = true;
        let v_repost = score_legacy(&p);
        p.is_repost = false;
        let v_original = score_legacy(&p);
        assert!(v_repost.score < v_original.score, "repost should score lower");
    }

    #[test]
    fn score_legacy_empty_string_text() {
        let v = score_legacy(&post(""));
        assert!(!v.keep);
        assert_eq!(v.reason, "no text");
    }
}
