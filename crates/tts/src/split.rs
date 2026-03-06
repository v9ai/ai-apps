/// Default max characters per chunk (~500 chars gives safety margin under 600-char API limit).
const DEFAULT_MAX_CHARS: usize = 500;

/// Split text into chunks that respect the 600-character API input limit.
///
/// Splits at sentence boundaries (`.`, `!`, `?`), accumulating up to ~500 chars per chunk.
/// Falls back to clause boundaries (`, ; :`), then hard-splits on word boundaries.
pub fn split_text(text: &str) -> Vec<String> {
    split_text_with_max_chars(text, DEFAULT_MAX_CHARS)
}

/// Split text with a configurable max-characters-per-chunk limit.
pub fn split_text_with_max_chars(text: &str, max_chars: usize) -> Vec<String> {
    let sentences = split_sentences(text);
    let mut chunks = Vec::new();
    let mut current = String::new();

    for sentence in sentences {
        let sentence = sentence.trim();
        if sentence.is_empty() {
            continue;
        }

        let len = sentence.len();

        // Single sentence exceeds limit — break it down further
        if len > max_chars {
            if !current.is_empty() {
                chunks.push(current.trim().to_owned());
                current = String::new();
            }
            let sub_chunks = split_long_sentence(sentence, max_chars);
            chunks.extend(sub_chunks);
            continue;
        }

        // Would adding this sentence exceed the limit?
        let separator_len = if current.is_empty() { 0 } else { 1 };
        if current.len() + separator_len + len > max_chars && !current.is_empty() {
            chunks.push(current.trim().to_owned());
            current = String::new();
        }

        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(sentence);
    }

    if !current.trim().is_empty() {
        chunks.push(current.trim().to_owned());
    }

    chunks
}

/// Split text on sentence-ending punctuation, keeping the punctuation attached.
fn split_sentences(text: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        current.push(ch);
        if matches!(ch, '.' | '!' | '?') {
            sentences.push(current.clone());
            current.clear();
        }
    }
    if !current.trim().is_empty() {
        sentences.push(current);
    }
    sentences
}

/// Break a single long sentence into chunks at clause boundaries, then hard word-split.
fn split_long_sentence(sentence: &str, max_chars: usize) -> Vec<String> {
    let clauses = split_on_clauses(sentence);
    if clauses.len() > 1 {
        let mut chunks = Vec::new();
        let mut current = String::new();

        for clause in &clauses {
            if clause.len() > max_chars {
                if !current.is_empty() {
                    chunks.push(current.trim().to_owned());
                    current = String::new();
                }
                chunks.extend(hard_split(clause, max_chars));
                continue;
            }
            let sep_len = if current.is_empty() { 0 } else { 0 }; // clauses already include delimiter
            if current.len() + sep_len + clause.len() > max_chars && !current.is_empty() {
                chunks.push(current.trim().to_owned());
                current = String::new();
            }
            current.push_str(clause);
        }
        if !current.trim().is_empty() {
            chunks.push(current.trim().to_owned());
        }
        return chunks;
    }

    hard_split(sentence, max_chars)
}

/// Split on clause-level punctuation (`, ; :`), keeping the delimiter attached to the left part.
fn split_on_clauses(text: &str) -> Vec<String> {
    let mut parts = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        current.push(ch);
        if matches!(ch, ',' | ';' | ':') {
            parts.push(current.clone());
            current.clear();
        }
    }
    if !current.is_empty() {
        parts.push(current);
    }
    parts
}

/// Hard-split text on word boundaries to fit within max_chars per chunk.
fn hard_split(text: &str, max_chars: usize) -> Vec<String> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut chunks = Vec::new();
    let mut current = String::new();

    for word in words {
        let sep_len = if current.is_empty() { 0 } else { 1 };
        if current.len() + sep_len + word.len() > max_chars && !current.is_empty() {
            chunks.push(current);
            current = String::new();
        }
        if !current.is_empty() {
            current.push(' ');
        }
        current.push_str(word);
    }
    if !current.is_empty() {
        chunks.push(current);
    }
    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn basic_split() {
        let text = "Hello world. How are you? I am fine!";
        let chunks = split_text_with_max_chars(text, 600);
        assert_eq!(chunks.len(), 1);
        assert!(chunks[0].contains("Hello"));
    }

    #[test]
    fn respects_max_chars() {
        let text = "First sentence here. Second sentence here. Third one. Fourth one too.";
        let chunks = split_text_with_max_chars(text, 30);
        assert!(chunks.len() >= 2);
        for chunk in &chunks {
            assert!(chunk.len() <= 31, "chunk too long ({}): {chunk}", chunk.len());
        }
    }

    #[test]
    fn handles_long_sentence() {
        // A sentence longer than 500 chars
        let long = (0..100).map(|i| format!("word{i}")).collect::<Vec<_>>().join(" ");
        let text = format!("{long}.");
        let chunks = split_text_with_max_chars(&text, 100);
        assert!(chunks.len() >= 3);
        for chunk in &chunks {
            assert!(chunk.len() <= 100, "chunk too long ({}): {}", chunk.len(), &chunk[..40]);
        }
    }

    #[test]
    fn empty_text() {
        assert!(split_text("").is_empty());
        assert!(split_text("   ").is_empty());
    }

    #[test]
    fn preserves_all_text() {
        let text = "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs!";
        let chunks = split_text_with_max_chars(text, 50);
        let rejoined = chunks.join(" ");
        for word in text.split_whitespace() {
            let word_clean = word.trim_matches(|c: char| c.is_ascii_punctuation());
            assert!(rejoined.contains(word_clean), "missing word: {word_clean}");
        }
    }

    #[test]
    fn default_split_keeps_under_limit() {
        // Build a text of ~2000 chars with sentences
        let text = (0..50)
            .map(|i| format!("This is sentence number {i} with some extra filler text."))
            .collect::<Vec<_>>()
            .join(" ");
        let chunks = split_text(&text);
        for chunk in &chunks {
            assert!(
                chunk.len() <= DEFAULT_MAX_CHARS + 50, // small tolerance for sentence boundaries
                "chunk too long ({}): {}...",
                chunk.len(),
                &chunk[..60]
            );
        }
    }

    #[test]
    fn all_chunks_under_600() {
        // Simulate a realistic document
        let text = (0..200)
            .map(|i| format!("Sentence {i}: the quick brown fox jumps over the lazy dog, and the cow jumped over the moon."))
            .collect::<Vec<_>>()
            .join(" ");
        let chunks = split_text(&text);
        for (i, chunk) in chunks.iter().enumerate() {
            assert!(
                chunk.len() <= 600,
                "chunk {i} exceeds 600 chars ({}): {}...",
                chunk.len(),
                &chunk[..80.min(chunk.len())]
            );
        }
    }
}
