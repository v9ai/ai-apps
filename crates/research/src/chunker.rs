//! Section-aware text chunking with overlap for paper abstracts and full text.
//!
//! Supports multiple chunking strategies (fixed-size, sentence-aware,
//! paragraph-aware, section-aware) and detects a wide range of section
//! heading formats including Markdown, LaTeX, numbered subsections, and
//! common academic paper headings.

use regex::Regex;
use serde::{Deserialize, Serialize};

/// Strategy used to split text into chunks.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChunkStrategy {
    /// Fixed character-width windows with no boundary awareness.
    Fixed,
    /// Breaks at sentence boundaries (`. `, `? `, `! `).
    Sentence,
    /// Breaks at paragraph boundaries (double newline).
    Paragraph,
    /// Breaks at detected section headings, then falls back to sentence
    /// boundaries within each section.
    Section,
}

impl Default for ChunkStrategy {
    fn default() -> Self {
        Self::Section
    }
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
    pub fn validate(&self) -> Result<(), String> {
        if self.overlap >= self.chunk_size {
            return Err(format!(
                "overlap ({}) must be less than chunk_size ({})",
                self.overlap, self.chunk_size
            ));
        }
        if self.min_size == 0 {
            return Err("min_size must be greater than 0".to_string());
        }
        if self.chunk_size == 0 {
            return Err("chunk_size must be greater than 0".to_string());
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
    if let Err(e) = cfg.validate() {
        tracing::warn!("invalid chunker config: {e}; using defaults");
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
        let end = (pos + cfg.chunk_size).min(bytes);
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
        let end = headings
            .get(i + 1)
            .map(|h| h.1)
            .unwrap_or(text.len());
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
        while let Some(pos) = slice[search_from..].find(term) {
            let abs = search_from + pos + 1; // position after the punctuation
            if abs > min_pos {
                best = Some(match best {
                    Some(prev) if prev > abs => prev,
                    _ => abs,
                });
            }
            search_from = search_from + pos + term.len();
            if search_from >= slice.len() {
                break;
            }
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

    // ---- existing tests (preserved) ----

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
    fn section_detection_finds_markdown_headings() {
        let text = "## Introduction\nSome intro text here that is long enough.\n## Methods\nSome methods text here that is also long enough.";
        let sections = detect_sections(text);
        assert!(sections.len() >= 2);
        assert!(sections[0].0.contains("Introduction"));
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

    // ---- validation tests ----

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
        // overlap == chunk_size triggers the overlap check first
        assert!(cfg.validate().is_err());
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

    // ---- strategy: fixed ----

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
            assert!(c.section.is_empty(), "fixed strategy should have empty section");
        }
    }

    // ---- strategy: sentence ----

    #[test]
    fn sentence_strategy_breaks_at_sentence_boundaries() {
        let text = "First sentence here. Second sentence follows. Third comes along. Fourth is great. Fifth is fine. Sixth is here. Seventh too. Eighth now. Ninth ok. Tenth done.";
        let cfg = ChunkerConfig {
            chunk_size: 80,
            overlap: 10,
            min_size: 10,
            strategy: ChunkStrategy::Sentence,
        };
        let chunks = chunk_text(text, "p1", Some(cfg));
        assert!(!chunks.is_empty());
        // Each chunk (except possibly the last) should end with a period
        for c in &chunks[..chunks.len().saturating_sub(1)] {
            assert!(
                c.text.ends_with('.'),
                "sentence chunk should end at sentence boundary: {:?}",
                c.text
            );
        }
    }

    // ---- strategy: paragraph ----

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
        assert!(chunks.len() >= 2, "expected at least 2 paragraph chunks, got {}", chunks.len());
    }

    // ---- strategy: section (enhanced detection) ----

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
    fn detects_numbered_subsections() {
        let text = "1. Introduction\nSome intro text here.\n2.1 Related Work\nSome related work.\n2.2 Prior Art\nMore prior art here.\n3. Methods\nOur methods.";
        let sections = detect_sections(text);
        assert!(
            sections.len() >= 3,
            "expected >=3 numbered sections, got {}: {:?}",
            sections.len(),
            sections.iter().map(|s| &s.0).collect::<Vec<_>>()
        );
    }

    #[test]
    fn detects_academic_heading_patterns() {
        let headings = [
            "Abstract", "Introduction", "Background", "Related Work",
            "Methods", "Results", "Discussion", "Conclusion", "References",
            "Limitations", "Future Work", "Acknowledgments",
        ];
        for heading in &headings {
            let text = format!(
                "{}\nThis is some body text that is long enough to pass the minimum size filter easily.",
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
    fn detects_table_and_figure_markers() {
        let text = "Some text before.\nTable 1: Results of experiments\nData row one.\nFigure 2: Architecture diagram\nMore text.";
        let sections = detect_sections(text);
        let names: Vec<&str> = sections.iter().map(|s| s.0.as_str()).collect();
        assert!(
            names.iter().any(|n| n.starts_with("Table")),
            "should detect table markers: {:?}", names
        );
        assert!(
            names.iter().any(|n| n.starts_with("Figure")),
            "should detect figure markers: {:?}", names
        );
    }

    // ---- edge cases ----

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
    fn paper_with_no_clear_sections() {
        let text = "This is a plain text document with no headings or section markers at all. ".repeat(20);
        let cfg = ChunkerConfig {
            chunk_size: 200,
            overlap: 30,
            min_size: 20,
            strategy: ChunkStrategy::Section,
        };
        let chunks = chunk_text(&text, "p1", Some(cfg));
        assert!(!chunks.is_empty(), "should still chunk text without sections");
        for c in &chunks {
            assert!(c.section.is_empty(), "section should be empty for plain text");
        }
    }

    #[test]
    fn section_strategy_assigns_section_names() {
        let text = "## Abstract\nThis is a substantial abstract with enough words to pass the minimum size threshold easily for testing purposes.\n\n## Introduction\nThe introduction provides context and background for the research being presented in this paper.";
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
            "should have Abstract section: {:?}", sections
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

    #[test]
    fn default_strategy_is_section() {
        let cfg = ChunkerConfig::default();
        assert_eq!(cfg.strategy, ChunkStrategy::Section);
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
            assert_eq!(c.chunk_index, i as i32, "chunk indices should be sequential");
        }
    }

    #[test]
    fn find_last_sentence_break_works() {
        let text = "First one. Second two. Third three.";
        let pos = find_last_sentence_break(text, 5);
        assert!(pos.is_some());
        // Should find the last ". " break
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
    fn heading_dedup_removes_near_duplicates() {
        // Markdown heading and academic pattern at same position should dedup
        let text = "## Abstract\nBody text that is long enough for testing the deduplication logic.";
        let sections = detect_sections(text);
        // Should not have duplicate entries for "Abstract"
        let abstract_count = sections.iter().filter(|s| s.0.contains("Abstract")).count();
        assert_eq!(abstract_count, 1, "should dedup overlapping headings");
    }
}
