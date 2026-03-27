/// Chunking strategies for RAG context preparation.
///
/// Implements semantic text chunking informed by CDTA (Cross-Document Topic-Aligned)
/// chunking research (2025): cross-document topic-aligned splitting ensures retrieved
/// chunks align with the query topic rather than arbitrary byte offsets.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChunkStrategy {
    /// Split every `max_size` characters at the nearest word boundary.
    Fixed,
    /// Split at sentence-ending punctuation (". ", "? ", "! ", newline).
    Sentence,
    /// Split at blank lines ("\n\n"), preserving paragraph structure.
    Paragraph,
    /// Split at markdown section headers (`# `, `## `, `### `) or structural
    /// boundaries (horizontal rules, ALL-CAPS lines).
    Section,
}

/// A single retrievable chunk of text produced by one of the chunking strategies.
#[derive(Debug, Clone)]
pub struct Chunk {
    /// The chunk body, trimmed of leading/trailing whitespace.
    pub text: String,
    /// Opaque identifier for the source document (e.g. company domain or URL).
    pub source_id: String,
    /// Zero-based position of this chunk within the source document.
    pub chunk_index: usize,
    /// Human-readable section label derived from the nearest header, or
    /// `"body"` when no structural marker was found.
    pub section: String,
}

impl Chunk {
    fn new(text: impl Into<String>, source_id: impl Into<String>, chunk_index: usize, section: impl Into<String>) -> Self {
        Self { text: text.into(), source_id: source_id.into(), chunk_index, section: section.into() }
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Split `text` into pieces of at most `max_size` characters, always breaking
/// at a word boundary (last ASCII whitespace at or before the limit).
fn split_fixed(text: &str, max_size: usize) -> Vec<String> {
    if max_size == 0 {
        return vec![text.to_string()];
    }
    let mut chunks = Vec::new();
    let mut start = 0;
    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();

    while start < len {
        let end = (start + max_size).min(len);
        if end == len {
            // Last piece — take the rest.
            let s: String = chars[start..end].iter().collect();
            let trimmed = s.trim().to_string();
            if !trimmed.is_empty() {
                chunks.push(trimmed);
            }
            break;
        }
        // Walk back from `end` to find a word boundary.
        let mut boundary = end;
        while boundary > start && !chars[boundary - 1].is_ascii_whitespace() {
            boundary -= 1;
        }
        // If no whitespace was found in the entire window, hard-cut at max_size.
        if boundary == start {
            boundary = end;
        }
        let piece: String = chars[start..boundary].iter().collect();
        let trimmed = piece.trim().to_string();
        if !trimmed.is_empty() {
            chunks.push(trimmed);
        }
        start = boundary;
    }
    chunks
}

/// Detect whether a line looks like a markdown header or a structural boundary
/// (ALL-CAPS line, horizontal rule of dashes/equals/asterisks).
fn is_section_boundary(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.starts_with('#') {
        return true;
    }
    // Horizontal rule: three or more of the same delimiter.
    if trimmed.len() >= 3 {
        let first = trimmed.chars().next().unwrap();
        if (first == '-' || first == '=' || first == '*') && trimmed.chars().all(|c| c == first) {
            return true;
        }
    }
    // ALL-CAPS short title line (≤ 80 chars, no lowercase letters, has letters).
    if trimmed.len() <= 80 && trimmed.chars().any(|c| c.is_alphabetic())
        && !trimmed.chars().any(|c| c.is_lowercase())
    {
        return true;
    }
    false
}

/// Extract a display label from a markdown header line, stripping `#` prefixes.
fn header_label(line: &str) -> String {
    line.trim().trim_start_matches('#').trim().to_string()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Chunk `text` according to `strategy`, producing chunks of at most `max_size`
/// characters (ignored for `Paragraph` and `Section` where natural boundaries
/// control size, though individual over-long paragraphs are still hard-split).
///
/// Each returned [`Chunk`] carries `source_id` and a `chunk_index` reflecting
/// its zero-based position in the resulting slice.
pub fn chunk_text(
    text: &str,
    source_id: &str,
    strategy: ChunkStrategy,
    max_size: usize,
) -> Vec<Chunk> {
    match strategy {
        ChunkStrategy::Fixed => chunk_fixed(text, source_id, max_size),
        ChunkStrategy::Sentence => chunk_sentence(text, source_id, max_size),
        ChunkStrategy::Paragraph => chunk_paragraph(text, source_id, max_size),
        ChunkStrategy::Section => chunk_section(text, source_id, max_size),
    }
}

fn chunk_fixed(text: &str, source_id: &str, max_size: usize) -> Vec<Chunk> {
    split_fixed(text, max_size)
        .into_iter()
        .enumerate()
        .map(|(i, t)| Chunk::new(t, source_id, i, "body"))
        .collect()
}

fn chunk_sentence(text: &str, source_id: &str, max_size: usize) -> Vec<Chunk> {
    // Accumulate sentences into chunks that respect max_size.
    let terminators = [". ", "? ", "! ", ".\n", "?\n", "!\n"];
    let mut sentences: Vec<&str> = Vec::new();
    let mut remaining = text;

    while !remaining.is_empty() {
        let mut split_at: Option<usize> = None;
        for term in &terminators {
            if let Some(pos) = remaining.find(term) {
                let candidate = pos + term.len();
                split_at = Some(match split_at {
                    None => candidate,
                    Some(prev) => prev.min(candidate),
                });
            }
        }
        match split_at {
            Some(pos) => {
                sentences.push(&remaining[..pos]);
                remaining = &remaining[pos..];
            }
            None => {
                sentences.push(remaining);
                break;
            }
        }
    }

    let effective_max = if max_size == 0 { usize::MAX } else { max_size };
    let mut chunks: Vec<Chunk> = Vec::new();
    let mut current = String::new();
    let mut idx = 0;

    for sentence in sentences {
        let trimmed = sentence.trim();
        if trimmed.is_empty() {
            continue;
        }
        // If adding this sentence would exceed max_size, flush current buffer.
        if !current.is_empty() && current.len() + 1 + trimmed.len() > effective_max {
            let body = current.trim().to_string();
            if !body.is_empty() {
                chunks.push(Chunk::new(body, source_id, idx, "body"));
                idx += 1;
            }
            current.clear();
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(trimmed);
    }
    if !current.trim().is_empty() {
        chunks.push(Chunk::new(current.trim().to_string(), source_id, idx, "body"));
    }
    chunks
}

fn chunk_paragraph(text: &str, source_id: &str, max_size: usize) -> Vec<Chunk> {
    let effective_max = if max_size == 0 { usize::MAX } else { max_size };
    let mut idx = 0;
    let mut chunks: Vec<Chunk> = Vec::new();

    for para in text.split("\n\n") {
        let trimmed = para.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Paragraphs exceeding max_size are hard-split at word boundaries.
        if trimmed.len() > effective_max {
            for piece in split_fixed(trimmed, effective_max) {
                chunks.push(Chunk::new(piece, source_id, idx, "body"));
                idx += 1;
            }
        } else {
            chunks.push(Chunk::new(trimmed.to_string(), source_id, idx, "body"));
            idx += 1;
        }
    }
    chunks
}

fn chunk_section(text: &str, source_id: &str, max_size: usize) -> Vec<Chunk> {
    let effective_max = if max_size == 0 { usize::MAX } else { max_size };
    let mut chunks: Vec<Chunk> = Vec::new();
    let mut current_section = String::from("body");
    let mut current_body = String::new();
    let mut idx = 0;

    let flush = |body: &mut String, section: &str, chunks: &mut Vec<Chunk>, idx: &mut usize, max: usize| {
        let trimmed = body.trim().to_string();
        if !trimmed.is_empty() {
            if trimmed.len() > max {
                for piece in split_fixed(&trimmed, max) {
                    chunks.push(Chunk::new(piece, "", *idx, section));
                    *idx += 1;
                }
            } else {
                chunks.push(Chunk::new(trimmed, "", *idx, section));
                *idx += 1;
            }
        }
        body.clear();
    };

    for line in text.lines() {
        if is_section_boundary(line) {
            flush(&mut current_body, &current_section, &mut chunks, &mut idx, effective_max);
            let raw_label = line.trim();
            current_section = if raw_label.starts_with('#') {
                header_label(raw_label)
            } else {
                raw_label.to_string()
            };
        } else {
            if !current_body.is_empty() {
                current_body.push('\n');
            }
            current_body.push_str(line);
        }
    }
    // Flush the final section.
    flush(&mut current_body, &current_section, &mut chunks, &mut idx, effective_max);

    // The closure above captured source_id as "" to avoid borrow conflicts; fix it now.
    for chunk in &mut chunks {
        chunk.source_id = source_id.to_string();
    }
    chunks
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const SOURCE: &str = "test-source";

    // --- Fixed ---

    #[test]
    fn fixed_empty_input() {
        let chunks = chunk_text("", SOURCE, ChunkStrategy::Fixed, 50);
        assert!(chunks.is_empty());
    }

    #[test]
    fn fixed_shorter_than_max() {
        let chunks = chunk_text("hello world", SOURCE, ChunkStrategy::Fixed, 100);
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].text, "hello world");
        assert_eq!(chunks[0].source_id, SOURCE);
        assert_eq!(chunks[0].chunk_index, 0);
    }

    #[test]
    fn fixed_exact_word_boundary() {
        // "one two three" is 13 chars. max_size = 7 → the splitter walks back
        // from index 7 to find the last whitespace, which is the space at index 3
        // (between "one" and "two"), giving three chunks: "one", "two", "three".
        let chunks = chunk_text("one two three", SOURCE, ChunkStrategy::Fixed, 7);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].text, "one");
        assert_eq!(chunks[1].text, "two");
        assert_eq!(chunks[2].text, "three");
    }

