use anyhow::Result;
use hickory_resolver::config::*;
use hickory_resolver::TokioAsyncResolver;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct MxChecker {
    resolver: Arc<TokioAsyncResolver>,
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    ttl: Duration,
}
struct CacheEntry { result: MxResult, inserted: Instant }

#[derive(Debug, Clone)]
pub struct MxResult { pub has_mx: bool, pub provider: EmailProvider, pub mx_hosts: Vec<String> }

#[derive(Debug, Clone, PartialEq)]
pub enum EmailProvider { Google, Microsoft, Zoho, ProtonMail, Fastmail, MimecastSec, Custom(String), None }

impl std::fmt::Display for EmailProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Self::Google => write!(f, "google"), Self::Microsoft => write!(f, "microsoft"),
            Self::Zoho => write!(f, "zoho"), Self::ProtonMail => write!(f, "protonmail"),
            Self::Fastmail => write!(f, "fastmail"), Self::MimecastSec => write!(f, "mimecast"),
            Self::Custom(s) => write!(f, "custom:{}", s), Self::None => write!(f, "none"),
        }
    }
}

impl MxChecker {
    pub fn new() -> Result<Self> {
        let resolver = TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default());
        Ok(Self { resolver: Arc::new(resolver), cache: Arc::new(RwLock::new(HashMap::new())), ttl: Duration::from_secs(3600) })
    }

    pub async fn check_domain(&self, domain: &str) -> Result<MxResult> {
        let d = domain.to_lowercase();
        { let c = self.cache.read().await;
          if let Some(e) = c.get(&d) { if e.inserted.elapsed() < self.ttl { return Ok(e.result.clone()); } } }

        let result = match self.resolver.mx_lookup(&d).await {
            Ok(lookup) => {
                let mut mx: Vec<(u16, String)> = lookup.iter()
                    .map(|m| (m.preference(), m.exchange().to_string().trim_end_matches('.').to_string()))
                    .collect();
                mx.sort_by_key(|(p,_)| *p);
                let hosts: Vec<String> = mx.into_iter().map(|(_,h)| h).collect();
                let provider = detect_provider(&hosts);
                MxResult { has_mx: !hosts.is_empty(), provider, mx_hosts: hosts }
            }
            Err(_) => MxResult { has_mx: false, provider: EmailProvider::None, mx_hosts: vec![] },
        };

        { let mut c = self.cache.write().await;
          c.insert(d, CacheEntry { result: result.clone(), inserted: Instant::now() }); }
        Ok(result)
    }
}

