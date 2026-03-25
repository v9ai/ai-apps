mod disposable;
mod dns;
mod smtp;
mod syntax;
mod types;

pub use dns::DnsResolver;
pub use types::{VerificationFlag, VerificationOutcome, VerificationResult};

pub struct VerifierConfig {
    pub resolver: DnsResolver,
    /// Timeout per DNS lookup and per SMTP connection, in seconds.
    pub timeout_secs: u64,
}

impl VerifierConfig {
    pub fn new(timeout_secs: u64) -> Self {
        Self {
            resolver: DnsResolver::new(),
            timeout_secs,
        }
    }
}

impl Default for VerifierConfig {
    fn default() -> Self {
        Self::new(10)
    }
}

/// Verify a single email address through the full local pipeline:
/// syntax → typo → disposable → role → DNS MX → catch-all probe → SMTP probe.
pub async fn verify(email: &str, config: &VerifierConfig) -> VerificationOutcome {
    let start = std::time::Instant::now();
    let email = email.trim().to_lowercase();

    // 1. Format check
    if !syntax::is_valid_format(&email) {
        return VerificationOutcome::new(
            VerificationResult::InvalidFormat,
            vec![],
            None,
            start.elapsed().as_millis() as u64,
        );
    }

    // 2. Typo correction — return invalid + suggested correction
    if let Some(correction) = syntax::check_typo(&email) {
        return VerificationOutcome::new(
            VerificationResult::Invalid,
            vec![VerificationFlag::Typo],
            Some(correction),
            start.elapsed().as_millis() as u64,
        );
    }

    let domain = match syntax::extract_domain(&email) {
        Some(d) => d.to_string(),
        None => {
            return VerificationOutcome::error("no_domain", start.elapsed().as_millis() as u64)
        }
    };

    // 3. Disposable domain
    if disposable::is_disposable(&domain) {
        return VerificationOutcome::new(
            VerificationResult::Disposable,
            vec![VerificationFlag::Disposable],
            None,
            start.elapsed().as_millis() as u64,
        );
    }

    // 4. Role address (flag only — continue verification)
    let mut flags: Vec<VerificationFlag> = vec![];
    if let Some(local) = syntax::extract_local(&email) {
        if disposable::is_role_address(local) {
            flags.push(VerificationFlag::RoleAddress);
        }
    }

    // 5. DNS MX lookup
    let mx_hosts = match config.resolver.get_mx_hosts(&domain).await {
        Ok(hosts) if !hosts.is_empty() => {
            flags.push(VerificationFlag::HasDns);
            hosts
        }
        _ => {
            return VerificationOutcome::new(
                VerificationResult::Invalid,
                flags,
                None,
                start.elapsed().as_millis() as u64,
            );
        }
    };

    // Use the highest-priority (lowest preference number) MX host
    let mx_host = &mx_hosts[0];

    // 6. Catch-all detection — probe a provably nonexistent address first.
    //    If the server accepts it, every address on this domain will accept.
    let canary = format!("xkzqpqxzqpq9zzz@{domain}");
    if smtp::smtp_probe(&canary, mx_host, config.timeout_secs).await == smtp::SmtpResult::Valid {
        flags.push(VerificationFlag::CatchAll);
        return VerificationOutcome::new(
            VerificationResult::CatchAll,
            flags,
            None,
            start.elapsed().as_millis() as u64,
        );
    }

    // 7. SMTP probe for the real address
    let smtp_result = smtp::smtp_probe(&email, mx_host, config.timeout_secs).await;

    match smtp_result {
        smtp::SmtpResult::Valid => {
            flags.push(VerificationFlag::SmtpConnectable);
            VerificationOutcome::new(
                VerificationResult::Valid,
                flags,
                None,
                start.elapsed().as_millis() as u64,
            )
        }
        smtp::SmtpResult::Invalid => VerificationOutcome::new(
            VerificationResult::Invalid,
            flags,
            None,
            start.elapsed().as_millis() as u64,
        ),
        smtp::SmtpResult::Unknown => VerificationOutcome::new(
            VerificationResult::Unknown,
            flags,
            None,
            start.elapsed().as_millis() as u64,
        ),
    }
}
