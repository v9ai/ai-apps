/// Agent tools for code analysis via ast-grep.
///
/// Three tools: SearchPattern, AnalyzeStructure, FindAntiPatterns.
/// All implement the `Tool` trait and respect `CodeAnalysisConfig` limits.
use async_trait::async_trait;
use ast_grep_language::SupportLang;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
#[allow(unused_imports)]
use walkdir::WalkDir;

use crate::agent::{Tool, ToolDefinition};
use super::CodeAnalysisConfig;
use super::source;

// ─── Helpers ────────────────────────────────────────────────────────────────

/// Map file extension to SupportLang.
fn lang_from_extension(ext: &str) -> Option<SupportLang> {
    match ext {
        "rs" => Some(SupportLang::Rust),
        "ts" => Some(SupportLang::TypeScript),
        "tsx" => Some(SupportLang::Tsx),
        "js" | "mjs" | "cjs" => Some(SupportLang::JavaScript),
        "py" => Some(SupportLang::Python),
        "go" => Some(SupportLang::Go),
        "java" => Some(SupportLang::Java),
        "c" | "h" => Some(SupportLang::C),
        "cpp" | "cc" | "cxx" | "hpp" => Some(SupportLang::Cpp),
        "rb" => Some(SupportLang::Ruby),
        "swift" => Some(SupportLang::Swift),
        "kt" | "kts" => Some(SupportLang::Kotlin),
        "cs" => Some(SupportLang::CSharp),
        "json" => Some(SupportLang::Json),
        "yaml" | "yml" => Some(SupportLang::Yaml),
        "html" => Some(SupportLang::Html),
        "css" => Some(SupportLang::Css),
        _ => None,
    }
}

/// Parse a language string into SupportLang.
fn parse_lang(s: &str) -> anyhow::Result<SupportLang> {
    s.to_lowercase()
        .parse::<SupportLang>()
        .or_else(|_| match s.to_lowercase().as_str() {
            "rs" | "rust" => Ok(SupportLang::Rust),
            "ts" | "typescript" => Ok(SupportLang::TypeScript),
            "tsx" => Ok(SupportLang::Tsx),
            "js" | "javascript" => Ok(SupportLang::JavaScript),
            "py" | "python" => Ok(SupportLang::Python),
            "go" | "golang" => Ok(SupportLang::Go),
            "rb" | "ruby" => Ok(SupportLang::Ruby),
            "cpp" | "c++" => Ok(SupportLang::Cpp),
            _ => Err(anyhow::anyhow!("Unsupported language: {s}")),
        })
}

/// Collect source files under `root` matching a language, respecting config limits.
fn collect_files(
    config: &CodeAnalysisConfig,
    lang: SupportLang,
    subpath: Option<&str>,
) -> Vec<PathBuf> {
    let base = match subpath {
        Some(p) => config.root_path.join(p),
        None => config.root_path.clone(),
    };

    WalkDir::new(&base)
        .into_iter()
        .filter_entry(|e| {
            // Don't filter the root entry itself.
            if e.depth() == 0 {
                return true;
            }
            let name = e.file_name().to_string_lossy();
            // Skip hidden directories and common non-source dirs.
            !name.starts_with('.')
                && name != "node_modules"
                && name != "target"
                && name != "dist"
                && name != "build"
                && name != "__pycache__"
        })
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(move |e| {
            let ext = e.path().extension().and_then(|s| s.to_str()).unwrap_or("");
            lang_from_extension(ext) == Some(lang)
        })
        .filter(|e| {
            e.metadata()
                .map(|m| m.len() as usize <= config.max_file_size)
                .unwrap_or(false)
        })
        .map(|e| e.into_path())
        .collect()
}

// ─── SearchPattern ──────────────────────────────────────────────────────────

pub struct SearchPattern {
    config: CodeAnalysisConfig,
}

impl SearchPattern {
    pub fn new(config: CodeAnalysisConfig) -> Self {
        Self { config }
    }
}

#[derive(Deserialize)]
struct SearchPatternArgs {
    pattern: String,
    language: String,
    path: Option<String>,
    code: Option<String>,
}

