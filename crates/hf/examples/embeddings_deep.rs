//! Deep dive into embedding models for lead-gen pipelines.
//! Compares BGE, E5, GTE, Nomic, Jina — dimensions, sizes,
//! ONNX availability, architecture, and practical deployment.

use hf::HfClient;
use std::collections::HashMap;

/// Each family gets searched separately, then we fetch config.json + siblings
/// to extract architecture, hidden_size, max_position_embeddings, and file sizes.
const FAMILIES: &[(&str, &[&str])] = &[
    ("BGE", &[
        "bge-small-en", "bge-base-en", "bge-large-en",
        "bge-m3", "bge-small-zh", "bge-base-zh",
        "bge-large-zh", "bge-multilingual",
    ]),
    ("E5", &[
        "e5-small", "e5-base", "e5-large",
        "e5-mistral", "multilingual-e5",
    ]),
    ("GTE", &[
        "gte-small", "gte-base", "gte-large",
        "gte-Qwen", "gte-multilingual",
    ]),
    ("NOMIC", &[
        "nomic-embed-text", "nomic-embed",
    ]),
    ("JINA", &[
        "jina-embeddings-v2", "jina-embeddings-v3",
        "jina-clip",
    ]),
    ("SNOWFLAKE", &[
        "snowflake-arctic-embed",
    ]),
    ("STELLA", &[
        "stella_en", "stella-",
    ]),
    ("MIXEDBREAD", &[
        "mxbai-embed",
    ]),
];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(16)?;
    let mut global_seen: HashMap<String, bool> = HashMap::new();

    // Collect top models across all families
    let mut top_models: Vec<(u64, String, String, String, u64, u64)> = Vec::new();

    for (family, queries) in FAMILIES {
        let mut models = Vec::new();
        let mut seen: HashMap<String, bool> = HashMap::new();

        for query in *queries {
            let results = client.search_models(query, 50).await.unwrap_or_default();
            for m in results {
                let repo_id = m.repo_id.clone().unwrap_or_default();
                let dl = m.downloads.unwrap_or(0);

                // Only sentence-transformers / feature-extraction / sentence-similarity
                let tag = m.pipeline_tag.as_deref().unwrap_or("");
                let lib = m.library.as_deref().unwrap_or("");
                let is_embed = tag == "feature-extraction"
                    || tag == "sentence-similarity"
                    || lib == "sentence-transformers";
                if !is_embed { continue; }

                if seen.contains_key(&repo_id) || global_seen.contains_key(&repo_id) { continue; }
                seen.insert(repo_id.clone(), true);
                global_seen.insert(repo_id.clone(), true);

                let author = m.author.as_deref().unwrap_or("-").to_owned();
                let likes = m.likes.unwrap_or(0);

                // Check ONNX presence from siblings
                let has_onnx = m.siblings.as_ref().map_or(false, |sibs| {
                    sibs.iter().any(|s| s.filename.ends_with(".onnx"))
                });
                // Check SafeTensors
                let has_safetensors = m.siblings.as_ref().map_or(false, |sibs| {
                    sibs.iter().any(|s| s.filename.ends_with(".safetensors"))
                });
                // Total model size from siblings
                let total_bytes: u64 = m.siblings.as_ref().map_or(0, |sibs| {
                    sibs.iter()
                        .filter(|s| {
                            s.filename.ends_with(".safetensors")
                                || s.filename.ends_with(".bin")
                                || s.filename.ends_with(".onnx")
                        })
                        .filter_map(|s| s.size)
                        .sum()
                });

                let fmt_flags = format!(
                    "{}{}",
                    if has_onnx { "ONNX " } else { "" },
                    if has_safetensors { "ST" } else { "BIN" },
                );

                models.push((dl, repo_id.clone(), author.clone(), fmt_flags, total_bytes, likes));

                if dl >= 10_000 {
                    top_models.push((dl, repo_id, author, family.to_string(), total_bytes, likes));
                }
            }
        }

        models.sort_by(|a, b| b.0.cmp(&a.0));

        eprintln!("\n{}", "=".repeat(130));
        eprintln!("  {family} FAMILY  —  {} models, {} with ≥10K dl", models.len(),
            models.iter().filter(|m| m.0 >= 10_000).count());
        eprintln!("{}", "=".repeat(130));

        for (dl, repo_id, author, flags, size_bytes, likes) in models.iter().take(12) {
            let size_mb = *size_bytes as f64 / 1_048_576.0;
            let size_str = if size_mb > 0.0 { format!("{size_mb:.0}MB") } else { "-".into() };
            eprintln!(
                "  {dl:>12} dl  {likes:>5} lk  {repo_id:<55} {author:<20} {size_str:>8}  {flags}",
            );
        }
    }

    // Sort top models by downloads
    top_models.sort_by(|a, b| b.0.cmp(&a.0));

    eprintln!("\n{}", "=".repeat(130));
    eprintln!("  TOP EMBEDDING MODELS (≥10K dl) — CROSS-FAMILY RANKING");
    eprintln!("{}", "=".repeat(130));
    for (i, (dl, repo_id, author, family, size_bytes, likes)) in top_models.iter().take(30).enumerate() {
        let size_mb = *size_bytes as f64 / 1_048_576.0;
        let size_str = if size_mb > 0.0 { format!("{size_mb:.0}MB") } else { "-".into() };
        eprintln!(
            "  {i:>2}. {dl:>12} dl  {likes:>5} lk  [{family:<10}]  {repo_id:<55} {author:<18} {size_str:>8}",
        );
    }

    // Fetch config.json for top 25 to get architecture details
    let config_ids: Vec<String> = top_models.iter().take(25).map(|(_, id, ..)| id.clone()).collect();
    let configs = client.fetch_raw_files(
        &config_ids.iter()
            .map(|id| hf::FetchRequest::model(id).with_path("config.json"))
            .collect::<Vec<_>>(),
    ).await;

    eprintln!("\n{}", "=".repeat(130));
    eprintln!("  ARCHITECTURE DETAILS (from config.json)");
    eprintln!("{}", "=".repeat(130));
    eprintln!(
        "  {:<55} {:>6} {:>6} {:>8} {:>8}  {}",
        "MODEL", "DIM", "LAYERS", "MAX_SEQ", "VOCAB", "ARCHITECTURE"
    );
    eprintln!("  {}", "-".repeat(125));

    for config in &configs {
        match config {
            hf::FetchResult::Ok { repo_id, data } => {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                    let dim = json.get("hidden_size")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let layers = json.get("num_hidden_layers")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let max_seq = json.get("max_position_embeddings")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let vocab = json.get("vocab_size")
                        .and_then(|v| v.as_u64())
                        .unwrap_or(0);
                    let arch_list = json.get("architectures")
                        .and_then(|v| v.as_array())
                        .map(|arr| arr.iter()
                            .filter_map(|v| v.as_str())
                            .collect::<Vec<_>>()
                            .join(", "))
                        .unwrap_or_else(|| {
                            json.get("model_type")
                                .and_then(|v| v.as_str())
                                .unwrap_or("-")
                                .to_string()
                        });

                    let _dl = top_models.iter().find(|(_, id, ..)| id == repo_id)
                        .map(|m| m.0).unwrap_or(0);

                    eprintln!(
                        "  {:<55} {:>6} {:>6} {:>8} {:>8}  {}",
                        repo_id, dim, layers, max_seq, vocab, arch_list,
                    );

                    // Check for Matryoshka / MRL support
                    let has_matryoshka = data.contains("matryoshka")
                        || data.contains("Matryoshka")
                        || data.contains("mrl");
                    if has_matryoshka {
                        eprintln!("    ^^ Matryoshka (variable-dimension) support detected");
                    }
                }
            }
            hf::FetchResult::Err { repo_id, error } => {
                eprintln!("  {repo_id:<55} (config.json error: {error})");
            }
        }
    }

    // Fetch model cards for top 15 to check deployment guidance
    let card_ids: Vec<String> = top_models.iter().take(15).map(|(_, id, ..)| id.clone()).collect();
    let cards = client.fetch_model_cards(&card_ids).await.unwrap_or_default();

    eprintln!("\n{}", "=".repeat(130));
    eprintln!("  DEPLOYMENT SIGNALS (from model cards)");
    eprintln!("{}", "=".repeat(130));

    for id in &card_ids {
        if let Some(card) = cards.get(id.as_str()) {
            let lower = card.to_lowercase();
            let kws = [
                "onnx", "tensorrt", "openvino", "candle", "rust",
                "quantization", "int8", "fp16", "binary",
                "matryoshka", "mrl", "truncat",
                "retrieval", "semantic search", "clustering",
                "classification", "reranking",
            ];
            let mentions: Vec<&str> = kws.iter().filter(|&&kw| lower.contains(kw)).copied().collect();
            let dl = top_models.iter().find(|(_, rid, ..)| rid == id).map(|m| m.0).unwrap_or(0);
            eprintln!("  {dl:>12} dl  {id:<55}  kw={mentions:?}");
        }
    }

    Ok(())
}
