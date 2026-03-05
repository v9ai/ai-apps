/// Core ast-grep wrapper: parse source, run patterns, return structured matches.
use ast_grep_core::meta_var::MetaVariable;
use ast_grep_language::{LanguageExt, SupportLang};
use serde::{Deserialize, Serialize};

/// A single pattern match in source code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMatch {
    pub text: String,
    pub start_line: usize,
    pub end_line: usize,
    /// Meta-variable bindings extracted from the pattern (e.g. `$FNAME` → `"main"`).
    pub bindings: Vec<(String, String)>,
}

/// Extract the variable name from a MetaVariable variant.
fn meta_var_name(mv: &MetaVariable) -> Option<&str> {
    match mv {
        MetaVariable::Capture(name, _) => Some(name.as_str()),
        MetaVariable::MultiCapture(name) => Some(name.as_str()),
        _ => None,
    }
}

/// Parse `source` using `lang` and find all occurrences of `pattern`.
pub fn search_pattern(
    lang: SupportLang,
    source: &str,
    pattern: &str,
) -> Vec<PatternMatch> {
    let root = lang.ast_grep(source);
    let node = root.root();

    node.find_all(pattern)
        .map(|m| {
            let start = m.start_pos();
            let end = m.end_pos();
            let env = m.get_env();

            // Extract meta-variable bindings.
            let bindings: Vec<(String, String)> = env
                .get_matched_variables()
                .filter_map(|mv| {
                    let name = meta_var_name(&mv)?;
                    let text = env.get_match(name).map(|n| n.text().to_string())
                        .or_else(|| {
                            let nodes = env.get_multiple_matches(name);
                            if nodes.is_empty() {
                                None
                            } else {
                                Some(nodes.iter().map(|n| n.text().to_string()).collect::<Vec<_>>().join(", "))
                            }
                        })?;
                    Some((name.to_string(), text))
                })
                .collect();

            PatternMatch {
                text: m.text().to_string(),
                start_line: start.line(),
                end_line: end.line(),
                bindings,
            }
        })
        .collect()
}

/// A structural item found in source code (function, struct, trait, impl, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuralItem {
    pub kind: String,
    pub name: String,
    pub start_line: usize,
    pub end_line: usize,
}

/// Per-language patterns for extracting top-level structural items.
fn structure_patterns(lang: SupportLang) -> Vec<(&'static str, &'static str)> {
    match lang {
        SupportLang::Rust => vec![
            ("function", "fn $NAME($$$ARGS) $$$BODY"),
            ("struct", "struct $NAME $$$BODY"),
            ("enum", "enum $NAME $$$BODY"),
            ("trait", "trait $NAME $$$BODY"),
            ("impl", "impl $NAME $$$BODY"),
        ],
        SupportLang::TypeScript | SupportLang::Tsx => vec![
            ("function", "function $NAME($$$ARGS) { $$$BODY }"),
            ("class", "class $NAME { $$$BODY }"),
            ("interface", "interface $NAME { $$$BODY }"),
            ("type_alias", "type $NAME = $TYPE"),
        ],
        SupportLang::JavaScript => vec![
            ("function", "function $NAME($$$ARGS) { $$$BODY }"),
            ("class", "class $NAME { $$$BODY }"),
        ],
        SupportLang::Python => vec![
            ("function", "def $NAME($$$ARGS): $$$BODY"),
            ("class", "class $NAME$$$BASES: $$$BODY"),
        ],
        SupportLang::Go => vec![
            ("function", "func $NAME($$$ARGS) $$$BODY"),
            ("struct", "type $NAME struct $$$BODY"),
            ("interface", "type $NAME interface $$$BODY"),
        ],
        _ => vec![],
    }
}

/// Extract structural items (functions, structs, traits, etc.) from source code.
pub fn analyze_structure(lang: SupportLang, source: &str) -> Vec<StructuralItem> {
    let root = lang.ast_grep(source);
    let node = root.root();

    let mut items = Vec::new();
    for (kind, pattern) in structure_patterns(lang) {
        for m in node.find_all(pattern) {
            let env = m.get_env();
            let name = env
                .get_match("NAME")
                .map(|n| n.text().to_string())
                .unwrap_or_else(|| "<anonymous>".into());
            let start = m.start_pos();
            let end = m.end_pos();
            items.push(StructuralItem {
                kind: kind.into(),
                name,
                start_line: start.line(),
                end_line: end.line(),
            });
        }
    }
    items.sort_by_key(|i| i.start_line);
    items
}

/// A curated anti-pattern rule.
pub struct AntiPatternRule {
    pub name: &'static str,
    pub pattern: &'static str,
    pub description: &'static str,
}

