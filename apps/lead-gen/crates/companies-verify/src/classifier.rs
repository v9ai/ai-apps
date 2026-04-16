/// Recruitment classifier: dual-signal approach.
///
/// Signal 1 — **Centroid distance**: Candle embeds the website text, LanceDB
///   retrieves top-K neighbours. Instead of raw majority vote, compute average
///   cosine similarity to recruitment centroid vs non-recruitment centroid.
///   A company must be *closer* to the recruitment cluster to pass.
///
/// Signal 2 — **Keyword scoring**: scan the website text for UK-recruitment
///   specific terms (REC, AWR, IR35, "we recruit", "staffing", "placing
///   candidates", etc.). This catches hard signals that embedding similarity
///   alone misses and guards against false positives from generic corporate text.
///
/// Final verdict requires BOTH signals to agree, or a very strong keyword score.

use anyhow::Result;
use candle_core::{Device, Tensor, D};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config as BertConfig};
use hf_hub::{api::sync::Api, Repo, RepoType};
use tokenizers::Tokenizer;

use crate::store::CorpusStore;
use crate::Verdict;

const MODEL_ID: &str = "sentence-transformers/all-MiniLM-L6-v2";
const TOP_K: usize = 7;

// ── Keyword scoring ──────────────────────────────────────────────────────────

/// Strong signals: if any of these appear, it's almost certainly recruitment.
const STRONG_KEYWORDS: &[&str] = &[
    "we recruit",
    "we are a recruitment",
    "recruitment agency",
    "recruitment consultancy",
    "staffing agency",
    "staffing solutions",
    "placing candidates",
    "place candidates",
    "executive search",
    "headhunting",
    "talent acquisition",
    "rec member",
    "rec accredited",
    "awr compliant",
    "ir35",
    "umbrella company",
    "locum",
    "temporary staffing",
    "contract staffing",
    "permanent placement",
    "we place ",
    "our recruiters",
    "our recruitment consultants",
    "job seekers with employers",
    "connecting talent",
    "find your next role",
    "hiring solutions",
    "contingent workforce",
    "managed service provider for recruitment",
    "recruitment process outsourcing",
];

/// Moderate signals: recruitment-adjacent but also found on non-recruitment sites.
const MODERATE_KEYWORDS: &[&str] = &[
    "recruiter",
    "staffing",
    "vacancies",
    "job board",
    "submit your cv",
    "upload your cv",
    "register your cv",
    "looking for work",
    "find a job",
    "browse jobs",
    "apply now",
    "we're hiring",
    "career opportunities",
    "open positions",
    "current vacancies",
    "contractor",
    "temp agency",
    "employment agency",
];

/// Anti-signals: strongly suggest this is NOT a recruitment company.
const ANTI_KEYWORDS: &[&str] = &[
    "our product",
    "our platform",
    "our software",
    "saas",
    "api",
    "sdk",
    "open source",
    "download",
    "install",
    "pricing plans",
    "free trial",
    "sign up free",
    "developer documentation",
    "github.com/",
    "npm install",
    "pip install",
    "cargo add",
    "docker",
    "kubernetes",
    "cloud platform",
    "machine learning platform",
    "analytics platform",
    "e-commerce",
    "marketplace",
    "checkout",
    "add to cart",
    "shopping",
];

struct KeywordScore {
    strong_hits: usize,
    moderate_hits: usize,
    anti_hits: usize,
    /// Net score: strong*3 + moderate*1 - anti*2
    net: i32,
    detail: Vec<String>,
}

fn score_keywords(text: &str) -> KeywordScore {
    let lower = text.to_lowercase();
    let mut strong_hits = 0;
    let mut moderate_hits = 0;
    let mut anti_hits = 0;
    let mut detail = Vec::new();

    for &kw in STRONG_KEYWORDS {
        if lower.contains(kw) {
            strong_hits += 1;
            if detail.len() < 3 {
                detail.push(format!("+STRONG:{kw}"));
            }
        }
    }
    for &kw in MODERATE_KEYWORDS {
        if lower.contains(kw) {
            moderate_hits += 1;
        }
    }
    for &kw in ANTI_KEYWORDS {
        if lower.contains(kw) {
            anti_hits += 1;
            if detail.len() < 3 {
                detail.push(format!("-ANTI:{kw}"));
            }
        }
    }

    let net = (strong_hits as i32 * 3) + (moderate_hits as i32) - (anti_hits as i32 * 2);

    KeywordScore {
        strong_hits,
        moderate_hits,
        anti_hits,
        net,
        detail,
    }
}

// ── Embedding model ──────────────────────────────────────────────────────────

/// Candle BERT embedding model — mirrors `crates/candle/src/embeddings.rs`.
pub struct EmbeddingModel {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
}

impl EmbeddingModel {
    pub fn load(device: &Device) -> Result<Self> {
        let api = Api::new()?;
        let repo = api.repo(Repo::new(MODEL_ID.to_string(), RepoType::Model));

        let config_path = repo.get("config.json")?;
        let tokenizer_path = repo.get("tokenizer.json")?;
        let weights_path = repo.get("model.safetensors")?;

        let config: BertConfig =
            serde_json::from_str(&std::fs::read_to_string(config_path)?)?;

        let tokenizer = Tokenizer::from_file(tokenizer_path)
            .map_err(|e| anyhow::anyhow!("tokenizer: {e}"))?;

        let vb = unsafe {
            VarBuilder::from_mmaped_safetensors(
                &[weights_path],
                candle_core::DType::F32,
                device,
            )?
        };
        let model = BertModel::load(vb, &config)?;

        Ok(Self {
            model,
            tokenizer,
            device: device.clone(),
        })
    }

