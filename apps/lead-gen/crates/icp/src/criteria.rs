use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpCriteria {
    pub target_industries: Vec<String>,
    pub min_employees: Option<i32>,
    pub max_employees: Option<i32>,
    pub target_seniorities: Vec<String>,
    pub target_departments: Vec<String>,
    pub target_tech_stack: Vec<String>,
    pub target_locations: Vec<String>,
    pub funding_stages: Vec<String>,
    #[serde(default)]
    pub topics: Vec<String>,
    #[serde(default)]
    pub min_stars: Option<u32>,
    #[serde(default)]
    pub min_repos: Option<u32>,
    #[serde(default)]
    pub required_languages: Vec<String>,
    #[serde(default)]
    pub active_within_days: Option<u32>,
}

impl Default for IcpCriteria {
    fn default() -> Self {
        Self {
            target_industries: vec!["ai".into(), "ml".into(), "saas".into(), "infrastructure".into()],
            min_employees: Some(20),
            max_employees: Some(500),
            target_seniorities: vec!["vp".into(), "director".into(), "head".into(), "chief".into(), "cto".into(), "ceo".into()],
            target_departments: vec!["engineering".into(), "ai".into(), "ml".into(), "data".into(), "platform".into()],
            target_tech_stack: vec!["rust".into(), "python".into(), "kubernetes".into(), "pytorch".into(), "tensorflow".into()],
            target_locations: vec![],
            funding_stages: vec![],
            topics: vec![],
            min_stars: None,
            min_repos: None,
            required_languages: vec![],
            active_within_days: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpWeights {
    pub industry_weight: f32,
    pub employee_weight: f32,
    pub seniority_weight: f32,
    pub department_weight: f32,
    pub tech_weight: f32,
    pub email_weight: f32,
}

impl IcpWeights {
    pub fn from_json(path: &std::path::Path) -> Self {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn to_json(&self, path: &std::path::Path) -> std::io::Result<()> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, json)
    }

    pub fn as_weights(&self) -> [f32; 6] {
        [
            self.industry_weight,
            self.employee_weight,
            self.seniority_weight,
            self.department_weight,
            self.tech_weight,
            self.email_weight,
        ]
    }
}

impl Default for IcpWeights {
    fn default() -> Self {
        Self {
            industry_weight: 25.0,
            employee_weight: 15.0,
            seniority_weight: 25.0,
            department_weight: 15.0,
            tech_weight: 10.0,
            email_weight: 5.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyIcpWeights {
    pub bias: f32,
    pub weights: CompanyFeatureWeights,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyFeatureWeights {
    pub has_description: f32,
    pub description_length_norm: f32,
    pub has_website: f32,
    pub has_linkedin: f32,
    pub has_email: f32,
    pub email_count: f32,
    pub tag_count: f32,
    pub service_count: f32,
    pub ai_tier: f32,
    pub is_consultancy: f32,
    pub is_product: f32,
    pub facts_count: f32,
    pub has_github: f32,
    pub github_ai_score: f32,
    pub hf_presence_score: f32,
    pub intent_score: f32,
    pub contacts_count: f32,
    pub dm_contacts_count: f32,
    pub has_job_board: f32,
}

impl Default for CompanyIcpWeights {
    fn default() -> Self {
        Self {
            bias: 0.10,
            weights: CompanyFeatureWeights {
                has_description: 0.05,
                description_length_norm: 0.03,
                has_website: 0.04,
                has_linkedin: 0.03,
                has_email: 0.06,
                email_count: 0.02,
                tag_count: 0.01,
                service_count: 0.02,
                ai_tier: 0.15,
                is_consultancy: -0.08,
                is_product: 0.06,
                facts_count: 0.01,
                has_github: 0.04,
                github_ai_score: 0.10,
                hf_presence_score: 0.08,
                intent_score: 0.12,
                contacts_count: 0.03,
                dm_contacts_count: 0.08,
                has_job_board: 0.05,
            },
        }
    }
}
