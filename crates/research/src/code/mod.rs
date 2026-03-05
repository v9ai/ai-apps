pub mod source;
pub mod tools;

use ast_grep_language::SupportLang;
use std::path::PathBuf;

/// Configuration for code analysis tools.
///
/// When `Some` in `TeammateConfig`, the three code analysis tools
/// (SearchPattern, AnalyzeStructure, FindAntiPatterns) are attached
/// to the agent. When `None`, behaviour is unchanged.
#[derive(Clone, Debug)]
pub struct CodeAnalysisConfig {
    /// Root directory to search within.
    pub root_path: PathBuf,
    /// Skip files larger than this (default 100 KB).
    pub max_file_size: usize,
    /// Cap matches returned to prevent token explosion (default 50).
    pub max_matches: usize,
    /// If set, only analyse files for these languages.
    pub allowed_languages: Option<Vec<SupportLang>>,
}

impl Default for CodeAnalysisConfig {
    fn default() -> Self {
        Self {
            root_path: PathBuf::from("."),
            max_file_size: 100 * 1024,
            max_matches: 50,
            allowed_languages: None,
        }
    }
}