    /// Embed a single text → L2-normalised 384-dim vector.
    pub fn embed_one(&self, text: &str) -> Result<Vec<f32>> {
        let mut tokenizer = self.tokenizer.clone();
        let pad_id = tokenizer.token_to_id("[PAD]").unwrap_or(0);
        tokenizer.with_padding(Some(tokenizers::PaddingParams {
            pad_id,
            pad_token: "[PAD]".to_string(),
            ..Default::default()
        }));

        let encoding = tokenizer
            .encode(text, true)
            .map_err(|e| anyhow::anyhow!("encode: {e}"))?;

        let ids = encoding.get_ids().to_vec();
        let mask: Vec<f32> = encoding.get_attention_mask().iter().map(|&v| v as f32).collect();

        let token_ids = Tensor::new(ids.as_slice(), &self.device)?.unsqueeze(0)?;
        let attention_mask = Tensor::new(mask.as_slice(), &self.device)?.unsqueeze(0)?;
        let token_type_ids = token_ids.zeros_like()?;

        let embeddings = self.model.forward(&token_ids, &token_type_ids, None)?;

        // Masked mean pooling
        let mask_expanded = attention_mask.unsqueeze(2)?.broadcast_as(embeddings.shape())?;
        let masked = (embeddings * mask_expanded)?;
        let summed = masked.sum(1)?;
        let counts = attention_mask.sum(1)?.unsqueeze(1)?.clamp(1e-12, f64::MAX)?;
        let mean = summed.broadcast_div(&counts)?;

        // L2 normalisation
        let norm = mean.sqr()?.sum_keepdim(D::Minus1)?.sqrt()?;
        let normalized = mean.broadcast_div(&norm.clamp(1e-12, f64::MAX)?)?;

        let vec = normalized.squeeze(0)?.to_vec1::<f32>()?;
        Ok(vec)
    }

    /// Embed a batch of texts.
    pub fn embed_batch(&self, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
        texts.iter().map(|t| self.embed_one(t)).collect()
    }
}

// ── Classifier ───────────────────────────────────────────────────────────────

/// Orchestrates embedding + kNN centroid distance + keyword scoring.
pub struct RecruitmentClassifier {
    pub model: EmbeddingModel,
    pub store: CorpusStore,
}

impl RecruitmentClassifier {
    /// Classify a company's website text.
    pub async fn classify(&self, website_text: &str) -> Result<Verdict> {
        // ── Signal 1: LanceDB centroid distance ──────────────────────────
        let vec = self.model.embed_one(website_text)?;
        let neighbours = self.store.query(vec, TOP_K).await?;

        // Compute average similarity to each class (distance → similarity).
        let mut rec_sim_sum = 0.0f32;
        let mut rec_count = 0u32;
        let mut non_sim_sum = 0.0f32;
        let mut non_count = 0u32;

        for n in &neighbours {
            let sim = 1.0 / (1.0 + n.distance);
            if n.label == 1 {
                rec_sim_sum += sim;
                rec_count += 1;
            } else {
                non_sim_sum += sim;
                non_count += 1;
            }
        }

        let avg_rec_sim = if rec_count > 0 { rec_sim_sum / rec_count as f32 } else { 0.0 };
        let avg_non_sim = if non_count > 0 { non_sim_sum / non_count as f32 } else { 0.0 };

        // Semantic margin: how much closer to recruitment vs non-recruitment.
        // Positive = closer to recruitment, negative = closer to non-recruitment.
        let semantic_margin = avg_rec_sim - avg_non_sim;

        // ── Signal 2: Keyword scoring ────────────────────────────────────
        let kw = score_keywords(website_text);

        // ── Combine signals ──────────────────────────────────────────────
        //
        // Decision matrix:
        //   strong_hits >= 2                           → RECRUITMENT (keyword alone is decisive)
        //   strong_hits >= 1 AND semantic_margin > 0   → RECRUITMENT
        //   kw.net >= 3 AND semantic_margin > 0        → RECRUITMENT
        //   anti_hits >= 3 AND strong_hits == 0        → NOT RECRUITMENT (anti-signals dominate)
        //   kw.net <= -3                               → NOT RECRUITMENT
        //   otherwise                                  → NOT RECRUITMENT (default to safe)

        let is_recruitment = if kw.strong_hits >= 2 {
            true
        } else if kw.strong_hits >= 1 && semantic_margin > 0.0 {
            true
        } else if kw.net >= 3 && semantic_margin > 0.0 {
            true
        } else {
            false
        };

        // Confidence: blend keyword strength and semantic margin.
        let keyword_confidence = (kw.strong_hits as f32 * 0.2 + kw.moderate_hits as f32 * 0.05)
            .min(0.5);
        let semantic_confidence = (semantic_margin.abs() * 2.0).min(0.5);
        let confidence = (keyword_confidence + semantic_confidence).min(1.0);

        let top_matches: Vec<String> = {
            let mut v: Vec<String> = neighbours
                .iter()
                .take(2)
                .map(|n| {
                    let tag = if n.label == 1 { "REC" } else { "NON" };
                    format!("[{tag} d={:.3}] {}", n.distance, truncate(&n.text, 50))
                })
                .collect();
            // Add keyword detail
            v.push(format!(
                "kw: strong={} mod={} anti={} net={} margin={:.3}",
                kw.strong_hits, kw.moderate_hits, kw.anti_hits, kw.net, semantic_margin,
            ));
            v.extend(kw.detail);
            v
        };

        Ok(Verdict {
            is_recruitment,
            confidence,
            top_matches,
        })
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}
