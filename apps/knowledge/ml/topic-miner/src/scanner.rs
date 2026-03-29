//! Codebase scanner: walks the source tree and emits `RawSignal`s.

use std::collections::HashSet;
use std::path::Path;

use walkdir::WalkDir;

use crate::rules::{EXTRA_RULES, RULES};
use crate::topic::RawSignal;

/// Directories to skip during traversal.
const EXCLUDED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    ".git",
    ".next",
    "dist",
    "__generated__",
    ".vercel",
    ".turbo",
    "lance-db",
    ".cache",
];

/// File extensions we care about.
const SOURCE_EXTS: &[&str] = &[
    "ts", "tsx", "js", "jsx", "mjs", "cjs", "rs", "py", "graphql", "gql", "sql", "toml", "json",
    "md", "yaml", "yml",
];

fn is_excluded(name: &str) -> bool {
    EXCLUDED_DIRS.contains(&name)
}

fn is_source_file(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|ext| SOURCE_EXTS.contains(&ext))
        .unwrap_or(false)
}

/// Scan the directory tree rooted at `root` and return raw signals.
///
/// Each signal records which taxonomy tag was detected, in which file and line.
pub fn scan(root: &Path) -> Vec<RawSignal> {
    let mut signals = Vec::new();
    let mut seen_files = HashSet::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_entry(|e| {
            if e.file_type().is_dir() {
                let name = e.file_name().to_string_lossy();
                !is_excluded(&name)
            } else {
                true
            }
        })
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if !path.is_file() || !is_source_file(path) {
            continue;
        }

        let rel = path
            .strip_prefix(root)
            .unwrap_or(path)
            .to_string_lossy()
            .to_string();

        // Avoid scanning the same file twice (symlinks).
        if !seen_files.insert(rel.clone()) {
            continue;
        }

        let content = match std::fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue, // binary file or permission error
        };

        // ── Package manifest parsing (structured, not line-by-line) ──────
        if rel.ends_with("package.json") {
            signals.extend(scan_package_json(&rel, &content));
            continue;
        }
        if rel.ends_with("Cargo.toml") {
            signals.extend(scan_cargo_toml(&rel, &content));
            continue;
        }

        // ── Line-by-line regex scanning ──────────────────────────────────
        // Track which tags already matched in this file to cap evidence.
        let mut file_tags: HashSet<&str> = HashSet::new();

        for (line_num, line) in content.lines().enumerate() {
            // Skip empty / comment-only lines.
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with("//") || trimmed.starts_with('#') {
                continue;
            }

            // Taxonomy rules.
            for rule in RULES.iter() {
                if file_tags.contains(rule.tag) {
                    continue; // one hit per tag per file is enough
                }
                if rule.regex.is_match(line) {
                    file_tags.insert(rule.tag);
                    signals.push(RawSignal {
                        tag: rule.tag.to_string(),
                        file: rel.clone(),
                        line: line_num + 1,
                        snippet: truncate_line(trimmed, 120),
                    });
                }
            }

            // Extra pattern rules (not in taxonomy).
            for (tag, _cat, re) in EXTRA_RULES.iter() {
                if file_tags.contains(tag) {
                    continue;
                }
                if re.is_match(line) {
                    file_tags.insert(tag);
                    signals.push(RawSignal {
                        tag: tag.to_string(),
                        file: rel.clone(),
                        line: line_num + 1,
                        snippet: truncate_line(trimmed, 120),
                    });
                }
            }
        }
    }

    signals
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn truncate_line(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        // Find a valid char boundary at or before `max`.
        let mut end = max;
        while end > 0 && !s.is_char_boundary(end) {
            end -= 1;
        }
        format!("{}...", &s[..end])
    }
}

/// Extract dependency names from package.json and match against taxonomy.
fn scan_package_json(rel: &str, content: &str) -> Vec<RawSignal> {
    let mut signals = Vec::new();
    let Ok(val) = serde_json::from_str::<serde_json::Value>(content) else {
        return signals;
    };

    let deps = val
        .get("dependencies")
        .and_then(|v| v.as_object())
        .into_iter()
        .flat_map(|m| m.keys())
        .chain(
            val.get("devDependencies")
                .and_then(|v| v.as_object())
                .into_iter()
                .flat_map(|m| m.keys()),
        );

    for dep in deps {
        // Check each taxonomy rule against the dep name.
        for rule in RULES.iter() {
            if rule.regex.is_match(dep) {
                signals.push(RawSignal {
                    tag: rule.tag.to_string(),
                    file: rel.to_string(),
                    line: 0,
                    snippet: format!("dependency: {dep}"),
                });
                break; // one match per dep is enough
            }
        }
    }

    signals
}

/// Extract dependency names from Cargo.toml and match against taxonomy.
fn scan_cargo_toml(rel: &str, content: &str) -> Vec<RawSignal> {
    let mut signals = Vec::new();

    // Simple line-based parsing — look for lines like `lancedb = "0.27"`
    for (line_num, line) in content.lines().enumerate() {
        let trimmed = line.trim();
        // Dependency lines start with a non-bracket, non-comment ident.
        if trimmed.starts_with('[') || trimmed.starts_with('#') || trimmed.is_empty() {
            continue;
        }
        if let Some(dep_name) = trimmed.split('=').next() {
            let dep = dep_name.trim();
            for rule in RULES.iter() {
                if rule.regex.is_match(dep) {
                    signals.push(RawSignal {
                        tag: rule.tag.to_string(),
                        file: rel.to_string(),
                        line: line_num + 1,
                        snippet: format!("cargo dep: {dep}"),
                    });
                    break;
                }
            }
        }
    }

    signals
}
