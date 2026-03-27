use std::time::Instant;

use anyhow::Result;

use crate::compliance::PiiDetector;
use crate::email;
use crate::pipeline::stage::*;
use crate::db;

pub struct VerificationStage;

impl PipelineStage for VerificationStage {
    fn name(&self) -> &str {
        "verify"
    }

    fn execute<'a>(
        &'a self,
        ctx: &'a PipelineContext,
        input: StageInput,
    ) -> BoxFuture<'a, Result<StageOutput>> {
        Box::pin(async move {
            let start = Instant::now();
            let now = chrono::Utc::now().to_rfc3339();

            let contacts = match input {
                StageInput::ContactIds(ref ids) if !ids.is_empty() => {
                    let mut result = Vec::new();
                    for id in ids {
                        if let Ok(rows) = sqlx::query_as::<_, crate::Contact>(
                            "SELECT * FROM contacts WHERE id = ?1 AND email IS NOT NULL AND email_status = 'unknown'",
                        )
                        .bind(id)
                        .fetch_all(&ctx.db)
                        .await
                        {
                            result.extend(rows);
                        }
                    }
                    result
                }
                _ => db::contacts_needing_verification(&ctx.db, 100).await.unwrap_or_default(),
            };

            let input_count = contacts.len();
            let mut verified_count = 0usize;
            let mut valid_count = 0usize;
            let mut catch_all_count = 0usize;
            let mut error_count = 0usize;
            let mut verified_ids: Vec<String> = Vec::new();
            let mut pii_detected_count = 0usize;

            // Compile PII detector once for the whole batch (regex compilation
            // is expensive — reuse the same instance across contacts).
            let pii_detector = PiiDetector::new();

            for contact in &contacts {
                let email_addr = match &contact.email {
                    Some(e) if !e.is_empty() => e,
                    _ => continue,
                };

                if !email::verify::is_valid_syntax(email_addr) {
                    let _ = db::update_email_status(&ctx.db, &contact.id, "invalid").await;
                    verified_count += 1;
                    verified_ids.push(contact.id.clone());
                    continue;
                }

                let domain = match email_addr.split('@').nth(1) {
                    Some(d) => d,
                    None => continue,
                };

                match ctx.mx_checker.check_domain(domain).await {
                    Ok(mx) => {
                        if !mx.has_mx {
                            let _ =
                                db::update_email_status(&ctx.db, &contact.id, "invalid").await;
                            verified_count += 1;
                            verified_ids.push(contact.id.clone());
                            continue;
                        }

                        if let Some(mx_host) = mx.mx_hosts.first() {
                            match email::verify::verify_smtp(email_addr, mx_host).await {
                                Ok(result) => {
                                    let status = match result {
                                        email::verify::SmtpResult::Valid => {
                                            valid_count += 1;
                                            "verified"
                                        }
                                        email::verify::SmtpResult::Invalid => "invalid",
                                        email::verify::SmtpResult::CatchAll => {
                                            catch_all_count += 1;
                                            "catch-all"
                                        }
                                        email::verify::SmtpResult::Timeout => "timeout",
                                    };
                                    let _ = db::update_email_status(
                                        &ctx.db,
                                        &contact.id,
                                        status,
                                    )
                                    .await;
                                    verified_count += 1;
                                    verified_ids.push(contact.id.clone());
                                }
                                Err(_) => {
                                    error_count += 1;
                                }
                            }
                        }
                    }
                    Err(_) => {
                        error_count += 1;
                    }
                }

                // ── PII scan on the contact's email address ───────────────────
                // Uses the compiled detector to check whether the email field
                // contains PII patterns beyond the address itself (e.g. an
                // unmasked SSN or phone number accidentally embedded).
                let pii_fields = pii_detector.check_contact(contact);
                if !pii_fields.is_empty() {
                    pii_detected_count += 1;
                }
            }

            // ── Email pattern learning ────────────────────────────────────────
            // Group every contact that has a verified email by its email domain.
            // For each domain with at least 2 verified addresses, attempt to
            // infer the company's email-address pattern and persist it so future
            // pipeline runs can generate candidate emails for new contacts at
            // the same company without needing SMTP verification.
            {
                use std::collections::HashMap;
                use crate::email::pattern::EmailPattern;

                // Map: domain → Vec<(first_name, last_name, email)>
                let mut domain_contacts: HashMap<String, Vec<(String, String, String)>> =
                    HashMap::new();

                for contact in &contacts {
                    // Only consider contacts whose email was just verified
                    // (status is now "verified") and who have all name fields.
                    let email = match &contact.email {
                        Some(e) if !e.is_empty() => e.clone(),
                        _ => continue,
                    };
                    let domain = match email.split('@').nth(1) {
                        Some(d) if !d.is_empty() => d.to_string(),
                        _ => continue,
                    };
                    let first = contact.first_name.clone();
                    let last = contact.last_name.clone();
                    if first.is_empty() || last.is_empty() {
                        continue;
                    }
                    domain_contacts
                        .entry(domain)
                        .or_default()
                        .push((first, last, email));
                }

                for (domain, samples) in &domain_contacts {
                    if samples.len() < 2 {
                        continue;
                    }
                    if let Some((pattern, confidence)) = EmailPattern::infer(samples) {
                        if confidence > 0.5 {
                            let _ = db::save_email_pattern(
                                &ctx.db,
                                domain,
                                pattern.to_str(),
                                confidence,
                                samples.len() as i32,
                            )
                            .await;
                        }
                    }
                }
            }

            let signals = vec![
                EvalSignal {
                    stage_name: "verify".into(),
                    metric_name: "verified_count".into(),
                    value: verified_count as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "verify".into(),
                    metric_name: "valid_emails".into(),
                    value: valid_count as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "verify".into(),
                    metric_name: "catch_all_count".into(),
                    value: catch_all_count as f64,
                    timestamp: now.clone(),
                },
                EvalSignal {
                    stage_name: "verify".into(),
                    metric_name: "pii_detected".into(),
                    value: pii_detected_count as f64,
                    timestamp: now,
                },
            ];

            Ok(StageOutput {
                input_count,
                output_count: verified_count,
                error_count,
                signals,
                next_input: StageInput::ContactIds(verified_ids),
                duration: start.elapsed(),
            })
        })
    }
}