/// Get curated anti-pattern rules for a language + category.
pub fn anti_pattern_rules(lang: SupportLang, category: &str) -> Vec<AntiPatternRule> {
    match (lang, category) {
        (SupportLang::Rust, "unwrap_usage") => vec![
            AntiPatternRule {
                name: "unwrap_on_result",
                pattern: "$EXPR.unwrap()",
                description: "Direct .unwrap() on Result — prefer ? or explicit error handling",
            },
            AntiPatternRule {
                name: "expect_usage",
                pattern: "$EXPR.expect($MSG)",
                description: ".expect() usage — acceptable for invariants, risky in library code",
            },
        ],
        (SupportLang::Rust, "error_handling") => vec![
            AntiPatternRule {
                name: "unwrap_on_result",
                pattern: "$EXPR.unwrap()",
                description: "Direct .unwrap() — prefer ? operator or match",
            },
            AntiPatternRule {
                name: "panic_call",
                pattern: "panic!($$$ARGS)",
                description: "Explicit panic — ensure this is intentional",
            },
            AntiPatternRule {
                name: "todo_macro",
                pattern: "todo!($$$ARGS)",
                description: "todo!() left in code — unfinished implementation",
            },
        ],
        (SupportLang::Rust, "unsafe") => vec![
            AntiPatternRule {
                name: "unsafe_block",
                pattern: "unsafe { $$$BODY }",
                description: "Unsafe block — verify safety invariants are documented",
            },
        ],
        (SupportLang::TypeScript | SupportLang::Tsx, "error_handling") => vec![
            AntiPatternRule {
                name: "empty_catch",
                pattern: "catch ($ERR) {}",
                description: "Empty catch block — errors are silently swallowed",
            },
            AntiPatternRule {
                name: "any_type",
                pattern: ": any",
                description: "Explicit `any` type — reduces type safety",
            },
        ],
        (SupportLang::TypeScript | SupportLang::Tsx, "console") => vec![
            AntiPatternRule {
                name: "console_log",
                pattern: "console.log($$$ARGS)",
                description: "console.log left in code — use a proper logger",
            },
            AntiPatternRule {
                name: "console_error",
                pattern: "console.error($$$ARGS)",
                description: "console.error — consider structured error handling",
            },
        ],
        _ => vec![],
    }
}

/// A single anti-pattern violation found in source.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Violation {
    pub rule_name: String,
    pub description: String,
    pub text: String,
    pub start_line: usize,
    pub end_line: usize,
}

