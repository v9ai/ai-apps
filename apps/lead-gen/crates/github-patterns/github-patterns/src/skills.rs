/// Keyword-based AI/ML skill extraction — no regex, no external deps.
///
/// `extract_skills` lower-cases the text once and uses `str::contains` for
/// each keyword.  The result is sorted and deduplicated via `BTreeSet`.
use std::collections::BTreeSet;

/// Static taxonomy: (canonical tag, list of trigger keywords).
/// Keep entries sorted alphabetically by tag for stability.
static TAXONOMY: &[(&str, &[&str])] = &[
    ("agents",                  &["agent", "agentic", "crewai", "autogen", "langgraph", "multi-agent", "tool use", "function calling", "griptape", "swarm"]),
    ("computer-vision",         &["computer vision", "opencv", "cv2", "yolo", "object detection", "image classification", "image segmentation"]),
    ("deep-learning",           &["deep learning", "neural network", "backprop", "gradient descent", "activation function"]),
    ("distributed-training",    &["distributed training", "deepspeed", "fsdp", "megatron", "data parallel", "model parallel", "horovod", "multi-gpu", "multi gpu"]),
    ("embeddings",              &["embedding", "sentence-transformer", "bge", "e5-", "gte-", "ada-002"]),
    ("evaluation",              &["eval", "evaluation", "benchmark", "lm-eval", "eleuther", "human-eval", "humaneval", "helm", "mmlu", "red team", "safety eval"]),
    ("fine-tuning",             &["fine-tun", "lora", "qlora", "peft", "trl", "sft", "dpo", "orpo", "rlhf"]),
    ("generative-ai",           &["generative ai", "generative model", "diffusion", "stable diffusion", "dalle", "imagen"]),
    ("inference",               &["inference", "vllm", "text-generation-inference", "tgi", "triton server", "onnx", "tensorrt", "torchserve", "sglang"]),
    ("llm",                     &["llm", "large language model", "language model", "gpt", "llama", "mistral", "qwen", "deepseek", "claude", "gemini", "openai", "anthropic", "chatgpt"]),
    ("machine-learning",        &["machine learning", "scikit", "sklearn", "xgboost", "lightgbm", "catboost", "random forest", "gradient boosting"]),
    ("mlops",                   &["mlops", "mlflow", "weights & biases", "wandb", "dvc", "bentoml", "ray train", "kubeflow", "sagemaker", "vertex ai"]),
    ("model-serving",           &["model serving", "model deployment", "seldon", "kserve", "ray serve", "sagemaker endpoint"]),
    ("multimodal",              &["multimodal", "vision-language", "clip", "llava", "whisper", "text-to-speech", "speech-to-text", "image generation"]),
    ("nlp",                     &["nlp", "natural language processing", "tokenizer", "spacy", "nltk", "hugging face", "huggingface", "transformers library"]),
    ("prompt-engineering",      &["prompt engineer", "prompt design", "chain of thought", "few-shot", "in-context learning", "system prompt"]),
    ("python",                  &["python", "pip install", "conda env", ".py", "pyproject.toml", "setup.py"]),
    ("rag",                     &["rag", "retrieval-augmented", "retrieval augmented", "langchain", "llamaindex", "llama-index", "haystack"]),
    ("reinforcement-learning",  &["reinforcement learning", "rlhf", "reward model", "policy gradient", "proximal policy", "ppo", "grpo"]),
    ("rust",                    &["rust-lang", "cargo.toml", " tokio ", "candle-core", "rust developer", "written in rust"]),
    ("transformers",            &["transformer", "self-attention", "bert", "roberta", "deberta", "t5", "gpt2", "vision transformer", "vit"]),
    ("typescript",              &["typescript", "nextjs", "next.js", "deno", "bun", "nodejs"]),
    ("vector-db",               &["vector database", "vector db", "lancedb", "pinecone", "weaviate", "qdrant", "milvus", "chromadb", "chroma", "faiss", "pgvector", "vector store"]),
];

/// Extract AI/ML skill tags from raw text.
///
/// Returns a sorted, deduplicated slice of `&'static str` tags.
pub fn extract_skills(text: &str) -> Vec<&'static str> {
    let lower = text.to_lowercase();
    let mut found = BTreeSet::new();
    for (tag, keywords) in TAXONOMY {
        if keywords.iter().any(|kw| lower.contains(kw)) {
            found.insert(*tag);
        }
    }
    found.into_iter().collect()
}

