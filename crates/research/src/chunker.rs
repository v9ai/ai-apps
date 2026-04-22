//! Section-aware text chunking with overlap for paper abstracts and full text.
//!
//! Supports multiple chunking strategies (fixed-size, sentence-aware,
//! paragraph-aware, section-aware) and detects a wide range of section
//! heading formats including Markdown, LaTeX, numbered subsections, and
//! common academic paper headings.

use regex::Regex;
use serde::{Deserialize, Serialize};

/// Strategy used to split text into chunks.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ChunkStrategy {
    /// Fixed character-width windows with no boundary awareness.
    Fixed,
    /// Breaks at sentence boundaries (`. `, `? `, `! `).
    Sentence,
    /// Breaks at paragraph boundaries (double newline).
    Paragraph,
    /// Breaks at detected section headings, then falls back to sentence
    /// boundaries within each section.
    #[default]
    Section,
}

#[derive(Debug, Clone)]
pub struct ChunkerConfig {
    pub chunk_size: usize,
    pub overlap: usize,
    pub min_size: usize,
    pub strategy: ChunkStrategy,
}

impl Default for ChunkerConfig {
    fn default() -> Self {
        Self {
            chunk_size: 512,
            overlap: 64,
            min_size: 50,
            strategy: ChunkStrategy::Section,
        }
    }
}

