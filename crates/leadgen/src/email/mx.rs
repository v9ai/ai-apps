use anyhow::Result;
use hickory_resolver::config::*;
use hickory_resolver::TokioAsyncResolver;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

pub struct MxChecker {
    resolver: TokioAsyncResolver,
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
        Ok(Self { resolver, cache: Arc::new(RwLock::new(HashMap::new())), ttl: Duration::from_secs(3600) })
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
