//! Transform ResearchState → PersonResearch (frontend-compatible JSON).
//!
//! LLM responses embed JSON inside markdown fences (```json ... ```).
//! This module strips the fences, parses the JSON, and maps fields
//! to the PersonResearch schema the TypeScript frontend expects.

use std::collections::HashMap;

use serde_json::Value;
use tracing::warn;

use crate::types::{
    Contribution, InterviewQuestion, PersonResearch, Quote, ResearchState, Source, TimelineEvent,
};

/// Extract JSON from LLM text that may have markdown code fences.
fn extract_json(raw: &str) -> String {
    let trimmed = raw.trim();

    let json_str = if let Some(start) = trimmed.find("```") {
        let after_fence = &trimmed[start + 3..];
        // Skip optional language tag (e.g., "json\n")
        let content_start = after_fence.find('\n').map(|i| i + 1).unwrap_or(0);
        let content = &after_fence[content_start..];
        if let Some(end) = content.rfind("```") {
            content[..end].trim()
        } else {
            trimmed
        }
    } else if let Some(start) = trimmed.find('[') {
        if let Some(end) = trimmed.rfind(']') {
            &trimmed[start..=end]
        } else {
            trimmed
        }
    } else if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            &trimmed[start..=end]
        } else {
            trimmed
        }
    } else {
        trimmed
    };

    // Strip JavaScript-style line comments (// ...) that LLMs sometimes add
    json_str
        .lines()
        .map(|line| {
            // Remove trailing // comments but be careful not to strip URLs
            // Only strip if // appears after a comma or closing bracket/brace
            if let Some(pos) = line.rfind("//") {
                let before = line[..pos].trim_end();
                if before.ends_with(',') || before.ends_with('}') || before.ends_with(']') || before.ends_with('"') {
                    return before.to_string();
                }
            }
            line.to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Parse a JSON array from LLM output, returning empty vec on failure.
fn parse_array(raw: &str) -> Vec<Value> {
    let json_str = extract_json(raw);
    serde_json::from_str(&json_str).unwrap_or_else(|e| {
        if !raw.is_empty() {
            warn!("Failed to parse JSON array: {e}");
        }
        Vec::new()
    })
}

/// Parse a JSON object from LLM output, returning None on failure.
fn parse_object(raw: &str) -> Option<Value> {
    let json_str = extract_json(raw);
    serde_json::from_str(&json_str).ok()
}

fn val_str(v: &Value, key: &str) -> String {
    v.get(key).and_then(|v| v.as_str()).unwrap_or("").to_string()
}

/// Transform ResearchState into frontend-compatible PersonResearch.
pub fn transform(state: &ResearchState) -> PersonResearch {
    let person = &state.person;

    // Timeline: [{date, event, url}]
    let timeline: Vec<TimelineEvent> = parse_array(&state.timeline)
        .into_iter()
        .filter_map(|v| {
            let date = val_str(&v, "date");
            let event = val_str(&v, "event");
            if date.is_empty() || event.is_empty() {
                return None;
            }
            Some(TimelineEvent {
                date,
                event,
                url: val_str(&v, "url"),
            })
        })
        .collect();

    // Key contributions: [{title, description, url}]
    let key_contributions: Vec<Contribution> = parse_array(&state.contributions)
        .into_iter()
        .filter_map(|v| {
            let title = val_str(&v, "title");
            if title.is_empty() {
                return None;
            }
            Some(Contribution {
                title,
                description: val_str(&v, "description"),
                url: val_str(&v, "url"),
            })
        })
        .collect();

    // Quotes: [{text, source, url}]
    let quotes: Vec<Quote> = parse_array(&state.quotes)
        .into_iter()
        .filter_map(|v| {
            let text = val_str(&v, "text");
            if text.is_empty() {
                return None;
            }
            Some(Quote {
                text,
                source: val_str(&v, "source"),
                url: val_str(&v, "url"),
            })
        })
        .collect();

    // Social: [{platform, url}] → Record<string, string>
    let mut social = HashMap::new();
    for v in parse_array(&state.social) {
        let platform = val_str(&v, "platform").to_lowercase();
        let url = val_str(&v, "url");
        if !platform.is_empty() && !url.is_empty() {
            social.insert(platform, url);
        }
    }
    // Override with known-good links from person input
    if let Some(gh) = &person.github {
        social.insert("github".into(), format!("https://github.com/{gh}"));
    }
    if let Some(blog) = &person.blog_url {
        social.insert("website".into(), blog.clone());
    }
    if let Some(orcid) = &person.orcid {
        social.insert("orcid".into(), format!("https://orcid.org/{orcid}"));
    }

    // Topics/expertise: [string, ...]
    let topics: Vec<String> = parse_array(&state.expertise)
        .into_iter()
        .filter_map(|v| v.as_str().map(|s| s.to_string()))
        .collect();

    // Questions: [{category, question, why_this_question, expected_insight}]
    let questions: Vec<InterviewQuestion> = parse_array(&state.questions)
        .into_iter()
        .filter_map(|v| {
            let question = val_str(&v, "question");
            if question.is_empty() {
                return None;
            }
            Some(InterviewQuestion {
                category: val_str(&v, "category"),
                question,
                why_this_question: v
                    .get("why_this_question")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                expected_insight: v
                    .get("expected_insight")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
            })
        })
        .collect();

    // Collect sources from social links and person input
    let mut sources: Vec<Source> = Vec::new();
    if let Some(gh) = &person.github {
        sources.push(Source {
            title: format!("{} on GitHub", person.name),
            url: format!("https://github.com/{gh}"),
        });
    }
    if let Some(blog) = &person.blog_url {
        sources.push(Source {
            title: format!("{}'s Blog", person.name),
            url: blog.clone(),
        });
    }
    if let Some(orcid) = &person.orcid {
        sources.push(Source {
            title: format!("{} ORCID", person.name),
            url: format!("https://orcid.org/{orcid}"),
        });
    }

    // Executive summary: try to parse as structured JSON object
    let executive_summary = {
        let parsed = parse_object(&state.executive);
        match parsed {
            Some(ref v) if v.is_object() && v.get("one_liner").is_some() => parsed,
            Some(ref v) if v.is_array() => {
                // LLM returned an array of bullet strings — wrap in structure
                let facts: Vec<String> = v
                    .as_array()
                    .unwrap()
                    .iter()
                    .filter_map(|item| item.as_str().map(|s| s.to_string()))
                    .collect();
                let one_liner = facts.first().cloned().unwrap_or_default();
                Some(serde_json::json!({
                    "one_liner": one_liner,
                    "key_facts": facts,
                    "career_arc": "",
                    "current_focus": "",
                }))
            }
            _ if !state.executive.is_empty() => {
                // Plain text — extract first line as one_liner
                let first_line = state.executive.lines()
                    .find(|l| !l.trim().is_empty() && !l.starts_with('#'))
                    .unwrap_or("");
                Some(serde_json::json!({
                    "one_liner": first_line.trim(),
                    "key_facts": [],
                    "career_arc": "",
                    "current_focus": "",
                }))
            }
            _ => None,
        }
    };

    // Competitive landscape: try to parse as JSON
    let competitive_landscape = parse_object(&state.competitive);

    // Technical philosophy: try to parse as JSON
    let technical_philosophy = parse_object(&state.philosophy);

    // Generate ISO timestamp
    let generated_at = chrono::Utc::now().to_rfc3339();

    PersonResearch {
        slug: person.slug.clone(),
        name: person.name.clone(),
        generated_at,
        bio: state.bio.clone(),
        topics,
        timeline,
        key_contributions,
        quotes,
        social,
        sources,
        executive_summary,
        competitive_landscape,
        technical_philosophy,
        questions: if questions.is_empty() {
            None
        } else {
            Some(questions)
        },
    }
}
