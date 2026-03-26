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

/// Classification of a structural item for finer-grained analysis.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ItemClassification {
    /// A free-standing function (not inside an impl block).
    Function,
    /// A method inside an impl block or class.
    Method,
    /// A trait implementation block (e.g. `impl Trait for Type`).
    TraitImpl,
    /// A plain impl block (inherent impl).
    InherentImpl,
    /// A struct or class definition.
    Struct,
    /// An enum definition.
    Enum,
    /// A trait or interface definition.
    Trait,
    /// A type alias.
    TypeAlias,
    /// Anything else (module, const, static, etc.).
    Other,
}

/// A structural item found in source code (function, struct, trait, impl, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructuralItem {
    pub kind: String,
    pub name: String,
    pub start_line: usize,
    pub end_line: usize,
    /// Finer-grained classification for programmatic use.
    pub classification: ItemClassification,
    /// Number of source lines the item spans.
    pub line_count: usize,
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
            ("type_alias", "type $NAME = $TYPE;"),
            ("const", "const $NAME: $TYPE = $VAL;"),
            ("static", "static $NAME: $TYPE = $VAL;"),
            ("mod", "mod $NAME $$$BODY"),
        ],
        SupportLang::TypeScript | SupportLang::Tsx => vec![
            ("function", "function $NAME($$$ARGS) { $$$BODY }"),
            ("class", "class $NAME { $$$BODY }"),
            ("interface", "interface $NAME { $$$BODY }"),
            ("type_alias", "type $NAME = $TYPE"),
            ("enum", "enum $NAME { $$$BODY }"),
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
        SupportLang::Java => vec![
            ("class", "class $NAME { $$$BODY }"),
            ("interface", "interface $NAME { $$$BODY }"),
            ("enum", "enum $NAME { $$$BODY }"),
        ],
        SupportLang::Ruby => vec![
            ("function", "def $NAME($$$ARGS) $$$BODY end"),
            ("class", "class $NAME $$$BODY end"),
            ("mod", "module $NAME $$$BODY end"),
        ],
        SupportLang::Kotlin => vec![
            ("function", "fun $NAME($$$ARGS) { $$$BODY }"),
            ("class", "class $NAME $$$BODY"),
            ("interface", "interface $NAME $$$BODY"),
            ("enum", "enum class $NAME $$$BODY"),
        ],
        SupportLang::CSharp => vec![
            ("class", "class $NAME { $$$BODY }"),
            ("interface", "interface $NAME { $$$BODY }"),
            ("enum", "enum $NAME { $$$BODY }"),
            ("struct", "struct $NAME { $$$BODY }"),
        ],
        SupportLang::Swift => vec![
            ("function", "func $NAME($$$ARGS) $$$BODY"),
            ("class", "class $NAME { $$$BODY }"),
            ("struct", "struct $NAME { $$$BODY }"),
            ("enum", "enum $NAME { $$$BODY }"),
            ("protocol", "protocol $NAME { $$$BODY }"),
        ],
        _ => vec![],
    }
}

