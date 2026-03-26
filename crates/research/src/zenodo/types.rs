use serde::{Deserialize, Serialize};

/// A single Zenodo record (paper, dataset, software, etc.).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZenodoRecord {
    pub id: Option<u64>,
    pub doi: Option<String>,
    pub title: Option<String>,
    pub metadata: Option<ZenodoMetadata>,
    pub files: Option<Vec<ZenodoFile>>,
    pub links: Option<ZenodoLinks>,
    pub stats: Option<ZenodoStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZenodoMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub publication_date: Option<String>,
    pub doi: Option<String>,
    pub access_right: Option<String>,
    pub creators: Option<Vec<ZenodoCreator>>,
    pub keywords: Option<Vec<String>>,
    pub resource_type: Option<ZenodoResourceType>,
    pub license: Option<ZenodoLicense>,
    pub related_identifiers: Option<Vec<ZenodoRelatedIdentifier>>,
    pub references: Option<Vec<String>>,
    pub language: Option<String>,
    pub version: Option<String>,
    pub journal: Option<ZenodoJournal>,
    pub subjects: Option<Vec<ZenodoSubject>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoCreator {
    pub name: Option<String>,
    pub affiliation: Option<String>,
    pub orcid: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoResourceType {
    #[serde(rename = "type")]
    pub resource_type: Option<String>,
    pub subtype: Option<String>,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoLicense {
    pub id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoRelatedIdentifier {
    pub identifier: Option<String>,
    pub relation: Option<String>,
    pub resource_type: Option<String>,
    pub scheme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoJournal {
    pub title: Option<String>,
    pub volume: Option<String>,
    pub issue: Option<String>,
    pub pages: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoSubject {
    pub term: Option<String>,
    pub identifier: Option<String>,
    pub scheme: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoFile {
    pub id: Option<String>,
    pub key: Option<String>,
    pub size: Option<u64>,
    pub checksum: Option<String>,
    pub links: Option<ZenodoFileLinks>,
}

impl Default for ZenodoFile {
    fn default() -> Self {
        Self {
            id: None,
            key: None,
            size: None,
            checksum: None,
            links: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoFileLinks {
    #[serde(rename = "self")]
    pub self_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoLinks {
    #[serde(rename = "self")]
    pub self_url: Option<String>,
    pub self_html: Option<String>,
    pub doi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoStats {
    pub downloads: Option<u64>,
    pub unique_downloads: Option<u64>,
    pub views: Option<u64>,
    pub unique_views: Option<u64>,
}

// ─── Search response ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoSearchResponse {
    pub hits: Option<ZenodoHits>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZenodoHits {
    pub total: Option<u64>,
    pub hits: Vec<ZenodoRecord>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

impl ZenodoRecord {
    /// Extract a plain-text description by stripping HTML tags from metadata.
    pub fn plain_description(&self) -> Option<String> {
        let desc = self.metadata.as_ref()?.description.as_ref()?;
        Some(strip_html(desc))
    }

    /// Find the first PDF file download URL.
    pub fn pdf_url(&self) -> Option<String> {
        self.files.as_ref()?.iter().find_map(|f| {
            let key = f.key.as_deref()?;
            if key.ends_with(".pdf") {
                f.links.as_ref()?.self_url.clone()
            } else {
                None
            }
        })
    }
}

/// Strip simple HTML/XML tags from a string.
pub fn strip_html(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut in_tag = false;
    for ch in input.chars() {
        if ch == '<' {
            in_tag = true;
        } else if ch == '>' {
            in_tag = false;
        } else if !in_tag {
            result.push(ch);
        }
    }
    result.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_html_basic() {
        assert_eq!(strip_html("<p>Hello <b>world</b></p>"), "Hello world");
    }

    #[test]
    fn strip_html_empty() {
        assert_eq!(strip_html(""), "");
    }

    #[test]
    fn strip_html_no_tags() {
        assert_eq!(strip_html("plain text"), "plain text");
    }

    #[test]
    fn strip_html_jats() {
        assert_eq!(
            strip_html("<jats:p>Some abstract text.</jats:p>"),
            "Some abstract text."
        );
    }

    #[test]
    fn record_pdf_url_finds_pdf() {
        let record = ZenodoRecord {
            files: Some(vec![
                ZenodoFile {
                    key: Some("data.csv".into()),
                    links: Some(ZenodoFileLinks {
                        self_url: Some("https://zenodo.org/api/records/1/files/data.csv/content".into()),
                    }),
                    ..Default::default()
                },
                ZenodoFile {
                    key: Some("paper.pdf".into()),
                    links: Some(ZenodoFileLinks {
                        self_url: Some("https://zenodo.org/api/records/1/files/paper.pdf/content".into()),
                    }),
                    ..Default::default()
                },
            ]),
            ..Default::default()
        };
        assert_eq!(
            record.pdf_url().unwrap(),
            "https://zenodo.org/api/records/1/files/paper.pdf/content"
        );
    }

    #[test]
    fn record_pdf_url_none_when_no_pdf() {
        let record = ZenodoRecord {
            files: Some(vec![ZenodoFile {
                key: Some("data.csv".into()),
                links: Some(ZenodoFileLinks {
                    self_url: Some("https://zenodo.org/api/records/1/files/data.csv/content".into()),
                }),
                ..Default::default()
            }]),
            ..Default::default()
        };
        assert!(record.pdf_url().is_none());
    }

    #[test]
    fn record_plain_description_strips_html() {
        let record = ZenodoRecord {
            metadata: Some(ZenodoMetadata {
                description: Some("<p>An <em>important</em> paper.</p>".into()),
                ..Default::default()
            }),
            ..Default::default()
        };
        assert_eq!(record.plain_description().unwrap(), "An important paper.");
    }
}