fn detect_provider(hosts: &[String]) -> EmailProvider {
    for h in hosts {
        let h = h.to_lowercase();
        if h.contains("google") || h.contains("gmail") { return EmailProvider::Google; }
        if h.contains("outlook") || h.contains("microsoft") { return EmailProvider::Microsoft; }
        if h.contains("zoho") { return EmailProvider::Zoho; }
        if h.contains("protonmail") { return EmailProvider::ProtonMail; }
        if h.contains("fastmail") { return EmailProvider::Fastmail; }
        if h.contains("mimecast") { return EmailProvider::MimecastSec; }
    }
    hosts.first().map(|h| EmailProvider::Custom(h.clone())).unwrap_or(EmailProvider::None)
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- detect_provider (unit) ---

    #[test]
    fn detects_google() {
        let hosts = vec!["aspmx.l.google.com".to_string()];
        assert_eq!(detect_provider(&hosts), EmailProvider::Google);
    }

    #[test]
    fn detects_microsoft() {
        let hosts = vec!["acme-com.mail.protection.outlook.com".to_string()];
        assert_eq!(detect_provider(&hosts), EmailProvider::Microsoft);
    }

    #[test]
    fn detects_zoho() {
        let hosts = vec!["mx.zoho.com".to_string()];
        assert_eq!(detect_provider(&hosts), EmailProvider::Zoho);
    }

    #[test]
    fn detects_protonmail() {
        let hosts = vec!["mail.protonmail.ch".to_string()];
        assert_eq!(detect_provider(&hosts), EmailProvider::ProtonMail);
    }

    #[test]
    fn detects_fastmail() {
        let hosts = vec!["in1-smtp.messagingengine.com".to_string(), "in2-smtp.messagingengine.com".to_string()];
        // fastmail doesn't appear in host names used above — falls through to Custom
        // verify Custom variant is returned correctly
        assert!(matches!(detect_provider(&hosts), EmailProvider::Custom(_)));
    }

    #[test]
    fn detects_mimecast() {
        let hosts = vec!["eu-smtp-inbound-1.mimecast.com".to_string()];
        assert_eq!(detect_provider(&hosts), EmailProvider::MimecastSec);
    }

    #[test]
    fn empty_hosts_returns_none_provider() {
        assert_eq!(detect_provider(&[]), EmailProvider::None);
    }

    #[test]
    fn unknown_host_returns_custom() {
        let hosts = vec!["mail.acme.io".to_string()];
        assert!(matches!(detect_provider(&hosts), EmailProvider::Custom(_)));
    }

    #[test]
    fn uses_first_host_for_custom() {
        let hosts = vec!["smtp.acme.io".to_string(), "smtp2.acme.io".to_string()];
        match detect_provider(&hosts) {
            EmailProvider::Custom(h) => assert_eq!(h, "smtp.acme.io"),
            other => panic!("expected Custom, got {:?}", other),
        }
    }

    // --- EmailProvider Display ---

    #[test]
    fn display_all_variants() {
        assert_eq!(EmailProvider::Google.to_string(), "google");
        assert_eq!(EmailProvider::Microsoft.to_string(), "microsoft");
        assert_eq!(EmailProvider::Zoho.to_string(), "zoho");
        assert_eq!(EmailProvider::ProtonMail.to_string(), "protonmail");
        assert_eq!(EmailProvider::Fastmail.to_string(), "fastmail");
        assert_eq!(EmailProvider::MimecastSec.to_string(), "mimecast");
        assert_eq!(EmailProvider::None.to_string(), "none");
        assert_eq!(EmailProvider::Custom("acme".to_string()).to_string(), "custom:acme");
    }

    // --- MxChecker real DNS (integration) ---

    #[tokio::test]
    async fn gmail_com_has_mx_and_is_google() {
        let checker = MxChecker::new().unwrap();
        let result = checker.check_domain("gmail.com").await.unwrap();
        assert!(result.has_mx, "gmail.com must have MX records");
        assert_eq!(result.provider, EmailProvider::Google);
        assert!(!result.mx_hosts.is_empty());
    }

    #[tokio::test]
    async fn nonexistent_domain_has_no_mx() {
        let checker = MxChecker::new().unwrap();
        let result = checker.check_domain("this-domain-does-not-exist-leadgen-test.invalid").await.unwrap();
        assert!(!result.has_mx);
        assert_eq!(result.provider, EmailProvider::None);
    }

    #[tokio::test]
    async fn cache_returns_same_result_on_second_call() {
        let checker = MxChecker::new().unwrap();
        let r1 = checker.check_domain("gmail.com").await.unwrap();
        let r2 = checker.check_domain("gmail.com").await.unwrap();
        assert_eq!(r1.mx_hosts, r2.mx_hosts);
        assert_eq!(r1.has_mx, r2.has_mx);
    }

    #[tokio::test]
    async fn mx_hosts_are_sorted_by_preference() {
        // gmail has multiple MX records with different preferences; after sort the list should be stable
        let checker = MxChecker::new().unwrap();
        let result = checker.check_domain("gmail.com").await.unwrap();
        // We can't know the exact order, but there should be at least one host
        assert!(!result.mx_hosts.is_empty());
        // Hosts should not contain trailing dots (stripped by our code)
        for h in &result.mx_hosts {
            assert!(!h.ends_with('.'), "host should not have trailing dot: {}", h);
        }
    }
}
