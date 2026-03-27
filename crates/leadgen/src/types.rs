use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub employee_count: Option<i32>,
    pub funding_stage: Option<String>,
    pub tech_stack: Option<String>,
    pub location: Option<String>,
    pub description: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Contact {
    pub id: String,
    pub company_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub seniority: Option<String>,
    pub department: Option<String>,
    pub email: Option<String>,
    pub email_status: Option<String>,
    pub linkedin_url: Option<String>,
    pub phone: Option<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadScore {
    pub contact_id: String,
    pub icp_fit_score: f64,
    pub intent_score: f64,
    pub recency_score: f64,
    pub composite_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScoredLead {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub title: String,
    pub email: String,
    pub email_status: String,
    pub company_name: String,
    pub domain: String,
    pub industry: String,
    pub icp_fit_score: f64,
    pub composite_score: f64,
}
