//! BIO tag decoder for token classification output.
//!
//! Labels: B (begin skill), I (inside skill), O (outside).
//! Groups consecutive B+I* tokens into skill spans, mapping subword tokens
//! back to original text using tokenizer offsets.

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
            // If we had an active span, flush it
            if let Some(start) = current_start.take() {
                flush_span(&mut skills, start, current_end, &current_probs, original_text);
                current_probs.clear();
            }
            continue;
        }

        match label {
            0 => {
                // B — begin new skill. Flush any active span first.
                if let Some(start) = current_start.take() {
                    flush_span(&mut skills, start, current_end, &current_probs, original_text);
                    current_probs.clear();
                }
                current_start = Some(off_start);
                current_end = off_end;
                current_probs.push(probs[i]);
            }
            1 => {
                // I — continue skill span (only valid after B)
                if current_start.is_some() {
                    current_end = off_end;
                    current_probs.push(probs[i]);
                }
                // I without preceding B: skip (malformed prediction)
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
        //          0123456789...
        // Simplified: "Python" starts at 16, "machine learning" starts at 27
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
        assert!((skills[1].confidence - 0.9).abs() < 1e-6); // mean of 0.92, 0.88
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
    fn consecutive_skills() {
        let text = "Python React TypeScript";
        let labels = [2, 0, 0, 0, 2];
        let offsets = [(0, 0), (0, 6), (7, 12), (13, 23), (0, 0)];
        let probs = [0.9, 0.95, 0.93, 0.91, 0.9];

        let skills = decode_bio(&labels, &offsets, &probs, text);
        assert_eq!(skills.len(), 3);
        assert_eq!(skills[0].text, "Python");
        assert_eq!(skills[1].text, "React");
        assert_eq!(skills[2].text, "TypeScript");
    }
}
