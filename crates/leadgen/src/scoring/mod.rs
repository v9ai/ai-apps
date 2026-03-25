use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpProfile {
    pub target_industries: Vec<String>,
    pub min_employees: Option<i32>,
    pub max_employees: Option<i32>,
    pub target_seniorities: Vec<String>,
    pub target_departments: Vec<String>,
    pub target_tech_stack: Vec<String>,
    pub target_locations: Vec<String>,
    pub funding_stages: Vec<String>,
}

impl Default for IcpProfile {
    fn default() -> Self {
        Self {
            target_industries: vec!["SaaS".into(), "Software".into(), "Technology".into()],
            min_employees: Some(10), max_employees: Some(500),
            target_seniorities: vec!["C-level".into(), "VP".into(), "Director".into()],
            target_departments: vec!["Engineering".into(), "Product".into()],
            target_tech_stack: vec![], target_locations: vec![], funding_stages: vec![],
        }
    }
}

pub fn score_lead(contact: &crate::Contact, company: &crate::Company, icp: &IcpProfile) -> crate::LeadScore {
    let mut pts = 0.0f64;
    let mut max = 0.0f64;

    max += 25.0;
    if let Some(ref ind) = company.industry {
        if icp.target_industries.iter().any(|t| ind.to_lowercase().contains(&t.to_lowercase())) { pts += 25.0; }
    }

    max += 15.0;
    if let Some(count) = company.employee_count {
        let ok_min = icp.min_employees.map_or(true, |m| count >= m);
        let ok_max = icp.max_employees.map_or(true, |m| count <= m);
        if ok_min && ok_max { pts += 15.0; } else if ok_min || ok_max { pts += 7.0; }
    }

    max += 25.0;
    if let Some(ref s) = contact.seniority {
        if icp.target_seniorities.iter().any(|t| t == s) { pts += 25.0; }
    }

    max += 15.0;
    if let Some(ref d) = contact.department {
        if icp.target_departments.iter().any(|t| d.to_lowercase().contains(&t.to_lowercase())) { pts += 15.0; }
    }

    if !icp.target_tech_stack.is_empty() {
        max += 10.0;
        if let Some(ref stack_json) = company.tech_stack {
            if let Ok(stack) = serde_json::from_str::<Vec<String>>(stack_json) {
                let sl: Vec<String> = stack.iter().map(|s| s.to_lowercase()).collect();
                let overlap = icp.target_tech_stack.iter().filter(|t| sl.iter().any(|s| s.contains(&t.to_lowercase()))).count();
                pts += 10.0 * (overlap as f64 / icp.target_tech_stack.len() as f64);
            }
        }
    }

    max += 5.0;
    match contact.email_status.as_deref() { Some("verified") => pts += 5.0, Some("catch-all") => pts += 2.0, _ => {} }

    let fit = if max > 0.0 { (pts / max) * 100.0 } else { 0.0 };
    let recency = recency_score(company);
    let composite = fit * 0.85 + recency * 0.15;

    crate::LeadScore { contact_id: contact.id.clone(), icp_fit_score: fit,
        intent_score: 0.0, recency_score: recency, composite_score: composite }
}

fn recency_score(company: &crate::Company) -> f64 {
    let age = company.updated_at.as_deref()
        .and_then(|s| chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").ok())
        .map(|dt| (chrono::Utc::now() - dt.and_utc()).num_days())
        .unwrap_or(365);
    match age { 0..=7 => 100.0, 8..=14 => 80.0, 15..=30 => 60.0, 31..=90 => 40.0, 91..=180 => 20.0, _ => 5.0 }
}

pub fn score_company_contacts(contacts: &[crate::Contact], company: &crate::Company, icp: &IcpProfile) -> Vec<crate::LeadScore> {
    contacts.iter().map(|c| score_lead(c, company, icp)).collect()
}
