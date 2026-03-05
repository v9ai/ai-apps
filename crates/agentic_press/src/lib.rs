pub mod agent_teams;
pub mod pipeline;
pub mod prompts;
pub mod publisher;

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

/// Strip leading ` ```json\n` and trailing ` ``` ` markdown fences from a string.
/// Returns the input unchanged if no fences are found.
pub fn strip_fences(s: &str) -> &str {
    let trimmed = s.trim();
    let body = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .unwrap_or(trimmed);
    let body = body.trim_start_matches('\n');
    let body = body.strip_suffix("```").unwrap_or(body);
    body.trim()
}
