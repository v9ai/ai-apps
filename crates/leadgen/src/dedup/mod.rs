use strsim::jaro_winkler;
use std::collections::HashMap;

use crate::entity_resolution::signals::{normalize_company_name, normalize_domain, registrable_domain};

pub struct ContactFp { pub idx: usize, pub name: String, pub domain: String, pub email_local: String }

impl ContactFp {
    pub fn new(idx: usize, c: &crate::Contact) -> Self {
        let domain = c.email.as_deref().and_then(|e| e.split('@').nth(1)).unwrap_or("").to_lowercase();
        let email_local = c.email.as_deref().and_then(|e| e.split('@').next()).unwrap_or("").to_lowercase();
        Self { idx, name: format!("{} {}", c.first_name.to_lowercase(), c.last_name.to_lowercase()).trim().into(),
               domain, email_local }
    }
}

pub fn is_duplicate(a: &ContactFp, b: &ContactFp) -> bool {
    if !a.email_local.is_empty() && a.email_local == b.email_local && a.domain == b.domain { return true; }
    if a.domain == b.domain && !a.domain.is_empty() && jaro_winkler(&a.name, &b.name) > 0.92 { return true; }
    if !a.name.is_empty() && a.name == b.name { return true; }
    false
}

pub fn find_duplicate_clusters(contacts: &[crate::Contact]) -> Vec<Vec<usize>> {
    let fps: Vec<ContactFp> = contacts.iter().enumerate().map(|(i,c)| ContactFp::new(i,c)).collect();
    let n = contacts.len();
    let mut parent: Vec<usize> = (0..n).collect();

    fn find(p: &mut [usize], i: usize) -> usize { if p[i]!=i { p[i]=find(p,p[i]); } p[i] }
    fn union(p: &mut [usize], a: usize, b: usize) { let (ra,rb)=(find(p,a),find(p,b)); if ra!=rb { p[ra]=rb; } }

    let mut blocks: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, fp) in fps.iter().enumerate() {
        if !fp.domain.is_empty() { blocks.entry(fp.domain.clone()).or_default().push(i); }
    }

    for indices in blocks.values() {
        for i in 0..indices.len() {
            for j in (i+1)..indices.len() {
                if is_duplicate(&fps[indices[i]], &fps[indices[j]]) { union(&mut parent, indices[i], indices[j]); }
            }
        }
    }

    let mut clusters: HashMap<usize, Vec<usize>> = HashMap::new();
    for i in 0..n { clusters.entry(find(&mut parent, i)).or_default().push(i); }
    clusters.into_values().filter(|c| c.len() > 1).collect()
}

pub fn pick_primary(contacts: &[crate::Contact], cluster: &[usize]) -> usize {
    cluster.iter().copied().max_by_key(|&i| {
        let c = &contacts[i];
        let mut s = 0u32;
        if c.email.is_some() { s+=10; }
        if c.email_status.as_deref()==Some("verified") { s+=20; }
        if c.title.is_some() { s+=5; }
        if c.linkedin_url.is_some() { s+=5; }
        if c.phone.is_some() { s+=5; }
        s
    }).unwrap_or(cluster[0])
}

// ---------------------------------------------------------------------------
// Company deduplication
// ---------------------------------------------------------------------------

pub struct CompanyFp {
    pub idx: usize,
    pub name_normalized: String,
    pub domain_normalized: String,
    pub domain_root: String,
}

pub fn company_fp(idx: usize, c: &crate::Company) -> CompanyFp {
    let domain_normalized = c.domain.as_deref().map(normalize_domain).unwrap_or_default();
    let domain_root = if domain_normalized.is_empty() {
        String::new()
    } else {
        registrable_domain(&domain_normalized).to_string()
    };
    CompanyFp {
        idx,
        name_normalized: normalize_company_name(&c.name),
        domain_normalized,
        domain_root,
    }
}

pub fn is_duplicate_company(a: &CompanyFp, b: &CompanyFp) -> bool {
    // Exact normalized domain
    if !a.domain_normalized.is_empty() && a.domain_normalized == b.domain_normalized {
        return true;
    }
    // Same registrable root + name similarity
    if !a.domain_root.is_empty()
        && a.domain_root == b.domain_root
        && jaro_winkler(&a.name_normalized, &b.name_normalized) > 0.85
    {
        return true;
    }
    // Exact normalized name
    if !a.name_normalized.is_empty() && a.name_normalized == b.name_normalized {
        return true;
    }
    false
}

pub fn find_duplicate_company_clusters(companies: &[crate::Company]) -> Vec<Vec<usize>> {
    let fps: Vec<CompanyFp> = companies.iter().enumerate().map(|(i, c)| company_fp(i, c)).collect();
    let n = companies.len();
    let mut parent: Vec<usize> = (0..n).collect();

    fn find(p: &mut [usize], i: usize) -> usize { if p[i] != i { p[i] = find(p, p[i]); } p[i] }
    fn union(p: &mut [usize], a: usize, b: usize) { let (ra, rb) = (find(p, a), find(p, b)); if ra != rb { p[ra] = rb; } }

    // Block by registrable domain root (fall back to name for domain-less companies)
    let mut blocks: HashMap<String, Vec<usize>> = HashMap::new();
    for (i, fp) in fps.iter().enumerate() {
        if !fp.domain_root.is_empty() {
            blocks.entry(fp.domain_root.clone()).or_default().push(i);
        } else if !fp.name_normalized.is_empty() {
            // Use first word of name as a coarse block key
            let key = fp.name_normalized.split_whitespace().next().unwrap_or("").to_string();
            if !key.is_empty() {
                blocks.entry(key).or_default().push(i);
            }
        }
    }

    for indices in blocks.values() {
        for i in 0..indices.len() {
            for j in (i + 1)..indices.len() {
                if is_duplicate_company(&fps[indices[i]], &fps[indices[j]]) {
                    union(&mut parent, indices[i], indices[j]);
                }
            }
        }
    }

    let mut clusters: HashMap<usize, Vec<usize>> = HashMap::new();
    for i in 0..n {
        clusters.entry(find(&mut parent, i)).or_default().push(i);
    }
    clusters.into_values().filter(|c| c.len() > 1).collect()
}
