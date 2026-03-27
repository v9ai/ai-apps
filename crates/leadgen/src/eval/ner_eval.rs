//! NER extraction evaluation — compares rule-based NER against LLM extractions.
//!
//! Uses cached LLM extraction results from SQLite as ground truth.
//! Computes precision, recall, and F1 per entity type.

use std::collections::HashSet;

/// Per-entity-type evaluation scores.
#[derive(Debug, Clone)]
pub struct EntityScores {
    pub entity_type: String,
    pub precision: f64,
    pub recall: f64,
    pub f1: f64,
    pub true_positives: usize,
    pub false_positives: usize,
    pub false_negatives: usize,
}

/// Aggregate NER evaluation result.
#[derive(Debug, Clone)]
pub struct NerEvalResult {
    pub per_type: Vec<EntityScores>,
    pub micro_precision: f64,
    pub micro_recall: f64,
    pub micro_f1: f64,
    pub total_pages: usize,
    pub ner_extractions: usize,
    pub llm_extractions: usize,
}

/// A single extracted entity for comparison.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ExtractedEntity {
    pub entity_type: String,
    /// Lowercased, trimmed value for fuzzy matching.
    pub normalized_value: String,
}

/// Compare NER output against LLM ground truth for a single page.
pub fn compare_extractions(
    ner_entities: &[ExtractedEntity],
    llm_entities: &[ExtractedEntity],
) -> Vec<EntityScores> {
    let types: HashSet<&str> = ner_entities
        .iter()
        .chain(llm_entities.iter())
        .map(|e| e.entity_type.as_str())
        .collect();

    types
        .into_iter()
        .map(|etype| {
            let ner_set: HashSet<&str> = ner_entities
                .iter()
                .filter(|e| e.entity_type == etype)
                .map(|e| e.normalized_value.as_str())
                .collect();

            let llm_set: HashSet<&str> = llm_entities
                .iter()
                .filter(|e| e.entity_type == etype)
                .map(|e| e.normalized_value.as_str())
                .collect();

            let tp = ner_set.intersection(&llm_set).count();
            let fp = ner_set.len().saturating_sub(tp);
            let fneg = llm_set.len().saturating_sub(tp);

            let precision = if tp + fp > 0 { tp as f64 / (tp + fp) as f64 } else { 0.0 };
            let recall = if tp + fneg > 0 { tp as f64 / (tp + fneg) as f64 } else { 0.0 };
            let f1 = if precision + recall > 0.0 {
                2.0 * precision * recall / (precision + recall)
            } else {
                0.0
            };

            EntityScores {
                entity_type: etype.to_string(),
                precision,
                recall,
                f1,
                true_positives: tp,
                false_positives: fp,
                false_negatives: fneg,
            }
        })
        .collect()
}