#[async_trait]
impl Tool for SearchPattern {
    fn name(&self) -> &str {
        "search_pattern"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Structural code search using ast-grep patterns. Search for code \
                structures across files in a directory, or in a provided code snippet. \
                Uses tree-sitter AST matching — far more precise than regex.\n\n\
                Pattern syntax examples:\n\
                - `fn $FNAME($$$ARGS) -> Result<$RET>` — find Rust functions returning Result\n\
                - `console.log($$$ARGS)` — find console.log calls in JS/TS\n\
                - `if ($COND) { $$$BODY }` — find if statements\n\
                - `$VAR` matches a single AST node, `$$$VAR` matches zero or more nodes"
                .into(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "pattern": {
                        "type": "string",
                        "description": "ast-grep pattern. Use $VAR for single node, $$$VAR for variadic."
                    },
                    "language": {
                        "type": "string",
                        "description": "Programming language: rust, typescript, tsx, javascript, python, go, etc."
                    },
                    "path": {
                        "type": "string",
                        "description": "Subdirectory to search (relative to project root). Omit to search entire project."
                    },
                    "code": {
                        "type": "string",
                        "description": "Inline source code to search instead of files. If provided, path is ignored."
                    }
                },
                "required": ["pattern", "language"]
            }),
        }
    }

    async fn call_json(&self, args: Value) -> Result<String, String> {
        let args: SearchPatternArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
        let lang = parse_lang(&args.language).map_err(|e| e.to_string())?;

        // If inline code is provided, search that directly.
        if let Some(code) = &args.code {
            let matches = source::search_pattern(lang, code, &args.pattern);
            return serde_json::to_string_pretty(&json!({
                "source": "inline",
                "language": args.language,
                "pattern": args.pattern,
                "match_count": matches.len(),
                "matches": matches,
            })).map_err(|e| e.to_string());
        }

        // Otherwise walk files.
        let files = collect_files(&self.config, lang, args.path.as_deref());
        let mut all_matches = Vec::new();
        let mut files_searched = 0;

        for file_path in &files {
            let content = match fs::read_to_string(file_path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            files_searched += 1;
            let matches = source::search_pattern(lang, &content, &args.pattern);
            let rel_path = file_path
                .strip_prefix(&self.config.root_path)
                .unwrap_or(file_path)
                .display()
                .to_string();

            for m in matches {
                all_matches.push(json!({
                    "file": rel_path,
                    "start_line": m.start_line + 1,
                    "end_line": m.end_line + 1,
                    "text": m.text,
                    "bindings": m.bindings.into_iter()
                        .map(|(k, v)| json!({"name": k, "value": v}))
                        .collect::<Vec<_>>(),
                }));
                if all_matches.len() >= self.config.max_matches {
                    break;
                }
            }
            if all_matches.len() >= self.config.max_matches {
                break;
            }
        }

        let truncated = all_matches.len() >= self.config.max_matches;
        serde_json::to_string_pretty(&json!({
            "source": "files",
            "language": args.language,
            "pattern": args.pattern,
            "files_searched": files_searched,
            "match_count": all_matches.len(),
            "truncated": truncated,
            "matches": all_matches,
        })).map_err(|e| e.to_string())
    }
}

// ─── AnalyzeStructure ───────────────────────────────────────────────────────

pub struct AnalyzeStructure {
    config: CodeAnalysisConfig,
}

impl AnalyzeStructure {
    pub fn new(config: CodeAnalysisConfig) -> Self {
        Self { config }
    }
}

#[derive(Deserialize)]
struct AnalyzeStructureArgs {
    language: String,
    path: Option<String>,
    code: Option<String>,
}

