/// Dependency-file scanner.
///
/// Fetches well-known manifest files from a repo and extracts package names
/// that signal AI/ML work.  No cloud needed — all classification is done
/// locally against curated lists.
use crate::client::GhClient;
use crate::types::DepSignal;
use tracing::debug;

// ── Known AI/ML packages ─────────────────────────────────────────────────────

const PYTHON_AI: &[&str] = &[
    // Core frameworks
    "torch", "tensorflow", "jax", "flax", "keras", "paddle", "paddlepaddle",
    "mindspore", "mxnet",
    // Transformers / HuggingFace
    "transformers", "huggingface-hub", "huggingface_hub", "datasets", "evaluate",
    "peft", "trl", "accelerate", "bitsandbytes", "optimum", "diffusers",
    "sentence-transformers", "sentence_transformers", "tokenizers",
    // LLM / agent frameworks
    "langchain", "langchain-core", "langchain-openai", "langchain-anthropic",
    "langchain-community", "llama-index", "llama_index", "llamaindex",
    "openai", "anthropic", "cohere", "mistralai", "groq", "litellm",
    "instructor", "guidance", "outlines",
    // Inference / serving
    "vllm", "llama-cpp-python", "ctransformers", "mlx", "mlx-lm", "ggml",
    "xformers", "flash-attn", "deepspeed", "fairseq", "megatron",
    // Vision / multimodal
    "torchvision", "timm", "einops", "albumentations", "opencv-python",
    "open-clip-torch",
    // Eval / observability
    "ragas", "langsmith", "weave", "trulens", "phoenix", "promptflow",
    // Embeddings / RAG
    "faiss-cpu", "faiss-gpu",
];

const PYTHON_VECTOR_DB: &[&str] = &[
    "pinecone", "pinecone-client", "weaviate-client", "chromadb", "qdrant-client",
    "pymilvus", "lancedb", "pgvector",
];

const JS_AI: &[&str] = &[
    "openai", "@anthropic-ai/sdk", "langchain", "@langchain/core",
    "@langchain/openai", "@langchain/anthropic", "llamaindex", "ai",
    "@ai-sdk/openai", "@ai-sdk/anthropic", "@huggingface/inference",
    "transformers", "@xenova/transformers", "@tensorflow/tfjs", "ml5",
    "brain.js", "groq-sdk", "cohere-ai", "mistralai",
];

const RUST_AI: &[&str] = &[
    "candle-core", "candle-nn", "candle-transformers", "ort", "llm",
    "mistralrs", "fastembed", "rust-bert", "tokenizers", "hf-hub",
    "llama-cpp-rs", "tch",
];

// ── Manifest file paths to probe ─────────────────────────────────────────────

const MANIFESTS: &[&str] = &[
    "requirements.txt",
    "requirements/base.txt",
    "requirements/prod.txt",
    "pyproject.toml",
    "setup.cfg",
    "package.json",
    "Cargo.toml",
];

// ── Public API ────────────────────────────────────────────────────────────────

/// Scan a repo for dependency signals, fetching up to `MANIFESTS` files.
/// Returns empty vec if none found or on network failure.
pub async fn scan_repo(client: &GhClient, owner: &str, repo: &str) -> Vec<DepSignal> {
    let mut signals: Vec<DepSignal> = Vec::new();

    for path in MANIFESTS {
        match client.get_file_content(owner, repo, path).await {
            Ok(Some(content)) => {
                debug!("scanning {owner}/{repo}/{path}");
                let found = parse_manifest(path, &content);
                signals.extend(found);
                // Stop after first successful manifest per type (pip/npm/cargo)
                if !signals.is_empty() && path.ends_with(".txt") { break; }
            }
            Ok(None) => {} // file doesn't exist
            Err(e) => debug!("manifest fetch {owner}/{repo}/{path}: {e}"),
        }
    }

    signals.dedup_by(|a, b| dep_signal_name(a) == dep_signal_name(b));
    signals
}

fn dep_signal_name(s: &DepSignal) -> &str {
    match s {
        DepSignal::AiPackage { name, .. } => name,
        DepSignal::VectorDb { name } => name,
    }
}

// ── Parsers ───────────────────────────────────────────────────────────────────

fn parse_manifest(path: &str, content: &str) -> Vec<DepSignal> {
    if path.ends_with("requirements.txt") || path.ends_with("requirements/base.txt") || path.ends_with("requirements/prod.txt") {
        parse_requirements_txt(content)
    } else if path.ends_with("pyproject.toml") || path.ends_with("setup.cfg") {
        parse_pyproject(content)
    } else if path.ends_with("package.json") {
        parse_package_json(content)
    } else if path.ends_with("Cargo.toml") {
        parse_cargo_toml(content)
    } else {
        vec![]
    }
}

/// Parse `requirements.txt`: one package per line, name is before any
/// version specifier (`>=`, `==`, `~=`, `[`, whitespace).
fn parse_requirements_txt(content: &str) -> Vec<DepSignal> {
    let mut signals = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        // Skip comments, blank lines, options flags, URLs
        if line.is_empty() || line.starts_with('#') || line.starts_with('-') || line.contains("://") {
            continue;
        }
        // Strip extras like `package[extra]`
        let name = line
            .split(|c: char| c == '>' || c == '<' || c == '=' || c == '~' || c == '[' || c == ' ' || c == ';')
            .next()
            .unwrap_or("")
            .trim()
            .to_lowercase();
        if !name.is_empty() {
            collect_python(&name, &mut signals);
        }
    }
    signals
}