/// Run anti-pattern detection on source code.
pub fn find_anti_patterns(
    lang: SupportLang,
    source: &str,
    category: &str,
) -> Vec<Violation> {
    let rules = anti_pattern_rules(lang, category);
    if rules.is_empty() {
        return vec![];
    }

    let root = lang.ast_grep(source);
    let node = root.root();
    let mut violations = Vec::new();

    for rule in &rules {
        for m in node.find_all(rule.pattern) {
            let start = m.start_pos();
            let end = m.end_pos();
            violations.push(Violation {
                rule_name: rule.name.into(),
                description: rule.description.into(),
                text: m.text().to_string(),
                start_line: start.line(),
                end_line: end.line(),
            });
        }
    }
    violations.sort_by_key(|v| v.start_line);
    violations
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_search_pattern_rust_function() {
        let source = r#"
fn main() {
    println!("hello");
}

fn helper(x: i32) -> i32 {
    x + 1
}
"#;
        let matches = search_pattern(SupportLang::Rust, source, "fn $FNAME($$$ARGS) $$$BODY");
        assert_eq!(matches.len(), 2);
        let names: Vec<String> = matches
            .iter()
            .flat_map(|m| m.bindings.iter())
            .filter(|(k, _)| k == "FNAME")
            .map(|(_, v)| v.clone())
            .collect();
        assert!(names.contains(&"main".to_string()));
        assert!(names.contains(&"helper".to_string()));
    }

    #[test]
    fn test_analyze_structure_rust() {
        let source = r#"
struct Foo {
    x: i32,
}

fn bar() {}

trait Baz {
    fn qux(&self);
}
"#;
        let items = analyze_structure(SupportLang::Rust, source);
        let kinds: Vec<&str> = items.iter().map(|i| i.kind.as_str()).collect();
        assert!(kinds.contains(&"struct"));
        assert!(kinds.contains(&"function"));
        assert!(kinds.contains(&"trait"));
    }

    #[test]
    fn test_find_anti_patterns_unwrap() {
        let source = r#"
fn main() {
    let x: Result<i32, String> = Ok(42);
    let val = x.unwrap();
    let y = some_fn().expect("should work");
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unwrap_usage");
        assert!(violations.len() >= 1);
        assert!(violations.iter().any(|v| v.rule_name == "unwrap_on_result"));
    }

    #[test]
    fn test_search_pattern_typescript() {
        let source = r#"
function greet(name: string) {
    return name;
}

function add(a: number, b: number) {
    return a + b;
}
"#;
        let matches = search_pattern(
            SupportLang::TypeScript,
            source,
            "function $FNAME($$$ARGS) { $$$BODY }",
        );
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn test_search_pattern_no_matches() {
        let source = "fn main() {}";
        let matches = search_pattern(SupportLang::Rust, source, "struct $NAME $$$BODY");
        assert!(matches.is_empty());
    }

    #[test]
    fn test_search_pattern_empty_source() {
        let matches = search_pattern(SupportLang::Rust, "", "fn $NAME($$$ARGS) $$$BODY");
        assert!(matches.is_empty());
    }

    #[test]
    fn test_search_pattern_line_numbers() {
        let source = "fn first() {}\nfn second() {}\nfn third() {}\n";
        let matches = search_pattern(SupportLang::Rust, source, "fn $NAME($$$ARGS) $$$BODY");
        assert_eq!(matches.len(), 3);
        // Lines are zero-based.
        assert_eq!(matches[0].start_line, 0);
        assert_eq!(matches[1].start_line, 1);
        assert_eq!(matches[2].start_line, 2);
    }

    #[test]
    fn test_search_pattern_method_call() {
        let source = r#"
fn example() {
    let a = vec![1, 2, 3];
    let b = a.iter().map(|x| x + 1).collect::<Vec<_>>();
    let c = a.iter().filter(|x| **x > 1).collect::<Vec<_>>();
}
"#;
        let matches = search_pattern(SupportLang::Rust, source, "$EXPR.iter()");
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn test_analyze_structure_rust_enum_and_impl() {
        let source = r#"
enum Color {
    Red,
    Green,
    Blue,
}

impl Color {
    fn is_warm(&self) -> bool {
        matches!(self, Color::Red)
    }
}
"#;
        let items = analyze_structure(SupportLang::Rust, source);
        let names: Vec<&str> = items.iter().map(|i| i.name.as_str()).collect();
        assert!(names.contains(&"Color"));
        let kinds: Vec<&str> = items.iter().map(|i| i.kind.as_str()).collect();
        assert!(kinds.contains(&"enum"));
        assert!(kinds.contains(&"impl"));
        assert!(kinds.contains(&"function"));
    }

    #[test]
    fn test_analyze_structure_empty_source() {
        let items = analyze_structure(SupportLang::Rust, "");
        assert!(items.is_empty());
    }

    #[test]
    fn test_analyze_structure_sorted_by_line() {
        let source = "fn z() {}\nstruct A { }\nfn a() {}\n";
        let items = analyze_structure(SupportLang::Rust, source);
        for pair in items.windows(2) {
            assert!(pair[0].start_line <= pair[1].start_line);
        }
    }

    #[test]
    fn test_analyze_structure_go() {
        let source = r#"
package main

func main() {
    fmt.Println("hello")
}

func helper(x int) int {
    return x + 1
}
"#;
        let items = analyze_structure(SupportLang::Go, source);
        assert!(items.len() >= 2);
        assert!(items.iter().all(|i| i.kind == "function"));
    }

    #[test]
    fn test_find_anti_patterns_error_handling_category() {
        let source = r#"
fn risky() {
    let x = dangerous().unwrap();
    panic!("oh no");
    todo!("implement later");
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "error_handling");
        let rules: Vec<&str> = violations.iter().map(|v| v.rule_name.as_str()).collect();
        assert!(rules.contains(&"unwrap_on_result"));
        assert!(rules.contains(&"panic_call"));
        assert!(rules.contains(&"todo_macro"));
    }

    #[test]
    fn test_find_anti_patterns_unsafe_blocks() {
        let source = r#"
fn safe() {}

fn danger() {
    unsafe { std::ptr::null::<i32>().read() };
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unsafe");
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].rule_name, "unsafe_block");
    }

    #[test]
    fn test_find_anti_patterns_unknown_category_returns_empty() {
        let source = "fn main() { let x = foo().unwrap(); }";
        let violations = find_anti_patterns(SupportLang::Rust, source, "nonexistent_category");
        assert!(violations.is_empty());
    }

    #[test]
    fn test_find_anti_patterns_clean_code_no_violations() {
        let source = r#"
fn clean() -> Result<i32, String> {
    let x = maybe_fail()?;
    Ok(x + 1)
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unwrap_usage");
        assert!(violations.is_empty());
    }

    #[test]
    fn test_find_anti_patterns_ts_console() {
        let source = r#"
function debug() {
    console.log("debug info");
    console.error("something failed");
}
"#;
        let violations = find_anti_patterns(SupportLang::TypeScript, source, "console");
        assert_eq!(violations.len(), 2);
        let rules: Vec<&str> = violations.iter().map(|v| v.rule_name.as_str()).collect();
        assert!(rules.contains(&"console_log"));
        assert!(rules.contains(&"console_error"));
    }

    #[test]
    fn test_find_anti_patterns_violations_sorted_by_line() {
        let source = r#"
fn a() { let _ = x.unwrap(); }
fn b() { let _ = y.unwrap(); }
fn c() { let _ = z.unwrap(); }
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unwrap_usage");
        for pair in violations.windows(2) {
            assert!(pair[0].start_line <= pair[1].start_line);
        }
    }
}