/// Map a structural `kind` string to its `ItemClassification`.
fn classify_item(kind: &str, name: &str) -> ItemClassification {
    match kind {
        "function" => ItemClassification::Function,
        "method" => ItemClassification::Method,
        "struct" | "class" => ItemClassification::Struct,
        "enum" => ItemClassification::Enum,
        "trait" | "interface" | "protocol" => ItemClassification::Trait,
        "type_alias" => ItemClassification::TypeAlias,
        "impl" => {
            // Heuristic: if the name contains " for " it is likely a trait impl
            if name.contains(" for ") || name.contains("for ") {
                ItemClassification::TraitImpl
            } else {
                ItemClassification::InherentImpl
            }
        }
        _ => ItemClassification::Other,
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
            let classification = classify_item(kind, &name);
            let line_count = end.line().saturating_sub(start.line()) + 1;
            items.push(StructuralItem {
                kind: kind.into(),
                name,
                start_line: start.line(),
                end_line: end.line(),
                classification,
                line_count,
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
        // ── Rust ──────────────────────────────────────────────────────
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
            AntiPatternRule {
                name: "unimplemented_macro",
                pattern: "unimplemented!($$$ARGS)",
                description: "unimplemented!() left in code — placeholder implementation",
            },
            AntiPatternRule {
                name: "unreachable_macro",
                pattern: "unreachable!($$$ARGS)",
                description: "unreachable!() — verify this branch is truly unreachable",
            },
        ],
        (SupportLang::Rust, "unsafe") => vec![
            AntiPatternRule {
                name: "unsafe_block",
                pattern: "unsafe { $$$BODY }",
                description: "Unsafe block — verify safety invariants are documented",
            },
            AntiPatternRule {
                name: "unsafe_fn",
                pattern: "unsafe fn $NAME($$$ARGS) $$$BODY",
                description: "Unsafe function — callers must uphold safety invariants",
            },
        ],
        (SupportLang::Rust, "complexity") => vec![
            AntiPatternRule {
                name: "deep_nesting_4",
                pattern: "if $A { if $B { if $C { if $D { $$$BODY } } } }",
                description: "4+ levels of nested conditionals — consider early returns or extracting helpers",
            },
            AntiPatternRule {
                name: "nested_match_in_match",
                pattern: "match $A { $$$OUTER => match $B { $$$INNER } }",
                description: "Nested match inside match — consider extracting inner match to a function",
            },
        ],
        (SupportLang::Rust, "unused") => vec![
            AntiPatternRule {
                name: "unused_variable",
                pattern: "let _$NAME = $EXPR;",
                description: "Variable prefixed with _ — may indicate unused binding or forgotten cleanup",
            },
            AntiPatternRule {
                name: "allow_unused",
                pattern: "#[allow(dead_code)]",
                description: "#[allow(dead_code)] — potential unused code being suppressed",
            },
            AntiPatternRule {
                name: "allow_unused_variables",
                pattern: "#[allow(unused_variables)]",
                description: "#[allow(unused_variables)] — suppressed unused variable warnings",
            },
            AntiPatternRule {
                name: "allow_unused_imports",
                pattern: "#[allow(unused_imports)]",
                description: "#[allow(unused_imports)] — suppressed unused import warnings",
            },
        ],
        (SupportLang::Rust, "clone") => vec![
            AntiPatternRule {
                name: "clone_call",
                pattern: "$EXPR.clone()",
                description: ".clone() call — verify this is necessary and not hiding ownership issues",
            },
            AntiPatternRule {
                name: "to_owned_call",
                pattern: "$EXPR.to_owned()",
                description: ".to_owned() call — consider if borrowing is sufficient",
            },
        ],

        // ── TypeScript / TSX ─────────────────────────────────────────
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
            AntiPatternRule {
                name: "non_null_assertion",
                pattern: "$EXPR!",
                description: "Non-null assertion operator — prefer explicit null checks",
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
            AntiPatternRule {
                name: "console_warn",
                pattern: "console.warn($$$ARGS)",
                description: "console.warn — consider structured logging",
            },
        ],
        (SupportLang::TypeScript | SupportLang::Tsx, "complexity") => vec![
            AntiPatternRule {
                name: "deep_nesting_4",
                pattern: "if ($A) { if ($B) { if ($C) { if ($D) { $$$BODY } } } }",
                description: "4+ levels of nested conditionals — consider early returns or extracting helpers",
            },
        ],
        (SupportLang::TypeScript | SupportLang::Tsx, "deprecated") => vec![
            AntiPatternRule {
                name: "var_declaration",
                pattern: "var $NAME = $VAL",
                description: "`var` declaration — use `let` or `const` instead",
            },
        ],

        // ── JavaScript ───────────────────────────────────────────────
        (SupportLang::JavaScript, "error_handling") => vec![
            AntiPatternRule {
                name: "empty_catch",
                pattern: "catch ($ERR) {}",
                description: "Empty catch block — errors are silently swallowed",
            },
        ],
        (SupportLang::JavaScript, "console") => vec![
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
        (SupportLang::JavaScript, "deprecated") => vec![
            AntiPatternRule {
                name: "var_declaration",
                pattern: "var $NAME = $VAL",
                description: "`var` declaration — use `let` or `const` instead",
            },
        ],

        // ── Python ───────────────────────────────────────────────────
        (SupportLang::Python, "complexity") => vec![
            AntiPatternRule {
                name: "deep_nesting_4",
                pattern: "if $A: if $B: if $C: if $D: $$$BODY",
                description: "4+ levels of nested conditionals — consider early returns or extracting helpers",
            },
        ],

        // ── Go ───────────────────────────────────────────────────────
        (SupportLang::Go, "error_handling") => vec![
            AntiPatternRule {
                name: "panic_call",
                pattern: "panic($$$ARGS)",
                description: "panic() call — use error returns instead in library code",
            },
        ],

        _ => vec![],
    }
}

/// List all available anti-pattern categories for a given language.
pub fn available_categories(lang: SupportLang) -> Vec<&'static str> {
    match lang {
        SupportLang::Rust => vec![
            "unwrap_usage", "error_handling", "unsafe", "complexity", "unused", "clone",
        ],
        SupportLang::TypeScript | SupportLang::Tsx => vec![
            "error_handling", "console", "complexity", "deprecated",
        ],
        SupportLang::JavaScript => vec![
            "error_handling", "console", "deprecated",
        ],
        SupportLang::Python => vec![
            "complexity",
        ],
        SupportLang::Go => vec![
            "error_handling",
        ],
        _ => vec![],
    }
}

/// Detect functions that exceed a given line threshold.
///
/// This is a heuristic check based on `analyze_structure` — it finds
/// structural items classified as functions and flags those that exceed
/// `max_lines`.
pub fn find_long_functions(
    lang: SupportLang,
    source: &str,
    max_lines: usize,
) -> Vec<Violation> {
    let items = analyze_structure(lang, source);
    items
        .into_iter()
        .filter(|item| item.classification == ItemClassification::Function && item.line_count > max_lines)
        .map(|item| Violation {
            rule_name: "long_function".into(),
            description: format!(
                "Function `{}` is {} lines long (threshold: {max_lines}) — consider breaking it up",
                item.name, item.line_count
            ),
            text: item.name,
            start_line: item.start_line,
            end_line: item.end_line,
        })
        .collect()
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

    // ─── ItemClassification ───────────────────────────────────────────

    #[test]
    fn test_classification_function() {
        let source = "fn standalone() {}\n";
        let items = analyze_structure(SupportLang::Rust, source);
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].classification, ItemClassification::Function);
    }

    #[test]
    fn test_classification_struct_enum_trait() {
        let source = r#"
struct Foo {}
enum Bar { A }
trait Baz {}
"#;
        let items = analyze_structure(SupportLang::Rust, source);
        let classifications: Vec<_> = items.iter().map(|i| &i.classification).collect();
        assert!(classifications.contains(&&ItemClassification::Struct));
        assert!(classifications.contains(&&ItemClassification::Enum));
        assert!(classifications.contains(&&ItemClassification::Trait));
    }

    #[test]
    fn test_classification_inherent_impl() {
        let source = r#"
impl Foo {
    fn bar(&self) {}
}
"#;
        let items = analyze_structure(SupportLang::Rust, source);
        let impl_items: Vec<_> = items.iter().filter(|i| i.kind == "impl").collect();
        assert_eq!(impl_items.len(), 1);
        assert_eq!(impl_items[0].classification, ItemClassification::InherentImpl);
    }

    #[test]
    fn test_line_count_populated() {
        let source = r#"
fn short() {}

fn longer() {
    let a = 1;
    let b = 2;
    let c = 3;
}
"#;
        let items = analyze_structure(SupportLang::Rust, source);
        let short_fn = items.iter().find(|i| i.name == "short").unwrap();
        assert_eq!(short_fn.line_count, 1);
        let longer_fn = items.iter().find(|i| i.name == "longer").unwrap();
        assert!(longer_fn.line_count >= 4);
    }

    // ─── New anti-pattern categories ─────────────────────────────────

    #[test]
    fn test_anti_patterns_rust_complexity_deep_nesting() {
        let source = r#"
fn deep() {
    if true {
        if true {
            if true {
                if true {
                    println!("too deep");
                }
            }
        }
    }
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "complexity");
        assert!(violations.iter().any(|v| v.rule_name == "deep_nesting_4"));
    }

    #[test]
    fn test_anti_patterns_rust_unused() {
        let source = r#"
#[allow(dead_code)]
fn unused() {}

#[allow(unused_imports)]
use std::io;
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unused");
        let rules: Vec<&str> = violations.iter().map(|v| v.rule_name.as_str()).collect();
        assert!(rules.contains(&"allow_unused"));
        assert!(rules.contains(&"allow_unused_imports"));
    }

    #[test]
    fn test_anti_patterns_rust_clone() {
        let source = r#"
fn copy_stuff() {
    let a = vec![1, 2, 3];
    let b = a.clone();
    let c = "hello".to_owned();
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "clone");
        let rules: Vec<&str> = violations.iter().map(|v| v.rule_name.as_str()).collect();
        assert!(rules.contains(&"clone_call"));
        assert!(rules.contains(&"to_owned_call"));
    }

    #[test]
    fn test_anti_patterns_rust_error_handling_extended() {
        let source = r#"
fn incomplete() {
    unimplemented!("not done yet");
    unreachable!("should not get here");
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "error_handling");
        let rules: Vec<&str> = violations.iter().map(|v| v.rule_name.as_str()).collect();
        assert!(rules.contains(&"unimplemented_macro"));
        assert!(rules.contains(&"unreachable_macro"));
    }

    #[test]
    fn test_anti_patterns_rust_unsafe_fn() {
        let source = r#"
unsafe fn dangerous(ptr: *const i32) -> i32 {
    *ptr
}
"#;
        let violations = find_anti_patterns(SupportLang::Rust, source, "unsafe");
        assert!(violations.iter().any(|v| v.rule_name == "unsafe_fn"));
    }

    #[test]
    fn test_anti_patterns_js_deprecated_var() {
        let source = r#"
var x = 10;
let y = 20;
"#;
        let violations = find_anti_patterns(SupportLang::JavaScript, source, "deprecated");
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].rule_name, "var_declaration");
    }

    #[test]
    fn test_anti_patterns_go_panic() {
        let source = r#"
package main

func risky() {
    panic("oh no")
}
"#;
        let violations = find_anti_patterns(SupportLang::Go, source, "error_handling");
        assert!(violations.iter().any(|v| v.rule_name == "panic_call"));
    }

    // ─── available_categories ────────────────────────────────────────

    #[test]
    fn test_available_categories_rust() {
        let cats = available_categories(SupportLang::Rust);
        assert!(cats.contains(&"unwrap_usage"));
        assert!(cats.contains(&"error_handling"));
        assert!(cats.contains(&"unsafe"));
        assert!(cats.contains(&"complexity"));
        assert!(cats.contains(&"unused"));
        assert!(cats.contains(&"clone"));
    }

    #[test]
    fn test_available_categories_typescript() {
        let cats = available_categories(SupportLang::TypeScript);
        assert!(cats.contains(&"error_handling"));
        assert!(cats.contains(&"console"));
        assert!(cats.contains(&"complexity"));
        assert!(cats.contains(&"deprecated"));
    }

    #[test]
    fn test_available_categories_python() {
        let cats = available_categories(SupportLang::Python);
        assert!(cats.contains(&"complexity"));
    }

    #[test]
    fn test_available_categories_unsupported_lang_empty() {
        let cats = available_categories(SupportLang::Html);
        assert!(cats.is_empty());
    }

    // ─── find_long_functions ─────────────────────────────────────────

    #[test]
    fn test_find_long_functions_detects_long() {
        // Build a function that is 15 lines long.
        let mut lines = vec!["fn long_one() {".to_string()];
        for i in 0..13 {
            lines.push(format!("    let x{i} = {i};"));
        }
        lines.push("}".to_string());
        let source = lines.join("\n");

        let violations = find_long_functions(SupportLang::Rust, &source, 10);
        assert_eq!(violations.len(), 1);
        assert_eq!(violations[0].rule_name, "long_function");
        assert_eq!(violations[0].text, "long_one");
    }

    #[test]
    fn test_find_long_functions_short_fn_ok() {
        let source = "fn short() { let x = 1; }\n";
        let violations = find_long_functions(SupportLang::Rust, source, 10);
        assert!(violations.is_empty());
    }

    // ─── Expanded structure patterns ─────────────────────────────────

    #[test]
    fn test_analyze_structure_rust_type_alias() {
        let source = "type Alias = Vec<String>;\n";
        let items = analyze_structure(SupportLang::Rust, source);
        assert!(items.iter().any(|i| i.kind == "type_alias" && i.name == "Alias"));
    }

    #[test]
    fn test_analyze_structure_typescript_enum() {
        let source = r#"
enum Direction {
    Up,
    Down,
    Left,
    Right,
}
"#;
        let items = analyze_structure(SupportLang::TypeScript, source);
        assert!(items.iter().any(|i| i.kind == "enum" && i.name == "Direction"));
    }

    #[test]
    fn test_analyze_structure_kotlin_fun() {
        let source = r#"
fun greet(name: String) {
    println(name)
}
"#;
        let items = analyze_structure(SupportLang::Kotlin, source);
        assert!(items.iter().any(|i| i.kind == "function" && i.name == "greet"));
    }

    // ─── Pattern matching accuracy ───────────────────────────────────

    #[test]
    fn test_search_pattern_rust_result_return() {
        let source = r#"
fn fallible() -> Result<i32, String> {
    Ok(42)
}

fn infallible() -> i32 {
    42
}
"#;
        let matches = search_pattern(
            SupportLang::Rust,
            source,
            "fn $FNAME($$$ARGS) -> Result<$RET, $ERR> $$$BODY",
        );
        assert_eq!(matches.len(), 1);
        let name = matches[0].bindings.iter().find(|(k, _)| k == "FNAME").unwrap();
        assert_eq!(name.1, "fallible");
    }

    #[test]
    fn test_search_pattern_python_def() {
        let source = r#"
def add(a, b):
    return a + b

def sub(a, b):
    return a - b
"#;
        let matches = search_pattern(
            SupportLang::Python,
            source,
            "def $NAME($$$ARGS): $$$BODY",
        );
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn test_search_pattern_go_func() {
        let source = r#"
package main

func Add(a int, b int) int {
    return a + b
}
"#;
        let matches = search_pattern(SupportLang::Go, source, "func $NAME($$$ARGS) $$$BODY");
        assert_eq!(matches.len(), 1);
    }
}