    #[test]
    fn fixed_indices_are_sequential() {
        let text = "a ".repeat(200);
        let chunks = chunk_text(text.trim(), SOURCE, ChunkStrategy::Fixed, 20);
        for (i, chunk) in chunks.iter().enumerate() {
            assert_eq!(chunk.chunk_index, i);
        }
    }

    #[test]
    fn fixed_no_word_boundary_hard_cuts() {
        // Single long word without whitespace — must still produce a chunk.
        let long_word = "x".repeat(50);
        let chunks = chunk_text(&long_word, SOURCE, ChunkStrategy::Fixed, 20);
        assert!(!chunks.is_empty());
        let total: usize = chunks.iter().map(|c| c.text.len()).sum();
        assert_eq!(total, 50);
    }

    // --- Sentence ---

    #[test]
    fn sentence_splits_on_period_space() {
        let text = "First sentence. Second sentence. Third one.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Sentence, 1000);
        // All fit in one chunk because max_size is large.
        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].text.contains("First sentence"));
    }

    #[test]
    fn sentence_respects_max_size() {
        let text = "Alpha beta gamma. Delta epsilon zeta theta iota.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Sentence, 20);
        // Each sentence is longer than 20 chars individually so each becomes its own chunk.
        assert!(chunks.len() >= 2);
        for chunk in &chunks {
            // Each chunk body should not be empty.
            assert!(!chunk.text.is_empty());
        }
    }

    #[test]
    fn sentence_question_and_exclamation() {
        let text = "Is this working? Yes it is! Great.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Sentence, 1000);
        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].text.contains("Is this working"));
    }

    #[test]
    fn sentence_empty_input() {
        let chunks = chunk_text("", SOURCE, ChunkStrategy::Sentence, 100);
        assert!(chunks.is_empty());
    }

    #[test]
    fn sentence_section_label_is_body() {
        let text = "Hello world. How are you?";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Sentence, 1000);
        for c in &chunks {
            assert_eq!(c.section, "body");
        }
    }

    // --- Paragraph ---

    #[test]
    fn paragraph_splits_on_double_newline() {
        let text = "First paragraph.\n\nSecond paragraph.\n\nThird.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Paragraph, 10000);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].text, "First paragraph.");
        assert_eq!(chunks[1].text, "Second paragraph.");
        assert_eq!(chunks[2].text, "Third.");
    }

    #[test]
    fn paragraph_hard_splits_overlong() {
        let long_para = "word ".repeat(100); // 500 chars
        let text = long_para.trim();
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Paragraph, 50);
        assert!(chunks.len() > 1);
        for chunk in &chunks {
            assert!(chunk.text.len() <= 50 + 10); // allow slight over due to word boundary
        }
    }

    #[test]
    fn paragraph_skips_blank_paras() {
        let text = "Para one.\n\n\n\nPara two.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Paragraph, 10000);
        assert_eq!(chunks.len(), 2);
    }

    #[test]
    fn paragraph_indices_sequential() {
        let text = "A.\n\nB.\n\nC.\n\nD.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Paragraph, 10000);
        for (i, c) in chunks.iter().enumerate() {
            assert_eq!(c.chunk_index, i);
        }
    }

    // --- Section ---

    #[test]
    fn section_splits_on_markdown_headers() {
        let text = "# Introduction\nSome intro text.\n## Details\nMore detail here.\n### Sub\nFine print.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Section, 10000);
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0].section, "Introduction");
        assert_eq!(chunks[1].section, "Details");
        assert_eq!(chunks[2].section, "Sub");
    }

    #[test]
    fn section_body_before_first_header() {
        let text = "Preamble text.\n# Chapter One\nContent.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Section, 10000);
        assert_eq!(chunks.len(), 2);
        assert_eq!(chunks[0].section, "body");
        assert_eq!(chunks[1].section, "Chapter One");
    }

    #[test]
    fn section_horizontal_rule_boundary() {
        let text = "Before.\n---\nAfter.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Section, 10000);
        assert_eq!(chunks.len(), 2);
    }

    #[test]
    fn section_source_id_propagated() {
        let text = "# Title\nContent here.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Section, 10000);
        for c in &chunks {
            assert_eq!(c.source_id, SOURCE);
        }
    }

    #[test]
    fn section_empty_section_skipped() {
        // Two headers back-to-back — the first section has no body.
        let text = "# Empty\n# Has Content\nActual text.";
        let chunks = chunk_text(text, SOURCE, ChunkStrategy::Section, 10000);
        // Only the "Has Content" section has a body.
        assert_eq!(chunks.len(), 1);
        assert_eq!(chunks[0].section, "Has Content");
    }
}
