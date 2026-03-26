use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArxivPaper {
    pub arxiv_id: String,
    pub title: String,
    pub summary: String,
    pub authors: Vec<String>,
    pub published: String,
    pub updated: Option<String>,
    pub categories: Vec<String>,
    pub pdf_url: Option<String>,
    pub doi: Option<String>,
    pub comment: Option<String>,
    pub journal_ref: Option<String>,
    pub link_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ArxivSearchResponse {
    pub total_results: u64,
    pub start_index: u64,
    pub items_per_page: u64,
    pub papers: Vec<ArxivPaper>,
}
