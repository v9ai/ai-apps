use anyhow::Result;
use hickory_resolver::{
    config::{ResolverConfig, ResolverOpts},
    TokioAsyncResolver,
};

pub struct DnsResolver {
    inner: TokioAsyncResolver,
}

impl DnsResolver {
    pub fn new() -> Self {
        let inner = TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default());
        Self { inner }
    }

    /// Returns MX host names sorted by priority (lowest preference = highest priority).
    /// Returns empty vec if the domain has no MX records.
    pub async fn get_mx_hosts(&self, domain: &str) -> Result<Vec<String>> {
        let lookup = self.inner.mx_lookup(domain).await?;
        let mut records: Vec<(u16, String)> = lookup
            .iter()
            .map(|mx| (mx.preference(), mx.exchange().to_utf8()))
            .collect();

        // Sort ascending by priority number (lower = higher priority)
        records.sort_by_key(|(pref, _)| *pref);

        Ok(records.into_iter().map(|(_, host)| host).collect())
    }
}
