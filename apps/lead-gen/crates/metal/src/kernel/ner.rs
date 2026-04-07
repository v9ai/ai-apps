/// Transformer-based NER via ONNX Runtime (dslim/bert-base-NER).
///
/// Extracts PER, ORG, LOC, MISC entities from text with character-level spans.
/// Replaces pattern-based NER in `job_ner.rs` for enrichment and LinkedIn posts.
///
/// Model: dslim/bert-base-NER (110M params, 1.9M HuggingFace downloads)
/// Export: `mlx-training/export_onnx.py --model ner`
/// Files needed:
///   - `~/.cache/leadgen-ml/bert-base-NER/model.onnx`
///   - `~/.cache/leadgen-ml/bert-base-NER/tokenizer.json`

use std::path::Path;

use ort::session::Session;
use tokenizers::Tokenizer;

const DEFAULT_MODEL_DIR: &str = "bert-base-NER";
const MAX_SEQ_LEN: usize = 512;

/// BIO tag labels from dslim/bert-base-NER (CoNLL-2003).
const LABELS: [&str; 9] = [
    "O",       // 0: Outside
    "B-PER",   // 1: Begin Person
    "I-PER",   // 2: Inside Person
    "B-ORG",   // 3: Begin Organization
    "I-ORG",   // 4: Inside Organization
    "B-LOC",   // 5: Begin Location
    "I-LOC",   // 6: Inside Location
    "B-MISC",  // 7: Begin Miscellaneous
    "I-MISC",  // 8: Inside Miscellaneous
];

/// Entity type extracted by NER.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EntityType {
    Person,
    Organization,
    Location,
    Misc,
}

impl EntityType {
    fn from_label(label: &str) -> Option<Self> {
        match label {
            "B-PER" | "I-PER" => Some(Self::Person),
            "B-ORG" | "I-ORG" => Some(Self::Organization),
            "B-LOC" | "I-LOC" => Some(Self::Location),
            "B-MISC" | "I-MISC" => Some(Self::Misc),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Person => "PER",
            Self::Organization => "ORG",
            Self::Location => "LOC",
            Self::Misc => "MISC",
        }
    }
}

/// A recognized named entity with character-level span.
#[derive(Debug, Clone)]
pub struct Entity {
    pub entity_type: EntityType,
    pub text: String,
    pub start: usize, // character offset in original text
    pub end: usize,   // character offset (exclusive)
    pub confidence: f32,
}

pub struct NerModel {
    session: Session,
    tokenizer: Tokenizer,
}

impl NerModel {
    /// Load from a directory containing `model.onnx` and `tokenizer.json`.
    pub fn load(model_dir: &Path) -> anyhow::Result<Self> {
        let onnx_path = model_dir.join("model.onnx");
        let tokenizer_path = model_dir.join("tokenizer.json");

        anyhow::ensure!(onnx_path.exists(), "NER ONNX model not found: {}", onnx_path.display());
        anyhow::ensure!(tokenizer_path.exists(), "NER tokenizer not found: {}", tokenizer_path.display());

        let session = Session::builder()?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(&onnx_path)?;

        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| anyhow::anyhow!("Failed to load NER tokenizer: {}", e))?;

