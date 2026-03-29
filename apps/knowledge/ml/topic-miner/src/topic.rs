//! Topic aggregation: group raw signals into deduplicated topics with evidence.

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::rules::EXTRA_RULES;
use crate::taxonomy::TAXONOMY;

/// A single grep hit from the scanner.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawSignal {
    pub tag: String,
    pub file: String,
    pub line: usize,
    pub snippet: String,
}

/// A source-code reference backing a topic.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    pub file: String,
    pub line: usize,
    pub snippet: String,
}

/// An extracted learning topic ready for embedding.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub slug: String,
    pub title: String,
    pub description: String,
    pub category: String,
    pub evidence: Vec<Evidence>,
    pub source_count: usize,
}

impl Topic {
    /// The text that gets embedded — title + description gives strong signal.
    pub fn embed_text(&self) -> String {
        format!("{}\n\n{}", self.title, self.description)
    }
}

/// Aggregate raw signals into deduplicated topics.
///
/// Groups by tag, merges evidence, assigns category and synthesizes description.
/// Returns topics sorted by source_count descending (most-used first).
pub fn aggregate(signals: Vec<RawSignal>) -> Vec<Topic> {
    // Group signals by tag.
    let mut groups: HashMap<String, Vec<RawSignal>> = HashMap::new();
    for sig in signals {
        groups.entry(sig.tag.clone()).or_default().push(sig);
    }

    let mut topics: Vec<Topic> = groups
        .into_iter()
        .map(|(tag, sigs)| {
            // Distinct source files.
            let files: HashSet<&str> = sigs.iter().map(|s| s.file.as_str()).collect();
            let source_count = files.len();

            // Collect evidence (cap at 10 entries to keep JSON manageable).
            let evidence: Vec<Evidence> = sigs
                .iter()
                .take(10)
                .map(|s| Evidence {
                    file: s.file.clone(),
                    line: s.line,
                    snippet: s.snippet.clone(),
                })
                .collect();

            // Look up label and category from taxonomy or extra rules.
            let (title, category) = resolve_label_category(&tag);

            // Synthesize description.
            let description = synthesize_description(&title, source_count, &evidence);

            Topic {
                slug: tag,
                title,
                description,
                category,
                evidence,
                source_count,
            }
        })
        .collect();

    topics.sort_by(|a, b| b.source_count.cmp(&a.source_count));
    topics
}

fn resolve_label_category(tag: &str) -> (String, String) {
    // Try taxonomy first.
    if let Some(skill) = TAXONOMY.get(tag) {
        return (skill.label.to_string(), skill.category.to_string());
    }
    // Try extra rules.
    for (extra_tag, cat, _) in EXTRA_RULES.iter() {
        if *extra_tag == tag {
            let label = tag
                .split('-')
                .map(|w| {
                    let mut c = w.chars();
                    match c.next() {
                        Some(f) => f.to_uppercase().to_string() + c.as_str(),
                        None => String::new(),
                    }
                })
                .collect::<Vec<_>>()
                .join(" ");
            return (label, cat.to_string());
        }
    }
    // Fallback: title-case the slug.
    let label = tag
        .split('-')
        .map(|w| {
            let mut c = w.chars();
            match c.next() {
                Some(f) => f.to_uppercase().to_string() + c.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ");
    (label, "Other".to_string())
}

fn synthesize_description(title: &str, source_count: usize, evidence: &[Evidence]) -> String {
    let file_word = if source_count == 1 { "file" } else { "files" };

    // Pick up to 3 distinct file paths as context.
    let mut example_files: Vec<&str> = Vec::new();
    let mut seen = HashSet::new();
    for ev in evidence {
        if seen.insert(ev.file.as_str()) {
            example_files.push(&ev.file);
        }
        if example_files.len() >= 3 {
            break;
        }
    }

    let examples = example_files.join(", ");
    format!(
        "{title} is used in {source_count} {file_word} across the lead-gen codebase. Found in: {examples}."
    )
}