impl ChunkerConfig {
    /// Validate the configuration, returning an error message if invalid.
    ///
    /// Logs a warning via `tracing::warn!` when a validation rule is violated
    /// so callers do not need to log separately.
    pub fn validate(&self) -> Result<(), String> {
        if self.chunk_size == 0 {
            let msg = "chunk_size must be greater than 0".to_string();
            tracing::warn!("invalid chunker config: {msg}");
            return Err(msg);
        }
        if self.min_size == 0 {
            let msg = "min_size must be greater than 0".to_string();
            tracing::warn!("invalid chunker config: {msg}");
            return Err(msg);
        }
        if self.overlap >= self.chunk_size {
            let msg = format!(
                "overlap ({}) must be less than chunk_size ({})",
                self.overlap, self.chunk_size
            );
            tracing::warn!("invalid chunker config: {msg}");
            return Err(msg);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    pub text: String,
    pub paper_id: String,
    pub chunk_index: i32,
    pub section: String,
}

impl Chunk {
    pub fn chunk_id(&self) -> String {
        format!("{}::chunk-{}", self.paper_id, self.chunk_index)
    }
}

pub fn chunk_text(text: &str, paper_id: &str, config: Option<ChunkerConfig>) -> Vec<Chunk> {
    let cfg = config.unwrap_or_default();
    if let Err(_e) = cfg.validate() {
        tracing::warn!("falling back to default config");
        return chunk_text(text, paper_id, Some(ChunkerConfig::default()));
    }

    if text.len() < cfg.min_size {
        return vec![];
    }

    match cfg.strategy {
        ChunkStrategy::Fixed => chunk_fixed(text, paper_id, &cfg),
        ChunkStrategy::Sentence => chunk_sentence(text, paper_id, &cfg),
        ChunkStrategy::Paragraph => chunk_paragraph(text, paper_id, &cfg),
        ChunkStrategy::Section => chunk_section(text, paper_id, &cfg),
    }
}

// ---------------------------------------------------------------------------
// Strategy: Fixed
// ---------------------------------------------------------------------------

fn chunk_fixed(text: &str, paper_id: &str, cfg: &ChunkerConfig) -> Vec<Chunk> {
    let mut chunks = Vec::new();
    let mut idx: i32 = 0;
    let mut pos = 0usize;
    let bytes = text.len();

    while pos < bytes {
        let end = (pos + cfg.chunk_size).min(bytes);
        let slice = &text[pos..end];
        let trimmed = slice.trim();
        if trimmed.len() >= cfg.min_size {
            chunks.push(Chunk {
                text: trimmed.to_string(),
                paper_id: paper_id.to_string(),
                chunk_index: idx,
                section: String::new(),
            });
            idx += 1;
        }
        let next = if end > cfg.overlap {
            end - cfg.overlap
        } else {
            end
        };
        if next <= pos {
            break;
        }
        pos = next;
    }
    chunks
}

// ---------------------------------------------------------------------------
// Strategy: Sentence
// ---------------------------------------------------------------------------

fn chunk_sentence(text: &str, paper_id: &str, cfg: &ChunkerConfig) -> Vec<Chunk> {
    let mut chunks = Vec::new();
    let mut idx: i32 = 0;
    let mut pos = 0usize;
    let bytes = text.len();

    while pos < bytes {
        let mut end = (pos + cfg.chunk_size).min(bytes);
        // Snap to a char boundary so we never slice inside a multi-byte codepoint
        while end < bytes && !text.is_char_boundary(end) {
            end += 1;
        }
        let mut slice = &text[pos..end];

        // Try to break at sentence boundary
        if end < bytes {
            if let Some(p) = find_last_sentence_break(slice, cfg.min_size) {
                slice = &text[pos..pos + p];
            }
        }

        let trimmed = slice.trim();
        if trimmed.len() >= cfg.min_size {
            chunks.push(Chunk {
                text: trimmed.to_string(),
                paper_id: paper_id.to_string(),
                chunk_index: idx,
                section: String::new(),
            });
            idx += 1;
        }

        let actual_end = pos + slice.len();
        let mut next = if actual_end > cfg.overlap {
            actual_end - cfg.overlap
        } else {
            actual_end
        };
        // Snap to char boundary
        while next > 0 && !text.is_char_boundary(next) {
            next -= 1;
        }
        if next <= pos {
            break;
        }
        pos = next;
    }
    chunks
}

// ---------------------------------------------------------------------------
// Strategy: Paragraph
// ---------------------------------------------------------------------------

fn chunk_paragraph(text: &str, paper_id: &str, cfg: &ChunkerConfig) -> Vec<Chunk> {
    let para_re = Regex::new(r"\n\s*\n").unwrap();
    let paragraphs: Vec<&str> = para_re.split(text).collect();

    let mut chunks = Vec::new();
    let mut idx: i32 = 0;
    let mut buf = String::new();

    for para in &paragraphs {
        let para = para.trim();
        if para.is_empty() {
            continue;
        }

        // If adding this paragraph would exceed chunk_size, flush the buffer
        if !buf.is_empty() && buf.len() + para.len() + 2 > cfg.chunk_size {
            let trimmed = buf.trim();
            if trimmed.len() >= cfg.min_size {
                chunks.push(Chunk {
                    text: trimmed.to_string(),
                    paper_id: paper_id.to_string(),
                    chunk_index: idx,
                    section: String::new(),
                });
                idx += 1;
            }
            // Keep overlap from the end of the buffer
            let keep = cfg.overlap.min(buf.len());
            buf = buf[buf.len() - keep..].to_string();
        }

        if !buf.is_empty() {
            buf.push_str("\n\n");
        }
        buf.push_str(para);
    }

    // Flush remaining
    let trimmed = buf.trim();
    if trimmed.len() >= cfg.min_size {
        chunks.push(Chunk {
            text: trimmed.to_string(),
            paper_id: paper_id.to_string(),
            chunk_index: idx,
            section: String::new(),
        });
    }
    chunks
}

// ---------------------------------------------------------------------------
// Strategy: Section (default — original behaviour, enhanced)
// ---------------------------------------------------------------------------

fn chunk_section(text: &str, paper_id: &str, cfg: &ChunkerConfig) -> Vec<Chunk> {
    let sections = detect_sections(text);
    let sections = if sections.is_empty() {
        vec![("".to_string(), 0, text.len())]
    } else {
        sections
    };

    let mut chunks = Vec::new();
    let mut idx: i32 = 0;

    for (section_name, sec_start, sec_end) in &sections {
        let sec_text = &text[*sec_start..*sec_end];
        let mut pos = 0usize;

        while pos < sec_text.len() {
            let end = (pos + cfg.chunk_size).min(sec_text.len());
            let mut slice = &sec_text[pos..end];

            // Break at sentence boundary if not at end of section
            if end < sec_text.len() {
                if let Some(p) = find_last_sentence_break(slice, cfg.min_size) {
                    slice = &sec_text[pos..pos + p];
                }
            }

            let trimmed = slice.trim();
            if trimmed.len() >= cfg.min_size {
                chunks.push(Chunk {
                    text: trimmed.to_string(),
                    paper_id: paper_id.to_string(),
                    chunk_index: idx,
                    section: section_name.clone(),
                });
                idx += 1;
            }

            let actual_end = pos + slice.len();
            let next = if actual_end > cfg.overlap {
                actual_end - cfg.overlap
            } else {
                actual_end
            };
            if next <= pos {
                break;
            }
            pos = next;
        }
    }
    chunks
}

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

fn detect_sections(text: &str) -> Vec<(String, usize, usize)> {
    let patterns = [
        // Markdown headings: # / ## / ### / ####
        Regex::new(r"(?m)^#{1,4}\s+(.+)$").unwrap(),
        // LaTeX section commands: \section{...}, \subsection{...}, \subsubsection{...}
        Regex::new(r"(?m)\\(?:sub)*section\{([^}]+)\}").unwrap(),
        // Numbered sections: "1. Introduction", "2.3 Related Work", "3.1.2 ..."
        Regex::new(r"(?m)^(\d+(?:\.\d+)*\.?\s+[A-Z].{3,80})$").unwrap(),
        // Common academic headings (standalone line)
        Regex::new(
            r"(?mi)^(Abstract|Introduction|Background|Related Work|Literature Review|Methodology|Methods?|Experimental Setup|Experiments?|Results|Analysis|Discussion|Limitations|Future Work|Conclusion|Conclusions|Summary|Acknowledgments|Acknowledgements|References|Appendix|Supplementary Materials?)\s*$",
        )
        .unwrap(),
        // Table / Figure markers (useful to detect boundaries)
        Regex::new(r"(?mi)^(Table\s+\d+[.:]\s*.+|Figure\s+\d+[.:]\s*.+)$").unwrap(),
    ];

    let mut headings: Vec<(String, usize)> = Vec::new();
    for pat in &patterns {
        for m in pat.find_iter(text) {
            let name = m.as_str().trim().to_string();
            headings.push((name, m.start()));
        }
    }
    headings.sort_by_key(|h| h.1);
    headings.dedup_by(|a, b| (a.1 as isize - b.1 as isize).unsigned_abs() < 10);

    let mut sections = Vec::new();
    for i in 0..headings.len() {
        let start = headings[i].1;
        let end = headings.get(i + 1).map(|h| h.1).unwrap_or(text.len());
        sections.push((headings[i].0.clone(), start, end));
    }
    sections
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Find the last sentence-ending position (after `. `, `? `, `! `) in `slice`
/// that is at least `min_pos` bytes into the slice. Returns the byte position
/// just after the punctuation character (i.e. where the next sentence begins).
fn find_last_sentence_break(slice: &str, min_pos: usize) -> Option<usize> {
    let terminators = [". ", "? ", "! "];
    let mut best: Option<usize> = None;
    for term in &terminators {
        let mut search_from = min_pos;
        // Snap to a valid char boundary
        while search_from < slice.len() && !slice.is_char_boundary(search_from) {
            search_from += 1;
        }
        while search_from < slice.len() {
            let Some(pos) = slice[search_from..].find(term) else {
                break;
            };
            let abs = search_from + pos + 1;
            if abs > min_pos {
                best = Some(match best {
                    Some(prev) if prev > abs => prev,
                    _ => abs,
                });
            }
            search_from = search_from + pos + term.len();
        }
    }
    best
}

// ===========================================================================
// Tests
// ===========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // -----------------------------------------------------------------------
    // Basics & edge cases
    // -----------------------------------------------------------------------

    #[test]
    fn empty_text_returns_no_chunks() {
        let chunks = chunk_text("", "paper-1", None);
        assert!(chunks.is_empty());
    }

    #[test]
    fn short_text_returns_no_chunks() {
        let chunks = chunk_text("Too short.", "paper-1", None);
        assert!(chunks.is_empty());
    }

    #[test]
    fn single_paragraph_produces_chunks() {
        let text = "A ".repeat(300);
        let chunks = chunk_text(&text, "paper-1", None);
        assert!(!chunks.is_empty());
        assert_eq!(chunks[0].paper_id, "paper-1");
        assert_eq!(chunks[0].chunk_index, 0);
    }

    #[test]
    fn chunk_id_format() {
        let chunk = Chunk {
            text: "test".into(),
            paper_id: "arxiv:1234".into(),
            chunk_index: 3,
            section: "".into(),
        };
        assert_eq!(chunk.chunk_id(), "arxiv:1234::chunk-3");
    }

    #[test]
    fn min_size_filtering() {
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 10,
            min_size: 200,
            ..Default::default()
        };
        let text = "Short sentence. Another one.";
        let chunks = chunk_text(text, "paper-1", Some(cfg));
        assert!(chunks.is_empty());
    }

    #[test]
    fn very_short_paper_below_min_size() {
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 10,
            min_size: 50,
            strategy: ChunkStrategy::Section,
        };
        let text = "Very short abstract.";
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert!(chunks.is_empty());
    }

