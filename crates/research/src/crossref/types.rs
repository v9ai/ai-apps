use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossrefWork {
    #[serde(rename = "DOI")]
    pub doi: Option<String>,
    pub title: Option<Vec<String>>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,
    pub author: Option<Vec<CrossrefAuthor>>,
    pub published: Option<DateParts>,
    #[serde(rename = "is-referenced-by-count")]
    pub is_referenced_by_count: Option<u64>,
    pub link: Option<Vec<CrossrefLink>>,
    #[serde(rename = "container-title")]
    pub container_title: Option<Vec<String>>,
    #[serde(rename = "type")]
    pub work_type: Option<String>,
    #[serde(rename = "URL")]
    pub url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossrefAuthor {
    pub given: Option<String>,
    pub family: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossrefLink {
    #[serde(rename = "URL")]
    pub url: Option<String>,
    #[serde(rename = "content-type")]
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DateParts {
    #[serde(rename = "date-parts")]
    pub date_parts: Option<Vec<Vec<u32>>>,
}

impl DateParts {
    pub fn year(&self) -> Option<u32> {
        self.date_parts
            .as_ref()
            .and_then(|outer| outer.first())
            .and_then(|inner| inner.first())
            .copied()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossrefMessage {
    #[serde(rename = "total-results")]
    pub total_results: Option<u64>,
    pub items: Option<Vec<CrossrefWork>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossrefResponse {
    pub status: Option<String>,
    pub message: Option<CrossrefMessage>,
}