/// Build the skill-input text for a contributor record:
/// bio + company + status + AI repo names + pinned repo names + contributed-to repo names/topics.
pub fn contributor_skills_text(
    bio: Option<&str>,
    company: Option<&str>,
    repos_json: &str,
    pinned_repos_json: Option<&str>,
    contributed_repos_json: Option<&str>,
) -> String {
    use crate::types::{PinnedRepo, ContributedRepo};
    use serde_json::Value;

    let mut parts: Vec<&str> = Vec::new();
    if let Some(b) = bio {
        parts.push(b);
    }
    if let Some(c) = company {
        parts.push(c);
    }
    let mut text = parts.join(" ");

    // Existing repo contributions
    if let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(repos_json) {
        for v in &arr {
            if let Some(repo) = v.get("repo").and_then(|r| r.as_str()) {
                text.push(' ');
                text.push_str(repo);
            }
        }
    }

    // Pinned repos — names often reveal specialisation
    if let Some(json) = pinned_repos_json {
        if let Ok(pinned) = serde_json::from_str::<Vec<PinnedRepo>>(json) {
            for p in &pinned {
                text.push(' ');
                text.push_str(&p.name);
            }
        }
    }

    // Contributed-to repos — names and topics are high-signal
    if let Some(json) = contributed_repos_json {
        if let Ok(contribs) = serde_json::from_str::<Vec<ContributedRepo>>(json) {
            for c in &contribs {
                text.push(' ');
                text.push_str(&c.name_with_owner);
                for topic in &c.topics {
                    text.push(' ');
                    text.push_str(topic);
                }
            }
        }
    }

    text
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_llm_and_rag_from_bio() {
        let skills = extract_skills("I build LLM applications with RAG pipelines");
        assert!(skills.contains(&"llm"), "missing llm in {:?}", skills);
        assert!(skills.contains(&"rag"), "missing rag in {:?}", skills);
    }

    #[test]
    fn extracts_vector_db() {
        assert!(extract_skills("using LanceDB for vector storage").contains(&"vector-db"));
        assert!(extract_skills("experimenting with pgvector").contains(&"vector-db"));
    }

    #[test]
    fn extracts_fine_tuning() {
        assert!(extract_skills("LoRA fine-tuning with PEFT").contains(&"fine-tuning"));
        assert!(extract_skills("DPO training recipe").contains(&"fine-tuning"));
    }

    #[test]
    fn case_insensitive() {
        let skills = extract_skills("Working on Transformers and BERT models");
        assert!(skills.contains(&"transformers"), "missing transformers in {:?}", skills);
    }

    #[test]
    fn empty_text_returns_empty() {
        assert!(extract_skills("").is_empty());
    }

    #[test]
    fn output_is_sorted_and_deduped() {
        // "llm" and "rag" are separate tags but both present
        let skills = extract_skills("LLM RAG LangChain OpenAI");
        // No duplicates
        for w in skills.windows(2) {
            assert!(w[0] < w[1], "not sorted/deduped: {:?}", skills);
        }
    }

    #[test]
    fn contributor_skills_text_combines_fields() {
        let repos_json = r#"[{"repo":"org/llm-eval","contributions":50}]"#;
        let text = contributor_skills_text(
            Some("Building RAG pipelines"),
            Some("@openai"),
            repos_json,
            None,
            None,
        );
        assert!(text.contains("RAG"));
        assert!(text.contains("openai"));
        assert!(text.contains("llm-eval"));
    }

    #[test]
    fn contributor_skills_text_handles_none_fields() {
        let text = contributor_skills_text(None, None, "[]", None, None);
        assert!(text.is_empty());
    }

    #[test]
    fn contributor_skills_text_handles_invalid_json() {
        // Bad JSON → repos silently ignored, bio/company still included
        let text = contributor_skills_text(Some("bio"), None, "not-json", None, None);
        assert_eq!(text, "bio");
    }

    #[test]
    fn contributor_skills_text_includes_pinned_and_contributed() {
        let pinned = r#"[{"name":"my-rag-agent","stars":10,"language":"Python"}]"#;
        let contributed = r#"[{"name_with_owner":"langchain-ai/langchain","stars":100,"language":"Python","topics":["llm","agent"]}]"#;
        let text = contributor_skills_text(Some("bio"), None, "[]", Some(pinned), Some(contributed));
        assert!(text.contains("my-rag-agent"));
        assert!(text.contains("langchain-ai/langchain"));
        assert!(text.contains("agent"));
    }
}