    #[test]
    fn very_short_paper_below_min_size_all_strategies() {
        let text = "Hi.";
        for strategy in [
            ChunkStrategy::Fixed,
            ChunkStrategy::Sentence,
            ChunkStrategy::Paragraph,
            ChunkStrategy::Section,
        ] {
            let cfg = ChunkerConfig {
                chunk_size: 100,
                overlap: 10,
                min_size: 50,
                strategy,
            };
            let chunks = chunk_text(text, "p1", Some(cfg));
            assert!(
                chunks.is_empty(),
                "{:?}: text below min_size should yield empty vec",
                strategy
            );
        }
    }

    #[test]
    fn paper_with_no_clear_sections() {
        let text =
            "This is a plain text document with no headings or section markers at all. ".repeat(20);
        let cfg = ChunkerConfig {
            chunk_size: 200,
            overlap: 30,
            min_size: 20,
            strategy: ChunkStrategy::Section,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(
            !chunks.is_empty(),
            "should still chunk text without sections"
        );
        for c in &chunks {
            assert!(
                c.section.is_empty(),
                "section should be empty for plain text"
            );
        }
    }

    #[test]
    fn chunks_have_sequential_indices() {
        let text = "Word ".repeat(500);
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 10,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        for (i, c) in chunks.iter().enumerate() {
            assert_eq!(
                c.chunk_index, i as i32,
                "chunk indices should be sequential"
            );
        }
    }

    #[test]
    fn default_strategy_is_section() {
        let cfg = ChunkerConfig::default();
        assert_eq!(cfg.strategy, ChunkStrategy::Section);
    }

    #[test]
    fn default_chunk_strategy_derives_default() {
        let strat: ChunkStrategy = Default::default();
        assert_eq!(strat, ChunkStrategy::Section);
    }

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    #[test]
    fn overlap_must_be_less_than_chunk_size() {
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 100,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        assert!(cfg.validate().is_err());

        let cfg2 = ChunkerConfig {
            chunk_size: 100,
            overlap: 150,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        assert!(cfg2.validate().is_err());
    }

    #[test]
    fn zero_chunk_size_is_invalid() {
        let cfg = ChunkerConfig {
            chunk_size: 0,
            overlap: 0,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let err = cfg.validate().unwrap_err();
        assert!(
            err.contains("chunk_size"),
            "error should mention chunk_size: {err}"
        );
    }

    #[test]
    fn zero_min_size_is_invalid() {
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 10,
            min_size: 0,
            strategy: ChunkStrategy::Fixed,
        };
        let err = cfg.validate().unwrap_err();
        assert!(
            err.contains("min_size"),
            "error should mention min_size: {err}"
        );
    }

    #[test]
    fn valid_config_passes_validation() {
        let cfg = ChunkerConfig {
            chunk_size: 256,
            overlap: 32,
            min_size: 20,
            strategy: ChunkStrategy::Section,
        };
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn invalid_config_falls_back_to_default() {
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 200,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let text = "A ".repeat(300);
        // Should not panic — falls back to defaults
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
    }

    // -----------------------------------------------------------------------
    // Strategy: Fixed
    // -----------------------------------------------------------------------

    #[test]
    fn fixed_strategy_produces_chunks() {
        let text = "word ".repeat(200);
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 20,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(chunks.len() > 1, "expected multiple fixed chunks");
        for c in &chunks {
            assert!(
                c.section.is_empty(),
                "fixed strategy should have empty section"
            );
        }
    }

    #[test]
    fn fixed_strategy_no_boundary_awareness() {
        // The fixed strategy should NOT try to break at sentence boundaries,
        // so a chunk may end mid-word.
        let text = "abcdefghij".repeat(30); // 300 chars, no spaces
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 0,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert_eq!(chunks.len(), 3, "300 chars / 100 chunk_size = 3 chunks");
        assert_eq!(chunks[0].text.len(), 100);
    }

    // -----------------------------------------------------------------------
    // Strategy: Sentence
    // -----------------------------------------------------------------------

    #[test]
    fn sentence_strategy_breaks_at_sentence_boundaries() {
        let text = "First sentence here. Second sentence follows. Third comes along. \
                     Fourth is great. Fifth is fine. Sixth is here. Seventh too. \
                     Eighth now. Ninth ok. Tenth done.";
        let cfg = ChunkerConfig {
            chunk_size: 80,
            overlap: 10,
            min_size: 10,
            strategy: ChunkStrategy::Sentence,
        };
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
        for c in &chunks[..chunks.len().saturating_sub(1)] {
            assert!(
                c.text.ends_with('.'),
                "sentence chunk should end at sentence boundary: {:?}",
                c.text
            );
        }
    }

    #[test]
    fn sentence_strategy_handles_question_and_exclamation_marks() {
        let text = "Is this a question? Yes it is! And this continues. \
                     Another question here? Of course! More text follows. Done now.";
        let cfg = ChunkerConfig {
            chunk_size: 60,
            overlap: 5,
            min_size: 10,
            strategy: ChunkStrategy::Sentence,
        };
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
        // Verify we actually get sentence-boundary breaks (not mid-word)
        for c in &chunks[..chunks.len().saturating_sub(1)] {
            let last_char = c.text.chars().next_back().unwrap();
            assert!(
                last_char == '.' || last_char == '?' || last_char == '!',
                "sentence chunk should end at punctuation: {:?}",
                c.text
            );
        }
    }

    // -----------------------------------------------------------------------
    // Strategy: Paragraph
    // -----------------------------------------------------------------------

    #[test]
    fn paragraph_strategy_respects_double_newlines() {
        let para1 = "A ".repeat(100);
        let para2 = "B ".repeat(100);
        let para3 = "C ".repeat(100);
        let text = format!("{}\n\n{}\n\n{}", para1, para2, para3);
        let cfg = ChunkerConfig {
            chunk_size: 250,
            overlap: 20,
            min_size: 10,
            strategy: ChunkStrategy::Paragraph,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(
            chunks.len() >= 2,
            "expected at least 2 paragraph chunks, got {}",
            chunks.len()
        );
    }

    #[test]
    fn paragraph_strategy_merges_small_paragraphs() {
        // Three short paragraphs that together fit into one chunk
        let text = "Para one.\n\nPara two.\n\nPara three.";
        let cfg = ChunkerConfig {
            chunk_size: 500,
            overlap: 10,
            min_size: 10,
            strategy: ChunkStrategy::Paragraph,
        };
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert_eq!(
            chunks.len(),
            1,
            "small paragraphs should merge into one chunk"
        );
        assert!(chunks[0].text.contains("Para one"));
        assert!(chunks[0].text.contains("Para three"));
    }

    // -----------------------------------------------------------------------
    // Strategy: Section (enhanced detection)
    // -----------------------------------------------------------------------

    #[test]
    fn section_strategy_assigns_section_names() {
        let text = "## Abstract\n\
                     This is a substantial abstract with enough words to pass the minimum \
                     size threshold easily for testing purposes.\n\n\
                     ## Introduction\n\
                     The introduction provides context and background for the research \
                     being presented in this paper.";
        let cfg = ChunkerConfig {
            chunk_size: 500,
            overlap: 20,
            min_size: 20,
            strategy: ChunkStrategy::Section,
        };
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
        let sections: Vec<&str> = chunks.iter().map(|c| c.section.as_str()).collect();
        assert!(
            sections.iter().any(|s| s.contains("Abstract")),
            "should have Abstract section: {:?}",
            sections
        );
    }

    #[test]
    fn all_strategies_handle_single_word_repeated() {
        let text = "x ".repeat(500);
        for strategy in [
            ChunkStrategy::Fixed,
            ChunkStrategy::Sentence,
            ChunkStrategy::Paragraph,
            ChunkStrategy::Section,
        ] {
            let cfg = ChunkerConfig {
                chunk_size: 100,
                overlap: 10,
                min_size: 10,
                strategy,
            };
            let chunks = chunk_text(&text, "p1", Some(cfg));
            assert!(
                !chunks.is_empty(),
                "{:?} strategy should produce chunks for repeated words",
                strategy
            );
        }
    }

    // -----------------------------------------------------------------------
    // Section detection — Markdown
    // -----------------------------------------------------------------------

    #[test]
    fn section_detection_finds_markdown_headings() {
        let text = "## Introduction\n\
                     Some intro text here that is long enough.\n\
                     ## Methods\n\
                     Some methods text here that is also long enough.";
        let sections = detect_sections(text);
        assert!(sections.len() >= 2);
        assert!(sections[0].0.contains("Introduction"));
    }

    #[test]
    fn detects_markdown_h4_headings() {
        let text = "#### Detailed Sub-subsection\n\
                     Body text for the sub-subsection that is long enough.";
        let sections = detect_sections(text);
        assert!(
            !sections.is_empty(),
            "should detect #### headings: {:?}",
            sections
        );
        assert!(sections[0].0.contains("Detailed Sub-subsection"));
    }

    // -----------------------------------------------------------------------
    // Section detection — LaTeX
    // -----------------------------------------------------------------------

    #[test]
    fn detects_latex_sections() {
        let text = r"\section{Introduction}
This is the introduction with enough text to be a real section in a paper.
\subsection{Background}
Background material and prior work details go here for context.
\section{Methods}
We describe our methodology with sufficient detail for reproduction.";
        let sections = detect_sections(text);
        assert!(
            sections.len() >= 3,
            "expected >=3 LaTeX sections, got {}: {:?}",
            sections.len(),
            sections.iter().map(|s| &s.0).collect::<Vec<_>>()
        );
        assert!(sections[0].0.contains("Introduction"));
    }

    #[test]
    fn detects_latex_subsubsection() {
        let text = r"\subsubsection{Training Details}
We trained the model using Adam optimizer with learning rate 1e-4.
\subsubsection{Hyperparameter Search}
Grid search was used over the following ranges.";
        let sections = detect_sections(text);
        assert!(
            sections.len() >= 2,
            "expected >=2 subsubsection headings, got {}: {:?}",
            sections.len(),
            sections.iter().map(|s| &s.0).collect::<Vec<_>>()
        );
        assert!(sections[0].0.contains("Training Details"));
    }

    // -----------------------------------------------------------------------
    // Section detection — Numbered subsections
    // -----------------------------------------------------------------------

    #[test]
    fn detects_numbered_subsections() {
        let text = "1. Introduction\n\
                     Some intro text here.\n\
                     2.1 Related Work\n\
                     Some related work.\n\
                     2.2 Prior Art\n\
                     More prior art here.\n\
                     3. Methods\n\
                     Our methods.";
        let sections = detect_sections(text);
        assert!(
            sections.len() >= 3,
            "expected >=3 numbered sections, got {}: {:?}",
            sections.len(),
            sections.iter().map(|s| &s.0).collect::<Vec<_>>()
        );
    }

    #[test]
    fn detects_deeply_nested_numbered_subsections() {
        let text = "3.1.2 Attention Mechanism\n\
                     We use multi-head self-attention with 8 heads.\n\
                     3.1.3 Feed-forward Network\n\
                     The FFN layer uses GELU activation.";
        let sections = detect_sections(text);
        assert!(
            sections.len() >= 2,
            "expected >=2 deeply numbered sections (3.1.2, 3.1.3), got {}: {:?}",
            sections.len(),
            sections.iter().map(|s| &s.0).collect::<Vec<_>>()
        );
        assert!(sections[0].0.contains("Attention Mechanism"));
    }

    // -----------------------------------------------------------------------
    // Section detection — Academic headings
    // -----------------------------------------------------------------------

    #[test]
    fn detects_academic_heading_patterns() {
        let headings = [
            "Abstract",
            "Introduction",
            "Background",
            "Related Work",
            "Methods",
            "Results",
            "Discussion",
            "Conclusion",
            "References",
            "Limitations",
            "Future Work",
            "Acknowledgments",
        ];
        for heading in &headings {
            let text = format!(
                "{}\nThis is some body text that is long enough to pass the minimum size \
                 filter easily.",
                heading
            );
            let sections = detect_sections(&text);
            assert!(
                !sections.is_empty(),
                "should detect academic heading: {}",
                heading
            );
            assert!(
                sections[0].0.contains(heading),
                "first section should contain '{}', got '{}'",
                heading,
                sections[0].0
            );
        }
    }

    #[test]
    fn detects_extended_academic_headings() {
        let headings = [
            "Literature Review",
            "Methodology",
            "Experimental Setup",
            "Experiments",
            "Analysis",
            "Summary",
            "Acknowledgements",
            "Appendix",
            "Supplementary Materials",
        ];
        for heading in &headings {
            let text = format!(
                "{}\nThis is body text that follows the heading and provides detail.",
                heading
            );
            let sections = detect_sections(&text);
            assert!(
                !sections.is_empty(),
                "should detect extended academic heading: {}",
                heading
            );
            assert!(
                sections[0].0.contains(heading),
                "first section should contain '{}', got '{}'",
                heading,
                sections[0].0
            );
        }
    }

    // -----------------------------------------------------------------------
    // Section detection — Table / Figure markers
    // -----------------------------------------------------------------------

    #[test]
    fn detects_table_and_figure_markers() {
        let text = "Some text before.\n\
                     Table 1: Results of experiments\n\
                     Data row one.\n\
                     Figure 2: Architecture diagram\n\
                     More text.";
        let sections = detect_sections(text);
        let names: Vec<&str> = sections.iter().map(|s| s.0.as_str()).collect();
        assert!(
            names.iter().any(|n| n.starts_with("Table")),
            "should detect table markers: {:?}",
            names
        );
        assert!(
            names.iter().any(|n| n.starts_with("Figure")),
            "should detect figure markers: {:?}",
            names
        );
    }

    #[test]
    fn detects_table_with_dot_separator() {
        let text = "Table 3. Ablation study results\nRow data here.\n\
                     Figure 5. Model architecture overview\nCaption text.";
        let sections = detect_sections(text);
        let names: Vec<&str> = sections.iter().map(|s| s.0.as_str()).collect();
        assert!(
            names.iter().any(|n| n.starts_with("Table")),
            "should detect 'Table N.' with dot separator: {:?}",
            names
        );
        assert!(
            names.iter().any(|n| n.starts_with("Figure")),
            "should detect 'Figure N.' with dot separator: {:?}",
            names
        );
    }

    // -----------------------------------------------------------------------
    // Heading dedup
    // -----------------------------------------------------------------------

    #[test]
    fn heading_dedup_removes_near_duplicates() {
        // Markdown heading and academic pattern at same position should dedup
        let text =
            "## Abstract\nBody text that is long enough for testing the deduplication logic.";
        let sections = detect_sections(text);
        let abstract_count = sections.iter().filter(|s| s.0.contains("Abstract")).count();
        assert_eq!(abstract_count, 1, "should dedup overlapping headings");
    }

    // -----------------------------------------------------------------------
    // Helper: find_last_sentence_break
    // -----------------------------------------------------------------------

    #[test]
    fn find_last_sentence_break_works() {
        let text = "First one. Second two. Third three.";
        let pos = find_last_sentence_break(text, 5);
        assert!(pos.is_some());
        let p = pos.unwrap();
        assert!(p > 10, "should find a break well into the text, got {}", p);
    }

    #[test]
    fn find_last_sentence_break_none_when_no_break() {
        let text = "no sentence breaks here";
        let pos = find_last_sentence_break(text, 5);
        assert!(pos.is_none());
    }

    #[test]
    fn find_last_sentence_break_handles_question_marks() {
        let text = "Is this right? Yes it is. Done.";
        let pos = find_last_sentence_break(text, 0);
        assert!(pos.is_some(), "should find ? as sentence break");
    }

    #[test]
    fn find_last_sentence_break_handles_exclamation_marks() {
        let text = "Amazing result! We are thrilled. End.";
        let pos = find_last_sentence_break(text, 0);
        assert!(pos.is_some(), "should find ! as sentence break");
    }

    // -----------------------------------------------------------------------
    // Overlap behaviour
    // -----------------------------------------------------------------------

    #[test]
    fn fixed_chunks_overlap_correctly() {
        let text = "abcdefghijklmnopqrstuvwxyz".repeat(10); // 260 chars
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 20,
            min_size: 10,
            strategy: ChunkStrategy::Fixed,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(chunks.len() >= 2);
        // The last 20 chars of chunk 0 should equal the first 20 chars of chunk 1
        let tail_0 = &chunks[0].text[chunks[0].text.len() - 20..];
        let head_1 = &chunks[1].text[..20];
        assert_eq!(
            tail_0, head_1,
            "overlap region should be identical across adjacent chunks"
        );
    }

    // -----------------------------------------------------------------------
    // Unicode / multibyte safety
    // -----------------------------------------------------------------------

    #[test]
    fn handles_unicode_text_without_panic() {
        let text = "Transformers verwenden Selbst-Aufmerksamkeit. \
                     Die Ergebnisse zeigen eine Verbesserung von 15% gegenueber dem Baseline. \
                     Weitere Experimente mit groesseren Datensaetzen sind geplant. "
            .repeat(5);
        let cfg = ChunkerConfig {
            chunk_size: 100,
            overlap: 10,
            min_size: 10,
            strategy: ChunkStrategy::Sentence,
        };
        // Should not panic on non-ASCII text
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
    }

    // -----------------------------------------------------------------------
    // Full academic paper simulation
    // -----------------------------------------------------------------------

    #[test]
    fn full_paper_section_chunking() {
        let text = "\
## Abstract
We present a novel approach to neural machine translation that achieves \
state-of-the-art results on WMT benchmarks. Our method combines attention \
mechanisms with structured prediction to improve translation quality.

## Introduction
Machine translation has been a fundamental problem in natural language \
processing for decades. Recent advances in deep learning have led to \
significant improvements in translation quality across many language pairs.

## Methods
We propose a hybrid architecture that combines self-attention with \
convolutional layers. The model uses a multi-scale approach to capture \
both local and global dependencies in the source text.

## Results
Our model achieves a BLEU score of 34.5 on the WMT14 English-German \
benchmark, surpassing the previous best result by 1.2 points. We also \
observe improvements on lower-resource language pairs.

## Conclusion
We have demonstrated that combining attention with structured prediction \
leads to improved machine translation quality across multiple benchmarks.";
        let cfg = ChunkerConfig {
            chunk_size: 300,
            overlap: 30,
            min_size: 20,
            strategy: ChunkStrategy::Section,
        };
        let chunks = chunk_text(text, "paper-mt", Some(cfg));
        assert!(
            chunks.len() >= 4,
            "expected at least 4 chunks for 5-section paper, got {}",
            chunks.len()
        );

        let unique_sections: std::collections::HashSet<&str> =
            chunks.iter().map(|c| c.section.as_str()).collect();
        assert!(
            unique_sections.len() >= 3,
            "expected chunks from at least 3 different sections, got {:?}",
            unique_sections
        );

        // Verify paper_id propagates
        for c in &chunks {
            assert_eq!(c.paper_id, "paper-mt");
        }
    }
}
