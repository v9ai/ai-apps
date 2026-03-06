use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Work {
    pub id: Option<String>,
    pub doi: Option<String>,
    pub title: Option<String>,
    pub publication_year: Option<u32>,
    pub cited_by_count: Option<u64>,
    pub authorships: Option<Vec<Authorship>>,
    pub abstract_inverted_index: Option<HashMap<String, Vec<usize>>>,
    pub primary_location: Option<PrimaryLocation>,
    pub open_access: Option<OpenAccess>,
}

impl Work {
    /// Reconstruct plain-text abstract from the inverted index.
    ///
    /// OpenAlex stores abstracts as `{ "word": [pos1, pos2], ... }`.
    /// We sort by position to rebuild the original text.
    pub fn reconstruct_abstract(&self) -> Option<String> {
        let index = self.abstract_inverted_index.as_ref()?;
        if index.is_empty() {
            return None;
        }

        let mut positions: Vec<(usize, &str)> = Vec::new();
        for (word, indices) in index {
            for &pos in indices {
                positions.push((pos, word.as_str()));
            }
        }
        positions.sort_by_key(|(pos, _)| *pos);

        let words: Vec<&str> = positions.into_iter().map(|(_, w)| w).collect();
        Some(words.join(" "))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Authorship {
    pub author: Option<AuthorObj>,
    pub author_position: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorObj {
    pub id: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrimaryLocation {
    pub source: Option<Source>,
    pub pdf_url: Option<String>,
    pub landing_page_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Source {
    pub id: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAccess {
    pub is_oa: Option<bool>,
    pub oa_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMeta {
    pub count: Option<u64>,
    pub per_page: Option<u32>,
    pub page: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub meta: Option<SearchMeta>,
    pub results: Vec<Work>,
}