/// Parse `pyproject.toml` (PEP 621 `[project].dependencies` and
/// Poetry `[tool.poetry.dependencies]`).
fn parse_pyproject(content: &str) -> Vec<DepSignal> {
    let mut signals = Vec::new();
    let Ok(val) = toml::from_str::<toml::Value>(content) else { return signals };

    // PEP 621: project.dependencies = ["torch>=2.0", ...]
    if let Some(deps) = val
        .get("project")
        .and_then(|p| p.get("dependencies"))
        .and_then(|d| d.as_array())
    {
        for item in deps {
            if let Some(s) = item.as_str() {
                let name = pep508_name(s);
                collect_python(&name, &mut signals);
            }
        }
    }

    // Poetry: [tool.poetry.dependencies] = { torch = "^2" }
    if let Some(deps) = val
        .get("tool")
        .and_then(|t| t.get("poetry"))
        .and_then(|p| p.get("dependencies"))
        .and_then(|d| d.as_table())
    {
        for key in deps.keys() {
            collect_python(&key.to_lowercase(), &mut signals);
        }
    }

    signals
}

/// Parse `package.json` for `dependencies` and `devDependencies`.
fn parse_package_json(content: &str) -> Vec<DepSignal> {
    let mut signals = Vec::new();
    let Ok(val) = serde_json::from_str::<serde_json::Value>(content) else { return signals };

    for section in &["dependencies", "devDependencies", "peerDependencies"] {
        if let Some(obj) = val.get(section).and_then(|v| v.as_object()) {
            for key in obj.keys() {
                collect_js(key, &mut signals);
            }
        }
    }
    signals
}

/// Parse `Cargo.toml` `[dependencies]` keys.
fn parse_cargo_toml(content: &str) -> Vec<DepSignal> {
    let mut signals = Vec::new();
    let Ok(val) = toml::from_str::<toml::Value>(content) else { return signals };

    for section in &["dependencies", "dev-dependencies", "build-dependencies"] {
        if let Some(table) = val.get(section).and_then(|v| v.as_table()) {
            for key in table.keys() {
                collect_rust(key, &mut signals);
            }
        }
    }
    signals
}

// ── Classifier helpers ────────────────────────────────────────────────────────

fn collect_python(name: &str, out: &mut Vec<DepSignal>) {
    if PYTHON_AI.iter().any(|&k| k == name || name.replace('-', "_") == k.replace('-', "_")) {
        out.push(DepSignal::AiPackage { manager: "pip".into(), name: name.to_string() });
    } else if PYTHON_VECTOR_DB.iter().any(|&k| k == name) {
        out.push(DepSignal::VectorDb { name: name.to_string() });
    }
}

fn collect_js(name: &str, out: &mut Vec<DepSignal>) {
    if JS_AI.iter().any(|&k| k == name) {
        out.push(DepSignal::AiPackage { manager: "npm".into(), name: name.to_string() });
    }
}

fn collect_rust(name: &str, out: &mut Vec<DepSignal>) {
    if RUST_AI.iter().any(|&k| k == name) {
        out.push(DepSignal::AiPackage { manager: "cargo".into(), name: name.to_string() });
    }
}

/// Extract the bare package name from a PEP 508 requirement string.
/// e.g. "torch>=2.0; python_version>='3.8'" → "torch"
fn pep508_name(s: &str) -> String {
    s.split(|c: char| c == '>' || c == '<' || c == '=' || c == '~' || c == '[' || c == ';' || c == ' ')
        .next()
        .unwrap_or("")
        .trim()
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_requirements_txt_basic() {
        let content = "torch>=2.0\ntransformers==4.40\n# comment\n-r base.txt\nnumpy\n";
        let sigs = parse_requirements_txt(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "torch")));
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "transformers")));
        // numpy is not in the AI list
        assert!(!sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "numpy")));
    }

    #[test]
    fn parse_requirements_txt_with_extras() {
        let content = "openai[datalib]>=1.0\n";
        let sigs = parse_requirements_txt(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "openai")));
    }

    #[test]
    fn parse_package_json_ai_deps() {
        let content = r#"{"dependencies":{"openai":"^4.0","lodash":"^4.0"}}"#;
        let sigs = parse_package_json(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "openai")));
        assert!(!sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "lodash")));
    }

    #[test]
    fn parse_cargo_toml_ai_deps() {
        let content = "[dependencies]\ncandle-core = \"0.8\"\ntokio = \"1\"\n";
        let sigs = parse_cargo_toml(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "candle-core")));
        assert!(!sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "tokio")));
    }

    #[test]
    fn parse_pyproject_pep621() {
        let content = r#"
[project]
dependencies = ["torch>=2.0", "requests>=2.0", "langchain>=0.2"]
"#;
        let sigs = parse_pyproject(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "torch")));
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "langchain")));
    }

    #[test]
    fn parse_pyproject_poetry() {
        let content = r#"
[tool.poetry.dependencies]
python = "^3.11"
transformers = "^4.40"
boto3 = "^1.0"
"#;
        let sigs = parse_pyproject(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "transformers")));
        assert!(!sigs.iter().any(|s| matches!(s, DepSignal::AiPackage { name, .. } if name == "boto3")));
    }

    #[test]
    fn vector_db_detected_in_requirements() {
        let content = "chromadb\npinecone-client>=2.0\n";
        let sigs = parse_requirements_txt(content);
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::VectorDb { name } if name == "chromadb")));
        assert!(sigs.iter().any(|s| matches!(s, DepSignal::VectorDb { name } if name == "pinecone-client")));
    }

    #[test]
    fn pep508_name_strips_extras_and_markers() {
        assert_eq!(pep508_name("torch[cuda]>=2.0; sys_platform=='linux'"), "torch");
        assert_eq!(pep508_name("transformers==4.40.0"), "transformers");
        assert_eq!(pep508_name("openai"), "openai");
    }
}