#[async_trait]
impl Tool for AnalyzeStructure {
    fn name(&self) -> &str {
        "analyze_structure"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Analyze the structural layout of source code: list functions, \
                structs/classes, traits/interfaces, impl blocks, type aliases. Works on \
                a directory of files or inline code. Returns item kind, name, and line numbers."
                .into(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "description": "Programming language: rust, typescript, tsx, javascript, python, go"
                    },
                    "path": {
                        "type": "string",
                        "description": "Subdirectory to analyze (relative to project root). Omit to analyze entire project."
                    },
                    "code": {
                        "type": "string",
                        "description": "Inline source code to analyze instead of files."
                    }
                },
                "required": ["language"]
            }),
        }
    }

    async fn call_json(&self, args: Value) -> Result<String, String> {
        let args: AnalyzeStructureArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
        let lang = parse_lang(&args.language).map_err(|e| e.to_string())?;

        if let Some(code) = &args.code {
            let items = source::analyze_structure(lang, code);
            return serde_json::to_string_pretty(&json!({
                "source": "inline",
                "language": args.language,
                "items": items,
            })).map_err(|e| e.to_string());
        }

        let files = collect_files(&self.config, lang, args.path.as_deref());
        let mut file_results = Vec::new();
        let mut total_items = 0;

        for file_path in &files {
            let content = match fs::read_to_string(file_path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let items = source::analyze_structure(lang, &content);
            if items.is_empty() {
                continue;
            }
            total_items += items.len();
            let rel_path = file_path
                .strip_prefix(&self.config.root_path)
                .unwrap_or(file_path)
                .display()
                .to_string();
            file_results.push(json!({
                "file": rel_path,
                "items": items,
            }));
            if total_items >= self.config.max_matches {
                break;
            }
        }

        serde_json::to_string_pretty(&json!({
            "source": "files",
            "language": args.language,
            "files_analyzed": file_results.len(),
            "total_items": total_items,
            "files": file_results,
        })).map_err(|e| e.to_string())
    }
}

// ─── FindAntiPatterns ───────────────────────────────────────────────────────

pub struct FindAntiPatterns {
    config: CodeAnalysisConfig,
}

impl FindAntiPatterns {
    pub fn new(config: CodeAnalysisConfig) -> Self {
        Self { config }
    }
}

#[derive(Deserialize)]
struct FindAntiPatternsArgs {
    language: String,
    category: String,
    path: Option<String>,
    code: Option<String>,
}

#[async_trait]
impl Tool for FindAntiPatterns {
    fn name(&self) -> &str {
        "find_anti_patterns"
    }

