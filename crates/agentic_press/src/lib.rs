pub mod agent_teams;
pub mod pipeline;
pub mod prompts;
pub mod publisher;
pub mod research_phase;
pub mod task_list;

pub use pipeline::{
    BlogResult, DeepDiveArticle, DeepDiveResult, JournalismArticle, JournalismResult, PipelineMode,
    PipelineResult, TopicResult,
};

/// Convert a title/string into a URL-safe slug.
pub fn slugify(s: &str) -> String {
    let raw: String = s
        .chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect();
    raw.split('-')
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// When the editor APPROVEs, its output may contain editorial notes followed
/// by a rewritten article with frontmatter. Extract the article; if none is
/// found, fall back to the original draft.
pub fn extract_published_content<'a>(editor_output: &'a str, draft: &'a str) -> &'a str {
    // If editor included a rewritten article with frontmatter, use it
    if editor_output.contains("---\n") && editor_output.contains("status: published") {
        // Find the markdown content after the APPROVE line
        if let Some(idx) = editor_output.find("---\n") {
            return &editor_output[idx..];
        }
    }
    // Otherwise use the draft as-is
    draft
}

/// Strip leading ` ```<tag>\n ` and trailing ` ``` ` markdown fences from a string.
/// Handles any fence type: ```json, ```markdown, ```md, ```text, bare ```, etc.
/// Returns the input unchanged if no fences are found.
pub fn strip_fences(s: &str) -> &str {
    let trimmed = s.trim();
    let body = if trimmed.starts_with("```") {
        trimmed.find('\n').map(|i| &trimmed[i + 1..]).unwrap_or(trimmed)
    } else {
        trimmed
    };
    body.strip_suffix("```").unwrap_or(body).trim()
}
