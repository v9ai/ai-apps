use serde::{Deserialize, Serialize};

/// Top-level response from `GET /jobs` and `GET /jobs?content=true`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobsResponse {
    pub jobs: Vec<Job>,
    pub meta: Meta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Meta {
    pub total: u64,
}

/// A Greenhouse job posting.
///
/// `content`, `departments`, and `offices` are only present when fetched via
/// `GET /jobs/{id}` or `GET /jobs?content=true`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: u64,
    pub title: String,
    pub absolute_url: String,
    pub company_name: String,
    pub internal_job_id: u64,
    pub location: Location,
    pub updated_at: String,
    pub first_published: String,
    pub requisition_id: String,
    pub language: String,
    #[serde(default)]
    pub data_compliance: Vec<DataCompliance>,
    #[serde(default)]
    pub metadata: Vec<Metadata>,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub departments: Option<Vec<Department>>,
    #[serde(default)]
    pub offices: Option<Vec<Office>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Location {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataCompliance {
    #[serde(rename = "type")]
    pub compliance_type: String,
    pub requires_consent: bool,
    pub requires_processing_consent: bool,
    pub requires_retention_consent: bool,
    pub retention_period: Option<serde_json::Value>,
    pub demographic_data_consent_applies: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub id: u64,
    pub name: String,
    pub value: serde_json::Value,
    pub value_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Department {
    pub id: u64,
    pub name: String,
    pub parent_id: Option<u64>,
    #[serde(default)]
    pub child_ids: Vec<u64>,
    #[serde(default)]
    pub jobs: Vec<Job>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Office {
    pub id: u64,
    pub name: String,
    #[serde(default)]
    pub location: Option<String>,
    pub parent_id: Option<u64>,
    #[serde(default)]
    pub child_ids: Vec<u64>,
    #[serde(default)]
    pub departments: Vec<Department>,
}

/// Top-level response from `GET /departments`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepartmentsResponse {
    pub departments: Vec<Department>,
}

/// Top-level response from `GET /offices`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfficesResponse {
    pub offices: Vec<Office>,
}

/// Combined result from [`GreenhouseClient::fetch_all`] — jobs, departments,
/// and offices fetched in parallel.
#[derive(Debug, Clone)]
pub struct BoardSnapshot {
    pub jobs: Vec<Job>,
    pub departments: Vec<Department>,
    pub offices: Vec<Office>,
    pub total: u64,
}
