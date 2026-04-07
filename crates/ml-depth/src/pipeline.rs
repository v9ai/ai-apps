//! Full pipeline: HF org scan → paper search → ML depth scoring → verdict.

use anyhow::Result;
use tracing::info;

use hf::{HfClient, OrgProfile, OrgScanner};
use research::{
    ArxivClient, CompanyPaperSearch, MlDepthConfig, MlDepthScore, OpenAlexClient,
    ResearchPaper, SemanticScholarClient,
};

/// Complete company profile combining HF presence and academic output.
#[derive(Debug)]
pub struct CompanyProfile {
    pub company_name: String,
    pub hf_profile: Option<OrgProfile>,
    pub papers: Vec<ResearchPaper>,
    pub depth_score: MlDepthScore,
}

/// Orchestrates the full ML depth validation pipeline.
pub struct MlDepthPipeline {
    hf_client: HfClient,
    paper_search: CompanyPaperSearch,
    depth_config: MlDepthConfig,
}

impl MlDepthPipeline {
    /// Create a new pipeline from environment variables.
    ///
    /// Reads `HF_TOKEN` and `SEMANTIC_SCHOLAR_API_KEY` from env.
    pub fn from_env() -> Result<Self> {
        let hf_client = HfClient::from_env(8)?;
        let scholar_key = std::env::var("SEMANTIC_SCHOLAR_API_KEY").ok();
        let openalex_mailto = std::env::var("OPENALEX_MAILTO").ok();

        let openalex = OpenAlexClient::new(openalex_mailto.as_deref());
        let scholar = SemanticScholarClient::new(scholar_key.as_deref());
        let arxiv = ArxivClient::new();

        let paper_search = CompanyPaperSearch::new(openalex, scholar, arxiv);
        let depth_config = MlDepthConfig::default();

        Ok(Self {
            hf_client,
            paper_search,
            depth_config,
        })
    }

    /// Full pipeline for a single company.
    pub async fn profile_company(&self, company_name: &str) -> Result<CompanyProfile> {
        // 1. HF org scan
        info!(company = company_name, "scanning HuggingFace presence");
        let scanner = OrgScanner::new(&self.hf_client);
        let hf_profile = match scanner.scan_org(company_name).await {
            Ok(profile) => {
                info!(
                    company = company_name,
                    models = profile.models.len(),
                    datasets = profile.datasets.len(),
                    arxiv_links = profile.arxiv_links.len(),
                    training_signals = profile.training_signals.len(),
                    "HF scan complete"
                );
                Some(profile)
            }
            Err(e) => {
                tracing::warn!(company = company_name, error = %e, "HF scan failed");
                None
            }
        };

        // 2. Paper search across academic sources
        info!(company = company_name, "searching academic papers");
        let mut papers = self
            .paper_search
            .search_by_company(company_name, 50)
            .await
            .unwrap_or_default();

        // 2b. Also fetch any arXiv papers referenced in HF model cards
        if let Some(ref profile) = hf_profile {
            if !profile.arxiv_links.is_empty() {
                info!(
                    count = profile.arxiv_links.len(),
                    "fetching arXiv papers from HF model cards"
                );
                if let Ok(arxiv_papers) = self
                    .paper_search
                    .fetch_arxiv_papers(&profile.arxiv_links)
                    .await
                {
                    papers.extend(arxiv_papers);
                }
            }
        }

        info!(
            company = company_name,
            papers = papers.len(),
            "paper search complete"
        );

        // 3. Compute ML depth score
        let hf_score = hf_profile.as_ref().map(OrgScanner::compute_hf_score);
        let depth_score = self.depth_config.evaluate(&papers, hf_score);

        info!(
            company = company_name,
            verdict = %depth_score.verdict,
            overall = format!("{:.2}", depth_score.overall_score),
            "ML depth evaluation complete"
        );

        Ok(CompanyProfile {
            company_name: company_name.to_owned(),
            hf_profile,
            papers,
            depth_score,
        })
    }

    /// Batch profile multiple companies.
    pub async fn batch_profile(&self, companies: &[String]) -> Result<Vec<CompanyProfile>> {
        let mut profiles = Vec::with_capacity(companies.len());
        for company in companies {
            match self.profile_company(company).await {
                Ok(profile) => profiles.push(profile),
                Err(e) => {
                    tracing::error!(company = company.as_str(), error = %e, "failed to profile");
                }
            }
        }
        // Sort by score descending
        profiles.sort_by(|a, b| {
            b.depth_score
                .overall_score
                .partial_cmp(&a.depth_score.overall_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        Ok(profiles)
    }
}