/// Aggregate scores across multiple pages into micro-averaged metrics.
pub fn aggregate_scores(all_scores: &[Vec<EntityScores>]) -> NerEvalResult {
    let mut total_tp = 0usize;
    let mut total_fp = 0usize;
    let mut total_fn = 0usize;

    // Per-type aggregation
    let mut type_tp: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut type_fp: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut type_fn: std::collections::HashMap<String, usize> = std::collections::HashMap::new();

    for page_scores in all_scores {
        for score in page_scores {
            *type_tp.entry(score.entity_type.clone()).or_default() += score.true_positives;
            *type_fp.entry(score.entity_type.clone()).or_default() += score.false_positives;
            *type_fn.entry(score.entity_type.clone()).or_default() += score.false_negatives;
            total_tp += score.true_positives;
            total_fp += score.false_positives;
            total_fn += score.false_negatives;
        }
    }

    let per_type: Vec<EntityScores> = type_tp
        .keys()
        .map(|etype| {
            let tp = type_tp[etype];
            let fp = type_fp.get(etype).copied().unwrap_or(0);
            let fneg = type_fn.get(etype).copied().unwrap_or(0);
            let precision = if tp + fp > 0 { tp as f64 / (tp + fp) as f64 } else { 0.0 };
            let recall = if tp + fneg > 0 { tp as f64 / (tp + fneg) as f64 } else { 0.0 };
            let f1 = if precision + recall > 0.0 {
                2.0 * precision * recall / (precision + recall)
            } else {
                0.0
            };
            EntityScores {
                entity_type: etype.clone(),
                precision,
                recall,
                f1,
                true_positives: tp,
                false_positives: fp,
                false_negatives: fneg,
            }
        })
        .collect();

    let micro_precision = if total_tp + total_fp > 0 {
        total_tp as f64 / (total_tp + total_fp) as f64
    } else {
        0.0
    };
    let micro_recall = if total_tp + total_fn > 0 {
        total_tp as f64 / (total_tp + total_fn) as f64
    } else {
        0.0
    };
    let micro_f1 = if micro_precision + micro_recall > 0.0 {
        2.0 * micro_precision * micro_recall / (micro_precision + micro_recall)
    } else {
        0.0
    };

    NerEvalResult {
        per_type,
        micro_precision,
        micro_recall,
        micro_f1,
        total_pages: all_scores.len(),
        ner_extractions: total_tp + total_fp,
        llm_extractions: total_tp + total_fn,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entity(etype: &str, val: &str) -> ExtractedEntity {
        ExtractedEntity {
            entity_type: etype.to_string(),
            normalized_value: val.to_lowercase(),
        }
    }

    #[test]
    fn perfect_match() {
        let ner = vec![entity("person", "john smith"), entity("title", "cto")];
        let llm = vec![entity("person", "john smith"), entity("title", "cto")];
        let scores = compare_extractions(&ner, &llm);

        for s in &scores {
            assert!((s.precision - 1.0).abs() < 0.001);
            assert!((s.recall - 1.0).abs() < 0.001);
            assert!((s.f1 - 1.0).abs() < 0.001);
        }
    }

    #[test]
    fn ner_misses_entity() {
        let ner = vec![entity("person", "john smith")];
        let llm = vec![entity("person", "john smith"), entity("person", "jane doe")];
        let scores = compare_extractions(&ner, &llm);

        let person = scores.iter().find(|s| s.entity_type == "person").unwrap();
        assert!((person.precision - 1.0).abs() < 0.001); // 1 TP, 0 FP
        assert!((person.recall - 0.5).abs() < 0.001); // 1 TP, 1 FN
    }

    #[test]
    fn ner_hallucinates_entity() {
        let ner = vec![entity("person", "john smith"), entity("person", "bob fake")];
        let llm = vec![entity("person", "john smith")];
        let scores = compare_extractions(&ner, &llm);

        let person = scores.iter().find(|s| s.entity_type == "person").unwrap();
        assert!((person.precision - 0.5).abs() < 0.001); // 1 TP, 1 FP
        assert!((person.recall - 1.0).abs() < 0.001); // 1 TP, 0 FN
    }

    #[test]
    fn empty_extractions() {
        let scores = compare_extractions(&[], &[]);
        assert!(scores.is_empty());
    }

    #[test]
    fn aggregate_micro_averaging() {
        let page1 = vec![
            EntityScores {
                entity_type: "person".into(),
                precision: 1.0, recall: 0.5, f1: 0.667,
                true_positives: 1, false_positives: 0, false_negatives: 1,
            },
        ];
        let page2 = vec![
            EntityScores {
                entity_type: "person".into(),
                precision: 0.5, recall: 1.0, f1: 0.667,
                true_positives: 1, false_positives: 1, false_negatives: 0,
            },
        ];

        let result = aggregate_scores(&[page1, page2]);
        // Micro: tp=2, fp=1, fn=1 → P=2/3, R=2/3, F1=2/3
        assert!((result.micro_precision - 2.0 / 3.0).abs() < 0.001);
        assert!((result.micro_recall - 2.0 / 3.0).abs() < 0.001);
    }
}
