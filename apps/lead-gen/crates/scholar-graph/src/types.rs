use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PaperRow {
    pub id: i32,
    pub arxiv_id: Option<String>,
    pub title: String,
    pub abstract_text: Option<String>,
    pub categories: Option<String>,
    pub published_at: Option<String>,
    pub pdf_url: Option<String>,
    pub abs_url: Option<String>,
    pub doi: Option<String>,
    pub source: String,
    pub source_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthorRow {
    pub id: i32,
    pub name: String,
    pub name_normalized: Option<String>,
    pub semantic_scholar_id: Option<String>,
    pub orcid: Option<String>,
    pub affiliation: Option<String>,
    pub homepage_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CoAuthorEdge {
    pub author_id: i32,
    pub author_name: String,
    pub shared_papers: i64,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub paper_id: i32,
    pub title: String,
    pub authors_created: usize,
    pub authors_linked: usize,
}
