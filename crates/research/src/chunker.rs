//! Section-aware text chunking with overlap for paper abstracts and full text.

use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct ChunkerConfig {
    pub chunk_size: usize,
    pub overlap: usize,
    pub min_size: usize,
}

impl Default for ChunkerConfig {
    fn default() -> Self {
        Self {
            chunk_size: 512,
            overlap: 64,
            min_size: 50,
        }
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
    if text.len() < cfg.min_size {
        return vec![];
    }

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
                if let Some(p) = slice.rfind(". ") {
                    if p > cfg.min_size {
                        slice = &sec_text[pos..pos + p + 1];
                    }
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

fn detect_sections(text: &str) -> Vec<(String, usize, usize)> {
    let patterns = [
        Regex::new(r"(?m)^#{1,3}\s+(.+)$").unwrap(),
        Regex::new(r"(?m)^(\d+\.?\s+[A-Z].{3,80})$").unwrap(),
        Regex::new(
            r"(?mi)^(Abstract|Introduction|Related Work|Methods?|Results|Discussion|Conclusion|References)",
        )
        .unwrap(),
    ];

    let mut headings: Vec<(String, usize)> = Vec::new();
    for pat in &patterns {
        for m in pat.find_iter(text) {
            headings.push((m.as_str().trim().to_string(), m.start()));
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

#[cfg(test)]
mod tests {
    use super::*;

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
        };
        let text = "Short sentence. Another one.";
        let chunks = chunk_text(text, "paper-1", Some(cfg));
        assert!(chunks.is_empty());
    }
}
