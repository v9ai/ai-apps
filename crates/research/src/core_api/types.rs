use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CoreWork {
    pub id: Option<u64>,
    pub doi: Option<String>,
    pub title: Option<String>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub authors: Option<Vec<CoreAuthor>>,
    pub year_published: Option<u32>,
    pub citation_count: Option<u64>,
    pub download_url: Option<String>,
    pub source_fulltext_urls: Option<Vec<String>>,
    pub language: Option<CoreLanguage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreLanguage {
    pub code: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreAuthor {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoreSearchResponse {
    pub total_hits: Option<u64>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
    pub results: Vec<CoreWork>,
}