        Ok(Self { session, tokenizer })
    }

    /// Load from the default cache directory.
    pub fn load_default() -> anyhow::Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let model_dir = Path::new(&home).join(".cache/leadgen-ml").join(DEFAULT_MODEL_DIR);
        Self::load(&model_dir)
    }

    /// Extract named entities from text.
    pub fn extract(&self, text: &str) -> anyhow::Result<Vec<Entity>> {
        if text.is_empty() {
            return Ok(Vec::new());
        }

        let encoding = self.tokenizer.encode(text, true)
            .map_err(|e| anyhow::anyhow!("NER tokenization failed: {}", e))?;

        let ids = encoding.get_ids();
        let offsets = encoding.get_offsets();
        let len = ids.len().min(MAX_SEQ_LEN);

        // Build input tensors
        let input_ids: Vec<i64> = ids[..len].iter().map(|&id| id as i64).collect();
        let attention_mask: Vec<i64> = vec![1i64; len];
        let token_type_ids: Vec<i64> = vec![0i64; len];

        let input_ids_array = ndarray::Array2::from_shape_vec((1, len), input_ids)?;
        let attention_mask_array = ndarray::Array2::from_shape_vec((1, len), attention_mask)?;
        let token_type_ids_array = ndarray::Array2::from_shape_vec((1, len), token_type_ids)?;

        let outputs = self.session.run(ort::inputs![
            "input_ids" => input_ids_array.view(),
            "attention_mask" => attention_mask_array.view(),
            "token_type_ids" => token_type_ids_array.view(),
        ]?)?;

        // Output shape: [1, seq_len, num_labels(9)]
        let logits = outputs[0].try_extract_tensor::<f32>()?;
        let logits_view = logits.view();

        // Decode BIO tags with confidence
        let mut token_predictions: Vec<(usize, f32)> = Vec::with_capacity(len);
        for t in 0..len {
            let mut max_idx = 0usize;
            let mut max_val = f32::NEG_INFINITY;
            let mut sum_exp = 0.0f32;

            // Find argmax and compute softmax denominator
            for c in 0..LABELS.len() {
                let val = logits_view[[0, t, c]];
                if val > max_val {
                    max_val = val;
                    max_idx = c;
                }
            }
            for c in 0..LABELS.len() {
                sum_exp += (logits_view[[0, t, c]] - max_val).exp();
            }
            let confidence = 1.0 / sum_exp; // softmax of max class

            token_predictions.push((max_idx, confidence));
        }

        // Merge sub-word tokens into entities using BIO tags + character offsets
        let mut entities: Vec<Entity> = Vec::new();
        let mut current_entity: Option<(EntityType, usize, usize, Vec<f32>)> = None; // (type, char_start, char_end, confidences)

        for t in 0..len {
            let (label_idx, conf) = token_predictions[t];
            let label = LABELS[label_idx];
            let (char_start, char_end) = offsets[t];

            // Skip special tokens ([CLS], [SEP], [PAD])
            if char_start == 0 && char_end == 0 && t > 0 {
                // Flush current entity if any
                if let Some((etype, start, end, confs)) = current_entity.take() {
                    let avg_conf = confs.iter().sum::<f32>() / confs.len() as f32;
                    let entity_text = text[start..end].trim().to_string();
                    if !entity_text.is_empty() {
                        entities.push(Entity {
                            entity_type: etype,
                            text: entity_text,
                            start,
                            end,
                            confidence: avg_conf,
                        });
                    }
                }
                continue;
            }

            if label.starts_with("B-") {
                // Flush previous entity
                if let Some((etype, start, end, confs)) = current_entity.take() {
                    let avg_conf = confs.iter().sum::<f32>() / confs.len() as f32;
                    let entity_text = text[start..end].trim().to_string();
                    if !entity_text.is_empty() {
                        entities.push(Entity {
                            entity_type: etype,
                            text: entity_text,
                            start,
                            end,
                            confidence: avg_conf,
                        });
                    }
                }
                // Start new entity
                if let Some(etype) = EntityType::from_label(label) {
                    current_entity = Some((etype, char_start, char_end, vec![conf]));
                }
            } else if label.starts_with("I-") {
                // Continue current entity if types match
                if let Some((ref etype, _, ref mut end, ref mut confs)) = current_entity {
                    let i_type = EntityType::from_label(label);
                    if i_type.as_ref() == Some(etype) {
                        *end = char_end;
                        confs.push(conf);
                    } else {
                        // Type mismatch — flush and start new
                        let (etype, start, end, confs) = current_entity.take().unwrap();
                        let avg_conf = confs.iter().sum::<f32>() / confs.len() as f32;
                        let entity_text = text[start..end].trim().to_string();
                        if !entity_text.is_empty() {
                            entities.push(Entity {
                                entity_type: etype,
                                text: entity_text,
                                start,
                                end,
                                confidence: avg_conf,
                            });
                        }
                        if let Some(new_type) = i_type {
                            current_entity = Some((new_type, char_start, char_end, vec![conf]));
                        }
                    }
                } else if let Some(etype) = EntityType::from_label(label) {
                    // I- without B- — treat as B-
                    current_entity = Some((etype, char_start, char_end, vec![conf]));
                }
            } else {
                // O tag — flush current entity
                if let Some((etype, start, end, confs)) = current_entity.take() {
                    let avg_conf = confs.iter().sum::<f32>() / confs.len() as f32;
                    let entity_text = text[start..end].trim().to_string();
                    if !entity_text.is_empty() {
                        entities.push(Entity {
                            entity_type: etype,
                            text: entity_text,
                            start,
                            end,
                            confidence: avg_conf,
                        });
                    }
                }
            }
        }

        // Flush trailing entity
        if let Some((etype, start, end, confs)) = current_entity.take() {
            let avg_conf = confs.iter().sum::<f32>() / confs.len() as f32;
            let entity_text = text[start..end].trim().to_string();
            if !entity_text.is_empty() {
                entities.push(Entity {
                    entity_type: etype,
                    text: entity_text,
                    start,
                    end,
                    confidence: avg_conf,
                });
            }
        }

        Ok(entities)
    }

    /// Extract only entities of a specific type.
    pub fn extract_type(&self, text: &str, entity_type: EntityType) -> anyhow::Result<Vec<Entity>> {
        let all = self.extract(text)?;
        Ok(all.into_iter().filter(|e| e.entity_type == entity_type).collect())
    }

    /// Extract person names (PER) — useful for contact discovery from About pages.
    pub fn extract_persons(&self, text: &str) -> anyhow::Result<Vec<Entity>> {
        self.extract_type(text, EntityType::Person)
    }

    /// Extract organization names (ORG) — useful for competitor/partner detection.
    pub fn extract_organizations(&self, text: &str) -> anyhow::Result<Vec<Entity>> {
        self.extract_type(text, EntityType::Organization)
    }
}

