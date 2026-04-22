use crate::bandit::Bandit;
use crate::embed::Embedder;
use crate::github::{build_queries, Github};
use crate::lance::Lance;
use crate::score::{candidate_topic_text, score_candidate, ScoreWeights};
use crate::types::*;
use anyhow::Result;
use serde_json::json;

pub struct Pipeline<'a> {
    pub gh: &'a Github,
    pub emb: &'a Embedder,
    pub lance: &'a Lance,
    pub bandit: Bandit<'a>,
    pub weights: ScoreWeights,
    pub threshold: f32,
}

impl<'a> Pipeline<'a> {
    pub async fn process(&self, contact: &Contact) -> Result<MatchResult> {
        if !contact.tags.iter().any(|t| t == "papers") || contact.papers.is_empty() {
            let r = MatchResult {
                contact_id: contact.id.clone(),
                login: None, score: 0.0, breakdown: None,
                evidence: json!({"reason": "tag_gate_failed"}),
                arm_id: None,
                status: MatchStatus::NoRelevantPapers,
            };
            self.lance.write_result(&r).await?;
            return Ok(r);
        }

        let paper_texts: Vec<String> = contact.papers.iter()
            .map(|p| format!("{}. {}", p.title, p.abstract_text.as_deref().unwrap_or("")))
            .collect();
        let paper_embs = self.emb.embed(&paper_texts)?;
        self.lance.upsert_contact(contact).await?;
        self.lance.upsert_papers(&contact.id, &contact.papers, &paper_embs).await?;

        let author_topic = mean_rows(&paper_embs);

        let queries = build_queries(&contact.name, contact.affiliation.as_deref(), contact.email.as_deref());
        let arm_ids: Vec<&str> = queries.iter().map(|(id, _)| id.as_str()).collect();
        self.bandit.ensure_arms(&arm_ids).await?;
        let arm_id_owned = self.bandit.select(&arm_ids.iter().map(|s| s.to_string()).collect::<Vec<_>>()).await?;
        let query = queries.iter().find(|(id, _)| id == &arm_id_owned)
            .map(|(_, q)| q.clone())
            .unwrap_or_else(|| queries[0].1.clone());

        tracing::debug!(contact = %contact.id, arm = %arm_id_owned, query = %query, "github search");

        let logins = self.gh.search_users(&query).await.unwrap_or_default();
        if logins.is_empty() {
            let fallback_logins = if arm_id_owned != "name_only" {
                let q = &queries[0].1;
                self.gh.search_users(q).await.unwrap_or_default()
            } else { vec![] };
            if fallback_logins.is_empty() {
                self.bandit.report(&arm_id_owned, 0.0).await.ok();
                let r = MatchResult {
                    contact_id: contact.id.clone(),
                    login: None, score: 0.0, breakdown: None,
                    evidence: json!({"reason": "no_candidates", "query": query}),
                    arm_id: Some(arm_id_owned),
                    status: MatchStatus::NoGithub,
                };
                self.lance.write_result(&r).await?;
                return Ok(r);
            }
        }

        let top = logins.into_iter().take(5);
        let mut hydrated = vec![];
        for login in top {
            match self.gh.hydrate(&login).await {
                Ok(c) => hydrated.push(c),
                Err(e) => tracing::warn!("hydrate failed for {}: {}", login, e),
            }
        }

        let topic_texts: Vec<String> = hydrated.iter().map(candidate_topic_text).collect();
        let cand_embs = if topic_texts.is_empty() { vec![] } else { self.emb.embed(&topic_texts)? };

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

        for (c, _, e) in &scored {
            self.lance.upsert_candidate(&contact.id, c, e).await.ok();
        }

        let result = match scored.first() {
            None => MatchResult {
                contact_id: contact.id.clone(),
                login: None, score: 0.0, breakdown: None,
                evidence: json!({"reason": "hydration_empty"}),
                arm_id: Some(arm_id_owned.clone()),
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
                arm_id: Some(arm_id_owned.clone()),
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
                arm_id: Some(arm_id_owned.clone()),
                status: MatchStatus::NoGithub,
            },
        };

        let reward = match result.status {
            MatchStatus::Matched => result.score as f64,
            _ => 0.0,
        };
        self.bandit.report(&arm_id_owned, reward).await.ok();

        self.lance.write_result(&result).await?;
        Ok(result)
    }
}

fn mean_rows(rows: &[Vec<f32>]) -> Vec<f32> {
    if rows.is_empty() { return vec![]; }
    let d = rows[0].len();
    let mut out = vec![0.0_f32; d];
    for r in rows { for (i, v) in r.iter().enumerate() { out[i] += v; } }
    let n = rows.len() as f32;
    for v in &mut out { *v /= n; }
    let norm: f32 = out.iter().map(|x| x * x).sum::<f32>().sqrt().max(1e-12);
    for v in &mut out { *v /= norm; }
    out
}
