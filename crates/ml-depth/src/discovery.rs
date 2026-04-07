//! Candidate discovery strategies for finding orgs likely to be genuine deep ML.

use anyhow::Result;
use tracing::info;

use hf::db::HfDb;
use hf::{HfClient, RepoType};

/// Discover candidate ML orgs from HuggingFace.
pub struct CandidateDiscovery<'a> {
    client: &'a HfClient,
}

impl<'a> CandidateDiscovery<'a> {
    pub fn new(client: &'a HfClient) -> Self {
        Self { client }
    }

    /// Discover orgs by searching for ML-specific keywords.
    ///
    /// Returns org names (authors) that appear in search results.
    pub async fn discover_by_keywords(&self, limit: usize) -> Result<Vec<String>> {
        let keywords = [
            "speech recognition model trained",
            "object detection trained from scratch",
            "language model pre-trained",
            "custom architecture",
            "novel transformer",
            "conformer",
            "wav2vec",
            "pre-training",
        ];

        let mut orgs = std::collections::HashSet::new();

        for keyword in &keywords {
            info!(keyword, "searching HF models");
            match self.client.search_models(keyword, 100).await {
                Ok(repos) => {
                    for repo in &repos {
                        if let Some(author) = &repo.author {
                            orgs.insert(author.clone());
                        }
                    }
                }
                Err(e) => tracing::warn!(keyword, error = %e, "search failed"),
            }
            if orgs.len() >= limit {
                break;
            }
        }

        let mut result: Vec<String> = orgs.into_iter().collect();
        result.sort();
        result.truncate(limit);
        Ok(result)
    }

    /// Discover orgs by searching for PyTorch-native models (not just transformers wrappers).
    pub async fn discover_pytorch_orgs(&self, limit: usize) -> Result<Vec<String>> {
        info!("searching for PyTorch-native model orgs");
        let repos = self.client.list_by_library("pytorch", limit * 5).await?;

        let mut org_counts: std::collections::HashMap<String, usize> =
            std::collections::HashMap::new();
        for repo in &repos {
            if let Some(author) = &repo.author {
                *org_counts.entry(author.clone()).or_default() += 1;
            }
        }

        // Sort by count descending
        let mut orgs: Vec<(String, usize)> = org_counts.into_iter().collect();
        orgs.sort_by(|a, b| b.1.cmp(&a.1));

        Ok(orgs.into_iter().take(limit).map(|(name, _)| name).collect())
    }
}

/// Mine the local SQLite DB for candidate orgs.
pub struct DbMiner<'a> {
    db: &'a HfDb,
}

impl<'a> DbMiner<'a> {
    pub fn new(db: &'a HfDb) -> Self {
        Self { db }
    }

    /// Find top authors by model count from the local DB.
    pub fn top_model_authors(&self, limit: usize) -> Result<Vec<(String, usize, u64)>> {
        Ok(self.db.top_authors(RepoType::Model, limit)?)
    }

    /// Find authors who also publish datasets (stronger research signal).
    pub fn authors_with_datasets(&self, limit: usize) -> Result<Vec<String>> {
        let model_authors = self.db.top_authors(RepoType::Model, limit * 3)?;
        let mut result = Vec::new();

        for (author, _, _) in &model_authors {
            let summary = self.db.org_summary(author)?;
            if summary.dataset_count > 0 {
                result.push(author.clone());
            }
            if result.len() >= limit {
                break;
            }
        }

        Ok(result)
    }
}