/// Convenience: extract leadership candidates from company About page text.
/// Returns (person_name, nearby_title) pairs where a title-like phrase
/// follows within 50 characters of the person name.
pub fn extract_leadership(ner: &NerModel, text: &str) -> anyhow::Result<Vec<(String, Option<String>)>> {
    let entities = ner.extract(text)?;
    let mut results = Vec::new();

    for entity in &entities {
        if entity.entity_type != EntityType::Person {
            continue;
        }

        // Look for a title-like phrase near the person name
        let search_start = entity.end;
        let search_end = (entity.end + 80).min(text.len());
        if search_start >= text.len() {
            results.push((entity.text.clone(), None));
            continue;
        }

        let context = &text[search_start..search_end];
        let title = extract_title_from_context(context);
        results.push((entity.text.clone(), title));
    }

    Ok(results)
}

/// Simple title extraction from nearby context.
fn extract_title_from_context(context: &str) -> Option<String> {
    let lower = context.to_lowercase();

    static TITLE_PATTERNS: &[&str] = &[
        "ceo", "cto", "cfo", "coo", "cio", "cso",
        "vp of", "vice president",
        "head of", "director of", "manager of",
        "chief", "founder", "co-founder",
        "president", "partner",
        "lead", "principal", "senior",
    ];

    for pattern in TITLE_PATTERNS {
        if let Some(pos) = lower.find(pattern) {
            // Extract the title phrase (up to comma, period, or newline)
            let title_start = pos;
            let remaining = &context[title_start..];
            let title_end = remaining
                .find(|c: char| c == ',' || c == '.' || c == '\n' || c == '|' || c == '-')
                .unwrap_or(remaining.len().min(40));
            let title = remaining[..title_end].trim();
            if !title.is_empty() {
                return Some(title.to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entity_type_from_label() {
        assert_eq!(EntityType::from_label("B-PER"), Some(EntityType::Person));
        assert_eq!(EntityType::from_label("I-ORG"), Some(EntityType::Organization));
        assert_eq!(EntityType::from_label("B-LOC"), Some(EntityType::Location));
        assert_eq!(EntityType::from_label("I-MISC"), Some(EntityType::Misc));
        assert_eq!(EntityType::from_label("O"), None);
    }

    #[test]
    fn test_entity_type_as_str() {
        assert_eq!(EntityType::Person.as_str(), "PER");
        assert_eq!(EntityType::Organization.as_str(), "ORG");
    }

    #[test]
    fn test_extract_title_from_context() {
        assert_eq!(
            extract_title_from_context(", CEO and Co-founder"),
            Some("CEO and Co".to_string())
        );
        assert_eq!(
            extract_title_from_context(", VP of Engineering."),
            Some("VP of Engineering".to_string())
        );
        assert_eq!(extract_title_from_context(", an employee"), None);
    }

    #[test]
    fn test_labels_consistency() {
        assert_eq!(LABELS.len(), 9);
        assert_eq!(LABELS[0], "O");
        assert_eq!(LABELS[1], "B-PER");
        assert_eq!(LABELS[3], "B-ORG");
    }
}