    fn definition(&self) -> ToolDefinition {
        ToolDefinition {
            name: self.name().into(),
            description: "Detect curated anti-patterns in source code. You don't need to \
                know ast-grep syntax — just specify language and category.\n\n\
                Available categories by language:\n\
                - Rust: \"unwrap_usage\", \"error_handling\", \"unsafe\"\n\
                - TypeScript/TSX: \"error_handling\", \"console\"\n\n\
                Returns violations with file, line, matched text, rule name, and description."
                .into(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "language": {
                        "type": "string",
                        "description": "Programming language: rust, typescript, tsx"
                    },
                    "category": {
                        "type": "string",
                        "description": "Anti-pattern category. Rust: unwrap_usage, error_handling, unsafe. TS/TSX: error_handling, console."
                    },
                    "path": {
                        "type": "string",
                        "description": "Subdirectory to scan (relative to project root). Omit to scan entire project."
                    },
                    "code": {
                        "type": "string",
                        "description": "Inline source code to scan instead of files."
                    }
                },
                "required": ["language", "category"]
            }),
        }
    }

    async fn call_json(&self, args: Value) -> Result<String, String> {
        let args: FindAntiPatternsArgs = serde_json::from_value(args).map_err(|e| e.to_string())?;
        let lang = parse_lang(&args.language).map_err(|e| e.to_string())?;

        if let Some(code) = &args.code {
            let violations = source::find_anti_patterns(lang, code, &args.category);
            return serde_json::to_string_pretty(&json!({
                "source": "inline",
                "language": args.language,
                "category": args.category,
                "violation_count": violations.len(),
                "violations": violations,
            })).map_err(|e| e.to_string());
        }

        let files = collect_files(&self.config, lang, args.path.as_deref());
        let mut all_violations = Vec::new();
        let mut files_scanned = 0;

        for file_path in &files {
            let content = match fs::read_to_string(file_path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            files_scanned += 1;
            let violations = source::find_anti_patterns(lang, &content, &args.category);
            let rel_path = file_path
                .strip_prefix(&self.config.root_path)
                .unwrap_or(file_path)
                .display()
                .to_string();

            for v in violations {
                all_violations.push(json!({
                    "file": rel_path,
                    "rule": v.rule_name,
                    "description": v.description,
                    "start_line": v.start_line + 1,
                    "end_line": v.end_line + 1,
                    "text": v.text,
                }));
                if all_violations.len() >= self.config.max_matches {
                    break;
                }
            }
            if all_violations.len() >= self.config.max_matches {
                break;
            }
        }

        let truncated = all_violations.len() >= self.config.max_matches;
        serde_json::to_string_pretty(&json!({
            "source": "files",
            "language": args.language,
            "category": args.category,
            "files_scanned": files_scanned,
            "violation_count": all_violations.len(),
            "truncated": truncated,
            "violations": all_violations,
        })).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::agent::Tool;
    use std::io::Write as _;
    use tempfile::TempDir;

    fn test_config(root: PathBuf) -> CodeAnalysisConfig {
        CodeAnalysisConfig {
            root_path: root,
            max_file_size: 100 * 1024,
            max_matches: 50,
            allowed_languages: None,
        }
    }

    // ─── parse_lang ────────────────────────────────────────────────────────

    #[test]
    fn test_parse_lang_aliases() {
        assert_eq!(parse_lang("rust").unwrap(), SupportLang::Rust);
        assert_eq!(parse_lang("rs").unwrap(), SupportLang::Rust);
        assert_eq!(parse_lang("Rust").unwrap(), SupportLang::Rust);
        assert_eq!(parse_lang("typescript").unwrap(), SupportLang::TypeScript);
        assert_eq!(parse_lang("ts").unwrap(), SupportLang::TypeScript);
        assert_eq!(parse_lang("python").unwrap(), SupportLang::Python);
        assert_eq!(parse_lang("py").unwrap(), SupportLang::Python);
        assert_eq!(parse_lang("golang").unwrap(), SupportLang::Go);
        assert_eq!(parse_lang("cpp").unwrap(), SupportLang::Cpp);
        assert_eq!(parse_lang("c++").unwrap(), SupportLang::Cpp);
    }

    #[test]
    fn test_parse_lang_unsupported() {
        assert!(parse_lang("brainfuck").is_err());
    }

    // ─── lang_from_extension ───────────────────────────────────────────────

    #[test]
    fn test_lang_from_extension_mapping() {
        assert_eq!(lang_from_extension("rs"), Some(SupportLang::Rust));
        assert_eq!(lang_from_extension("ts"), Some(SupportLang::TypeScript));
        assert_eq!(lang_from_extension("tsx"), Some(SupportLang::Tsx));
        assert_eq!(lang_from_extension("js"), Some(SupportLang::JavaScript));
        assert_eq!(lang_from_extension("mjs"), Some(SupportLang::JavaScript));
        assert_eq!(lang_from_extension("py"), Some(SupportLang::Python));
        assert_eq!(lang_from_extension("go"), Some(SupportLang::Go));
        assert_eq!(lang_from_extension("rb"), Some(SupportLang::Ruby));
        assert_eq!(lang_from_extension("xyz"), None);
    }

    // ─── collect_files ─────────────────────────────────────────────────────

    fn create_temp_project() -> TempDir {
        let dir = TempDir::new().unwrap();
        let root = dir.path();

        fs::write(root.join("main.rs"), "fn main() {}\nfn run() {}").unwrap();
        fs::write(root.join("lib.rs"), "fn helper() {}").unwrap();

        fs::create_dir_all(root.join("src")).unwrap();
        fs::write(root.join("src/module.rs"), "struct Foo { x: i32 }\nfn module_fn() {}").unwrap();

        fs::write(root.join("readme.txt"), "not code").unwrap();

        fs::create_dir_all(root.join(".hidden")).unwrap();
        fs::write(root.join(".hidden/secret.rs"), "fn secret() {}").unwrap();

        fs::create_dir_all(root.join("node_modules")).unwrap();
        fs::write(root.join("node_modules/dep.rs"), "fn dep() {}").unwrap();

        dir
    }

    #[test]
    fn test_collect_files_finds_rust_files() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let files = collect_files(&config, SupportLang::Rust, None);
        assert_eq!(files.len(), 3); // main.rs, lib.rs, src/module.rs
    }

    #[test]
    fn test_collect_files_skips_hidden_and_node_modules() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let files = collect_files(&config, SupportLang::Rust, None);
        let paths: Vec<String> = files.iter().map(|p| p.display().to_string()).collect();
        assert!(!paths.iter().any(|p| p.contains(".hidden")));
        assert!(!paths.iter().any(|p| p.contains("node_modules")));
    }

    #[test]
    fn test_collect_files_respects_subpath() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let files = collect_files(&config, SupportLang::Rust, Some("src"));
        assert_eq!(files.len(), 1);
    }

    #[test]
    fn test_collect_files_skips_large_files() {
        let dir = TempDir::new().unwrap();
        let big_file = dir.path().join("big.rs");
        {
            let mut f = fs::File::create(&big_file).unwrap();
            let line = "fn a() { let x = 1; }\n";
            for _ in 0..5000 {
                f.write_all(line.as_bytes()).unwrap();
            }
        }
        fs::write(dir.path().join("small.rs"), "fn small() {}").unwrap();

        let config = test_config(dir.path().to_path_buf());
        let files = collect_files(&config, SupportLang::Rust, None);
        assert_eq!(files.len(), 1);
    }

    // ─── SearchPattern tool ────────────────────────────────────────────────

    #[tokio::test]
    async fn test_search_pattern_tool_inline_code() {
        let tool = SearchPattern::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "pattern": "fn $FNAME($$$ARGS) $$$BODY",
                "language": "rust",
                "code": "fn hello() {}\nfn world(x: i32) { x }"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "inline");
        assert_eq!(parsed["match_count"], 2);
        assert_eq!(parsed["matches"].as_array().unwrap().len(), 2);
    }

    #[tokio::test]
    async fn test_search_pattern_tool_walks_files() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let tool = SearchPattern::new(config);
        let result = tool
            .call_json(json!({
                "pattern": "fn $FNAME($$$ARGS) $$$BODY",
                "language": "rust",
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "files");
        // main.rs (main, run), lib.rs (helper), src/module.rs (module_fn) = 4 matches across 3 files
        assert!(parsed["files_searched"].as_u64().unwrap() >= 3);
        assert!(parsed["match_count"].as_u64().unwrap() >= 4);
    }

    #[tokio::test]
    async fn test_search_pattern_tool_respects_max_matches() {
        let dir = TempDir::new().unwrap();
        let mut code = String::new();
        for i in 0..20 {
            code.push_str(&format!("fn func_{i}() {{}}\n"));
        }
        fs::write(dir.path().join("many.rs"), &code).unwrap();

        let config = CodeAnalysisConfig {
            root_path: dir.path().to_path_buf(),
            max_file_size: 100 * 1024,
            max_matches: 5,
            allowed_languages: None,
        };
        let tool = SearchPattern::new(config);
        let result = tool
            .call_json(json!({
                "pattern": "fn $FNAME($$$ARGS) $$$BODY",
                "language": "rust",
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["match_count"], 5);
        assert_eq!(parsed["truncated"], true);
    }

    #[tokio::test]
    async fn test_search_pattern_tool_invalid_language() {
        let tool = SearchPattern::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "pattern": "fn $X()",
                "language": "brainfuck",
                "code": "fn hello() {}"
            }))
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_search_pattern_tool_with_subpath() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let tool = SearchPattern::new(config);
        let result = tool
            .call_json(json!({
                "pattern": "struct $NAME",
                "language": "rust",
                "path": "src",
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["match_count"], 1);
        let file = parsed["matches"][0]["file"].as_str().unwrap();
        assert!(file.contains("module.rs"));
    }

    // ─── AnalyzeStructure tool ─────────────────────────────────────────────

    #[tokio::test]
    async fn test_analyze_structure_tool_inline() {
        let tool = AnalyzeStructure::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "language": "rust",
                "code": "struct Point { x: f64, y: f64 }\nfn distance() {}\ntrait Shape {}\nenum Color { Red }"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "inline");
        let items = parsed["items"].as_array().unwrap();
        let kinds: Vec<&str> = items
            .iter()
            .map(|i| i["kind"].as_str().unwrap())
            .collect();
        assert!(kinds.contains(&"struct"));
        assert!(kinds.contains(&"function"));
        assert!(kinds.contains(&"trait"));
        assert!(kinds.contains(&"enum"));
    }

    #[tokio::test]
    async fn test_analyze_structure_tool_walks_files() {
        let dir = create_temp_project();
        let config = test_config(dir.path().to_path_buf());
        let tool = AnalyzeStructure::new(config);
        let result = tool
            .call_json(json!({ "language": "rust" }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "files");
        // 4 functions + 1 struct = 5 items minimum
        assert!(parsed["total_items"].as_u64().unwrap() >= 4);
    }

    #[tokio::test]
    async fn test_analyze_structure_tool_returns_names() {
        let tool = AnalyzeStructure::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "language": "rust",
                "code": "fn alpha() {}\nfn beta() {}"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        let names: Vec<&str> = parsed["items"]
            .as_array()
            .unwrap()
            .iter()
            .map(|i| i["name"].as_str().unwrap())
            .collect();
        assert!(names.contains(&"alpha"));
        assert!(names.contains(&"beta"));
    }

    // ─── FindAntiPatterns tool ─────────────────────────────────────────────

    #[tokio::test]
    async fn test_find_anti_patterns_tool_inline() {
        let tool = FindAntiPatterns::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "language": "rust",
                "category": "unwrap_usage",
                "code": "fn bad() { let v = x.unwrap(); }"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "inline");
        assert!(parsed["violation_count"].as_u64().unwrap() >= 1);
        let rule = parsed["violations"][0]["rule_name"].as_str().unwrap();
        assert_eq!(rule, "unwrap_on_result");
    }

    #[tokio::test]
    async fn test_find_anti_patterns_tool_walks_files() {
        let dir = TempDir::new().unwrap();
        fs::write(
            dir.path().join("bad.rs"),
            "fn oops() { let v = x.unwrap(); panic!(\"oh no\"); }",
        )
        .unwrap();
        fs::write(
            dir.path().join("good.rs"),
            "fn ok() -> Result<(), String> { Ok(()) }",
        )
        .unwrap();

        let config = test_config(dir.path().to_path_buf());
        let tool = FindAntiPatterns::new(config);
        let result = tool
            .call_json(json!({
                "language": "rust",
                "category": "error_handling",
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["source"], "files");
        assert!(parsed["violation_count"].as_u64().unwrap() >= 2);
        let violations = parsed["violations"].as_array().unwrap();
        let rules: Vec<&str> = violations
            .iter()
            .map(|v| v["rule"].as_str().unwrap())
            .collect();
        assert!(rules.contains(&"unwrap_on_result"));
        assert!(rules.contains(&"panic_call"));
    }

    #[tokio::test]
    async fn test_find_anti_patterns_tool_clean_code() {
        let tool = FindAntiPatterns::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "language": "rust",
                "category": "unwrap_usage",
                "code": "fn clean() -> Result<i32, String> { Ok(42) }"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["violation_count"], 0);
    }

    #[tokio::test]
    async fn test_find_anti_patterns_tool_unknown_category() {
        let tool = FindAntiPatterns::new(CodeAnalysisConfig::default());
        let result = tool
            .call_json(json!({
                "language": "rust",
                "category": "nonexistent",
                "code": "fn main() { x.unwrap(); }"
            }))
            .await
            .unwrap();

        let parsed: Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["violation_count"], 0);
    }

    // ─── Tool trait contract ───────────────────────────────────────────────

    #[test]
    fn test_tool_names_are_unique() {
        let config = CodeAnalysisConfig::default();
        let tools: Vec<Box<dyn Tool>> = vec![
            Box::new(SearchPattern::new(config.clone())),
            Box::new(AnalyzeStructure::new(config.clone())),
            Box::new(FindAntiPatterns::new(config)),
        ];
        let names: Vec<&str> = tools.iter().map(|t| t.name()).collect();
        assert_eq!(names.len(), 3);
        let mut deduped = names.clone();
        deduped.sort();
        deduped.dedup();
        assert_eq!(deduped.len(), 3);
    }

    #[test]
    fn test_tool_definitions_have_required_fields() {
        let config = CodeAnalysisConfig::default();
        for tool in [
            Box::new(SearchPattern::new(config.clone())) as Box<dyn Tool>,
            Box::new(AnalyzeStructure::new(config.clone())),
            Box::new(FindAntiPatterns::new(config)),
        ] {
            let def = tool.definition();
            assert!(!def.name.is_empty());
            assert!(!def.description.is_empty());
            assert_eq!(def.parameters["type"], "object");
            assert!(def.parameters["properties"].is_object());
            assert!(def.parameters["required"].is_array());
        }
    }
}
