use crate::llm::LlmClient;
use anyhow::Result;

pub async fn generate_summary(llm: &LlmClient, company: &crate::Company, contact: &crate::Contact) -> Result<String> {
    llm.generate_lead_summary(
        &company.name, company.industry.as_deref().unwrap_or("Unknown"),
        company.employee_count.unwrap_or(0),
        &format!("{} {}", contact.first_name, contact.last_name),
        contact.title.as_deref().unwrap_or("Unknown"),
        company.tech_stack.as_deref().unwrap_or("[]"),
    ).await
}

pub fn export_leads_csv(leads: &[crate::ScoredLead]) -> String {
    let mut csv = String::from("first_name,last_name,title,email,email_status,company,domain,industry,icp_score,composite_score\n");
    for l in leads {
        csv.push_str(&format!("{},{},{},{},{},{},{},{},{:.1},{:.1}\n",
            esc(&l.first_name), esc(&l.last_name), esc(&l.title), esc(&l.email),
            esc(&l.email_status), esc(&l.company_name), esc(&l.domain), esc(&l.industry),
            l.icp_fit_score, l.composite_score));
    }
    csv
}

fn esc(s: &str) -> String {
    if s.contains(',') || s.contains('"') { format!("\"{}\"", s.replace('"', "\"\"")) } else { s.to_string() }
}
