use crate::embed::Embedder;
use crate::github::{build_queries, Github};
use crate::lance::Lance;
use crate::paper_fetch::{persist_papers, Fetchers};
use crate::score::{candidate_topic_text, score_candidate, ScoreWeights};
use crate::sqlite::{self, Db};
use crate::types::{
    paper_text_for_embedding, Contact, GhCandidate, MatchResult, MatchStatus, ScoreBreakdown,
};
use anyhow::Result;
use serde_json::json;

const BANDIT_POOL: &str = "github_query";

pub struct Pipeline<'a> {
    pub gh: &'a Github,
    pub emb: &'a Embedder,
    pub lance: &'a Lance,
    pub sqlite: &'a Db,
    pub fetchers: &'a Fetchers,
    pub weights: ScoreWeights,
    pub threshold: f32,
    pub fetch_per_source: u32,
}

impl<'a> Pipeline<'a> {
    pub async fn process(&self, contact: &Contact) -> Result<MatchResult> {
        // Gate: contact must be tagged "papers".
        if !contact.tags.iter().any(|t| t == "papers") {
            let r = MatchResult {
                contact_id: contact.id.clone(),
                login: None,
                score: 0.0,
                breakdown: None,
                evidence: json!({"reason": "tag_gate_failed"}),
                arm_id: None,
                status: MatchStatus::NoRelevantPapers,
            };
            self.lance.write_result(&r).await?;
            sqlite::upsert_match_state(
                self.sqlite, &contact.id, None, r.status.as_str(),
                Some(r.score), None, None, None,
            ).await?;
            return Ok(r);
        }

        // 1) Acquire papers — use inline set if present, else fetch from OpenAlex+arXiv.
        let mut papers = contact.papers.clone();
        if papers.is_empty() {
            papers = self.fetchers.by_author(&contact.name, self.fetch_per_source).await.unwrap_or_default();
        }
        if papers.is_empty() {
            let r = MatchResult {
                contact_id: contact.id.clone(),
                login: None,
                score: 0.0,
                breakdown: None,
                evidence: json!({"reason": "no_papers"}),
                arm_id: None,
                status: MatchStatus::NoRelevantPapers,
            };
            self.lance.write_result(&r).await?;
            sqlite::upsert_match_state(
                self.sqlite, &contact.id, None, r.status.as_str(),
                Some(r.score), None, None, None,
            ).await?;
            return Ok(r);
        }

        // 2) Persist paper metadata to SQLite and embed them for Lance.
        persist_papers(self.sqlite, self.lance, &papers).await.ok();

        let texts: Vec<String> = papers.iter().map(paper_text_for_embedding).collect();
        let paper_embs = self.emb.embed(&texts)?;

        self.lance.upsert_contact(contact).await?;
        self.lance
            .upsert_paper_embeddings(&contact.id, &papers, &paper_embs)
            .await?;

        let author_topic = mean_rows(&paper_embs);

        // 3) Bandit-select a GH query arm (SQLite-backed).
        let queries = build_queries(&contact.name, contact.affiliation.as_deref(), contact.email.as_deref());
        let arm_ids: Vec<&str> = queries.iter().map(|(id, _)| id.as_str()).collect();
        sqlite::ensure_arms(self.sqlite, BANDIT_POOL, &arm_ids).await?;
        let arm_id = sqlite::select_arm(
            self.sqlite,
            BANDIT_POOL,
            &arm_ids.iter().map(|s| s.to_string()).collect::<Vec<_>>(),
        )
        .await?;
        let query = queries
            .iter()
            .find(|(id, _)| id == &arm_id)
            .map(|(_, q)| q.clone())
            .unwrap_or_else(|| queries[0].1.clone());

        tracing::debug!(contact = %contact.id, arm = %arm_id, query = %query, "github search");

        // 4) Search GitHub (with fallback to name_only arm).
        let mut logins = self.gh.search_users(&query).await.unwrap_or_default();
        if logins.is_empty() && arm_id != "name_only" {
            logins = self.gh.search_users(&queries[0].1).await.unwrap_or_default();
        }
        if logins.is_empty() {
            sqlite::report_arm(self.sqlite, BANDIT_POOL, &arm_id, 0.0).await.ok();
            let r = MatchResult {
                contact_id: contact.id.clone(),
                login: None,
                score: 0.0,
                breakdown: None,
                evidence: json!({"reason": "no_candidates", "query": query}),
                arm_id: Some(arm_id.clone()),
                status: MatchStatus::NoGithub,
            };
            self.lance.write_result(&r).await?;
            sqlite::upsert_match_state(
                self.sqlite, &contact.id, None, r.status.as_str(),
                Some(r.score), None, Some(&arm_id), None,
            ).await?;
            return Ok(r);
        }

        // 5) Hydrate top 5 candidates.
        let mut hydrated = vec![];
        for login in logins.into_iter().take(5) {
            match self.gh.hydrate(&login).await {
                Ok(c) => hydrated.push(c),
                Err(e) => tracing::warn!("hydrate {} failed: {}", login, e),
            }
        }

        // 6) Embed candidate topic blobs, score, rank.
        let topic_texts: Vec<String> = hydrated.iter().map(candidate_topic_text).collect();
        let cand_embs = if topic_texts.is_empty() {
            vec![]
        } else {
            self.emb.embed(&topic_texts)?
        };

        let mut scored: Vec<(GhCandidate, ScoreBreakdown, Vec<f32>)> = hydrated
            .into_iter()
            .zip(cand_embs.into_iter())
            .map(|(c, e)| {
                let s = score_candidate(
                    &contact.name,
                    contact.affiliation.as_deref(),
                    contact.email.as_deref(),
                    &author_topic,
                    &c,
                    &e,
                    &self.weights,
                );
                (c, s, e)
            })
            .collect();
        scored.sort_by(|a, b| b.1.total.partial_cmp(&a.1.total).unwrap());

        // Stash every candidate + embedding for audit.
        for (c, _, e) in &scored {
            self.lance.upsert_gh_profile(&contact.id, c, e).await.ok();
        }

        let result = match scored.first() {
            None => MatchResult {
                contact_id: contact.id.clone(),
                login: None,
                score: 0.0,
                breakdown: None,
                evidence: json!({"reason": "hydration_empty"}),
                arm_id: Some(arm_id.clone()),
                status: MatchStatus::NoGithub,
            },
            Some((cand, b, _)) if b.total >= self.threshold => MatchResult {
                contact_id: contact.id.clone(),
                login: Some(cand.login.clone()),
                score: b.total,
                breakdown: Some(b.clone()),
                evidence: json!({
                    "picked": cand.login,
                    "name_sim": b.name_sim,
                    "affil_overlap": b.affil_overlap,
                    "topic_cos": b.topic_cos,
                    "signal_match": b.signal_match,
                    "runner_ups": scored.iter().skip(1).take(2)
                        .map(|(c, s, _)| json!({"login": c.login, "score": s.total}))
                        .collect::<Vec<_>>(),
                }),
                arm_id: Some(arm_id.clone()),
                status: MatchStatus::Matched,
            },
            Some((cand, b, _)) => MatchResult {
                contact_id: contact.id.clone(),
                login: None,
                score: b.total,
                breakdown: Some(b.clone()),
                evidence: json!({
                    "reason": "below_threshold",
                    "best_login": cand.login,
                    "best_score": b.total,
                }),
                arm_id: Some(arm_id.clone()),
                status: MatchStatus::NoGithub,
            },
        };

        let reward = match result.status {
            MatchStatus::Matched => result.score as f64,
            _ => 0.0,
        };
        sqlite::report_arm(self.sqlite, BANDIT_POOL, &arm_id, reward).await.ok();

        let evidence_ref = format!("lance://results/{}", contact.id);
        self.lance.write_result(&result).await?;
        sqlite::upsert_match_state(
            self.sqlite,
            &contact.id,
            None,
            result.status.as_str(),
            Some(result.score),
            result.login.as_deref(),
            Some(&arm_id),
            Some(&evidence_ref),
        )
        .await?;

        Ok(result)
    }
}

fn mean_rows(rows: &[Vec<f32>]) -> Vec<f32> {
    if rows.is_empty() {
        return vec![];
    }
    let d = rows[0].len();
    let mut out = vec![0.0_f32; d];
    for r in rows {
        for (i, v) in r.iter().enumerate() {
            out[i] += v;
        }
    }
    let n = rows.len() as f32;
    for v in &mut out {
        *v /= n;
    }
    let norm: f32 = out.iter().map(|x| x * x).sum::<f32>().sqrt().max(1e-12);
    for v in &mut out {
        *v /= norm;
    }
    out
}
