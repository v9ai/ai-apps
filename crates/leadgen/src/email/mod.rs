pub mod mx;
pub mod pattern;
pub mod verify;

use crate::db;
use anyhow::Result;
use tracing::info;

pub async fn discover_and_verify(
    contact: &crate::Contact, domain: &str, database: &db::Db, mx_checker: &mx::MxChecker,
) -> Result<Option<String>> {
    let mx_result = mx_checker.check_domain(domain).await?;
    if !mx_result.has_mx { return Ok(None); }

    let pat = if let Some((p, c)) = db::get_email_pattern(database, domain).await? {
        if c > 0.5 { Some(pattern::EmailPattern::from_str(&p)) } else { None }
    } else { None };

    let candidates = if let Some(p) = pat {
        vec![p.generate(&contact.first_name, &contact.last_name, domain)]
    } else {
        pattern::EmailPattern::all_candidates(&contact.first_name, &contact.last_name, domain)
    };

    let mx_host = &mx_result.mx_hosts[0];
    for candidate in &candidates {
        match verify::verify_smtp(candidate, mx_host).await {
            Ok(verify::SmtpResult::Valid) => { info!(email = %candidate, "verified"); return Ok(Some(candidate.clone())); }
            Ok(verify::SmtpResult::CatchAll) => { return Ok(Some(candidate.clone())); }
            _ => continue,
        }
    }
    Ok(None)
}
