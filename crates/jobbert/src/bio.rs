//! BIO tag decoder for token classification output.
//!
//! Labels: B (begin skill), I (inside skill), O (outside).
//! Groups consecutive B+I* and adjacent B+B tokens into skill spans,
//! mapping subword tokens back to original text using tokenizer offsets.
//!
//! The jobbert_knowledge_extraction model primarily uses B tags even for
//! continuation tokens, so adjacent B tokens are merged into a single span.

/// A skill span extracted from text via BIO tagging.
#[derive(Debug, Clone)]
pub struct ExtractedSkill {
    /// Raw skill text from the original input.
    pub text: String,
    /// Character start offset in original text.
    pub start: usize,
    /// Character end offset in original text.
    pub end: usize,
    /// Mean softmax probability across tokens in this span.
    pub confidence: f32,
}

/// Decode BIO-tagged token predictions into skill spans.
///
/// `labels` contains predicted label indices per token (0=B, 1=I, 2=O).
/// `offsets` contains (start_char, end_char) pairs from the tokenizer.
/// `probs` contains softmax probability of the predicted label per token.
/// Special tokens (offset (0,0)) are skipped.
///
/// Adjacent B tokens are merged into a single span (handles models that
/// don't properly use I tags for continuation).
pub fn decode_bio(
    labels: &[usize],
    offsets: &[(usize, usize)],
    probs: &[f32],
    original_text: &str,
) -> Vec<ExtractedSkill> {
    let mut skills = Vec::new();
    let mut current_start: Option<usize> = None;
    let mut current_end: usize = 0;
    let mut current_probs: Vec<f32> = Vec::new();

    for (i, (&label, &(off_start, off_end))) in labels.iter().zip(offsets).enumerate() {
        // Skip special tokens ([CLS], [SEP], [PAD]) which have offset (0, 0)
        if off_start == 0 && off_end == 0 {
            if let Some(start) = current_start.take() {
                flush_span(&mut skills, start, current_end, &current_probs, original_text);
                current_probs.clear();
            }
            continue;
        }

        match label {
            0 => {
                // B — begin skill or continue adjacent skill span.
                // Merge adjacent B tokens: if this B immediately follows the previous token,
                // extend the span instead of starting a new one.
                if let Some(_start) = current_start {
                    if off_start <= current_end + 1 {
                        // Adjacent or overlapping — extend span
                        current_end = off_end;
                        current_probs.push(probs[i]);
                    } else {
                        // Gap — flush previous span, start new one
                        flush_span(&mut skills, _start, current_end, &current_probs, original_text);
                        current_probs.clear();
                        current_start = Some(off_start);
                        current_end = off_end;
                        current_probs.push(probs[i]);
                    }
                } else {
                    current_start = Some(off_start);
                    current_end = off_end;
                    current_probs.push(probs[i]);
                }
            }
            1 => {
                // I — continue skill span (valid after B or another I)
                if current_start.is_some() {
                    current_end = off_end;
                    current_probs.push(probs[i]);
                }
                // I without preceding B: skip
            }
            _ => {
                // O — outside. Flush any active span.
                if let Some(start) = current_start.take() {
                    flush_span(&mut skills, start, current_end, &current_probs, original_text);
                    current_probs.clear();
                }
            }
        }
    }

    // Flush trailing span
    if let Some(start) = current_start {
        flush_span(&mut skills, start, current_end, &current_probs, original_text);
    }

    skills
}

fn flush_span(
    skills: &mut Vec<ExtractedSkill>,
    start: usize,
    end: usize,
    probs: &[f32],
    text: &str,
) {
    if start >= end || end > text.len() {
        return;
    }
    let span_text = text[start..end].trim().to_string();
    if span_text.is_empty() {
        return;
    }
    let confidence = if probs.is_empty() {
        0.0
    } else {
        probs.iter().sum::<f32>() / probs.len() as f32
    };
    skills.push(ExtractedSkill {
        text: span_text,
        start,
        end,
        confidence,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_bio_decode() {
        let text = "Experience with Python and machine learning required";
        let labels = [2, 2, 2, 0, 2, 0, 1, 2]; // O O O B O B I O
        let offsets = [
            (0, 0),   // [CLS]
            (0, 10),  // Experience
            (11, 15), // with
            (16, 22), // Python
            (23, 26), // and
            (27, 34), // machine
            (35, 43), // learning
            (0, 0),   // [SEP]
        ];
        let probs = [0.9, 0.8, 0.7, 0.95, 0.85, 0.92, 0.88, 0.9];

        let skills = decode_bio(&labels, &offsets, &probs, text);
        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].text, "Python");
        assert!((skills[0].confidence - 0.95).abs() < 1e-6);
        assert_eq!(skills[1].text, "machine learning");
        assert!((skills[1].confidence - 0.9).abs() < 1e-6);
    }

    #[test]
    fn adjacent_b_tokens_merge() {
        // Model outputs B-B for multi-word skills instead of B-I
        let text = "machine learning experience";
        let labels = [2, 0, 0, 2, 2]; // [CLS] B B O [SEP]
        let offsets = [
            (0, 0),   // [CLS]
            (0, 7),   // machine
            (8, 16),  // learning
            (17, 27), // experience
            (0, 0),   // [SEP]
        ];
        let probs = [0.9, 0.95, 0.93, 0.8, 0.9];

        let skills = decode_bio(&labels, &offsets, &probs, text);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].text, "machine learning");
    }

    #[test]
    fn separate_b_tokens_with_gap() {
        let text = "Python and React skills";
        let labels = [2, 0, 2, 0, 2, 2]; // [CLS] B O B O [SEP]
        let offsets = [
            (0, 0),   // [CLS]
            (0, 6),   // Python
            (7, 10),  // and
            (11, 16), // React
            (17, 23), // skills
            (0, 0),   // [SEP]
        ];
        let probs = [0.9, 0.95, 0.8, 0.93, 0.7, 0.9];

        let skills = decode_bio(&labels, &offsets, &probs, text);
        assert_eq!(skills.len(), 2);
        assert_eq!(skills[0].text, "Python");
        assert_eq!(skills[1].text, "React");
    }

    #[test]
    fn empty_input() {
        let skills = decode_bio(&[], &[], &[], "");
        assert!(skills.is_empty());
    }

    #[test]
    fn all_outside() {
        let labels = [2, 2, 2];
        let offsets = [(0, 0), (0, 5), (0, 0)];
        let probs = [0.9, 0.9, 0.9];
        let skills = decode_bio(&labels, &offsets, &probs, "hello");
        assert!(skills.is_empty());
    }

    #[test]
    fn subword_tokens_merge() {
        // Subword tokens like "scikit-learn" → "s", "##ci", "##ki", "##t", "-", "learn"
        let text = "use scikit-learn";
        let labels = [2, 2, 0, 0, 0, 0, 0, 0, 2]; // [CLS] O B B B B B B [SEP]
        let offsets = [
            (0, 0),   // [CLS]
            (0, 3),   // use
            (4, 5),   // s
            (5, 7),   // ##ci
            (7, 9),   // ##ki
            (9, 10),  // ##t
            (10, 11), // -
            (11, 16), // learn
            (0, 0),   // [SEP]
        ];
        let probs = [0.9, 0.8, 0.95, 0.94, 0.93, 0.92, 0.91, 0.90, 0.9];

        let skills = decode_bio(&labels, &offsets, &probs, text);
        assert_eq!(skills.len(), 1);
        assert_eq!(skills[0].text, "scikit-learn");
    }
}
