use crate::models::Post;

/// Relevance verdict — keep or discard, with reason.
#[derive(Debug, Clone)]
pub struct Verdict {
    pub keep: bool,
    pub score: i32,
    pub reason: &'static str,
}

const THRESHOLD: i32 = 2;

/// Score a post for job-search relevance.
/// Positive signals: hiring, AI/ML, remote/global, engineering, company insight.
/// Negative signals: empty text, pure social noise, very short.
pub fn score(post: &Post) -> Verdict {
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

static HIRING_KEYWORDS: &[&str] = &[
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

static AI_KEYWORDS: &[&str] = &[
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

static REMOTE_KEYWORDS: &[&str] = &[
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

static ENGINEERING_KEYWORDS: &[&str] = &[
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

static CULTURE_KEYWORDS: &[&str] = &[
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

static NOISE_KEYWORDS: &[&str] = &[
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
        let v = score(&post(
            "We're hiring a Senior ML Engineer to join our team in Berlin. Fully remote, working on LLMs and RAG pipelines.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
        assert!(v.score >= 6);
    }

    #[test]
    fn keeps_ai_content() {
        let v = score(&post(
            "Just published our engineering blog post about how we fine-tuned a large language model for code review. The results with PyTorch were impressive.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_birthday() {
        let v = score(&post("Happy birthday to my amazing colleague! Wishing you the best!"));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_empty() {
        let v = score(&Post {
            post_text: None,
            ..post("")
        });
        assert!(!v.keep);
        assert_eq!(v.reason, "no text");
    }

    #[test]
    fn filters_short_noise() {
        let v = score(&post("Agree or disagree?"));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn keeps_remote_role() {
        let v = score(&post(
            "Open position: Platform Engineer. We're remote-first and looking for someone passionate about Kubernetes and distributed systems. Work from anywhere.",
        ));
        assert!(v.keep, "score={} reason={}", v.score, v.reason);
    }

    #[test]
    fn filters_generic_motivation() {
        let v = score(&post(
            "Like if you agree: the best investment you can make is in yourself. #motivation #mondaymotivation Keep pushing forward!",
        ));
        assert!(!v.keep, "score={} reason={}", v.score, v.reason);
    }
}
