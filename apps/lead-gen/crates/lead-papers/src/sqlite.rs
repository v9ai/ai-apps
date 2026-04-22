use anyhow::Result;
use serde_json::json;
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Pool, Sqlite};

pub type Db = Pool<Sqlite>;

pub async fn connect(path: &str) -> Result<Db> {
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let url = format!("sqlite:{}?mode=rwc", path);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&url)
        .await?;
    sqlx::query("pragma journal_mode=wal").execute(&pool).await.ok();
    sqlx::query("pragma synchronous=normal").execute(&pool).await.ok();
    Ok(pool)
}

pub async fn migrate(db: &Db) -> Result<()> {
    sqlx::query(include_str!("../migrations/sqlite_0001.sql"))
        .execute(db)
        .await?;
    Ok(())
}

// ── topics / runs ─────────────────────────────────────────────────────

#[allow(dead_code)]
pub async fn upsert_topic(db: &Db, query: &str) -> Result<i64> {
    sqlx::query(
        "insert into topics(query, last_run_at) values(?, datetime('now'))
         on conflict(query) do update set last_run_at = datetime('now')",
    )
    .bind(query)
    .execute(db)
    .await?;
    let (id,): (i64,) = sqlx::query_as("select id from topics where query = ?")
        .bind(query)
        .fetch_one(db)
        .await?;
    Ok(id)
}

#[allow(dead_code)]
pub async fn start_run(db: &Db, topic_id: Option<i64>) -> Result<i64> {
    let r = sqlx::query("insert into runs(topic_id) values(?)")
        .bind(topic_id)
        .execute(db)
        .await?;
    Ok(r.last_insert_rowid())
}

#[allow(dead_code)]
pub async fn finish_run(db: &Db, run_id: i64, stats: &serde_json::Value) -> Result<()> {
    sqlx::query("update runs set finished_at=datetime('now'), stats_json=? where id=?")
        .bind(stats.to_string())
        .bind(run_id)
        .execute(db)
        .await?;
    Ok(())
}

// ── papers ────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn upsert_paper(
    db: &Db,
    id: &str,
    doi: Option<&str>,
    arxiv_id: Option<&str>,
    title: &str,
    year: Option<i32>,
    venue: Option<&str>,
    citations: Option<i32>,
    source: &str,
    pdf_url: Option<&str>,
    html_url: Option<&str>,
    fields: &[String],
    authors: &[String],
    affiliations: &[String],
    abstract_text: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"insert into papers(id, doi, arxiv_id, title, year, venue, citation_count,
                              source, pdf_url, html_url, fields_json, authors_json,
                              affiliations_json, abstract_text)
           values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           on conflict(id) do update set
             citation_count    = coalesce(excluded.citation_count, papers.citation_count),
             venue             = coalesce(excluded.venue, papers.venue),
             html_url          = coalesce(excluded.html_url, papers.html_url),
             authors_json      = excluded.authors_json,
             affiliations_json = excluded.affiliations_json,
             abstract_text     = coalesce(excluded.abstract_text, papers.abstract_text),
             updated_at        = datetime('now')"#,
    )
    .bind(id).bind(doi).bind(arxiv_id).bind(title).bind(year).bind(venue)
    .bind(citations).bind(source).bind(pdf_url).bind(html_url)
    .bind(json!(fields).to_string())
    .bind(json!(authors).to_string())
    .bind(json!(affiliations).to_string())
    .bind(abstract_text)
    .execute(db)
    .await?;
    Ok(())
}

#[allow(dead_code)]
pub async fn link_paper_topic(db: &Db, topic_id: i64, paper_id: &str, rank: f32) -> Result<()> {
    sqlx::query(
        "insert into paper_topics(topic_id, paper_id, rank_score) values(?,?,?)
         on conflict do update set rank_score=excluded.rank_score",
    )
    .bind(topic_id).bind(paper_id).bind(rank)
    .execute(db).await?;
    Ok(())
}

// ── authors / coauthors ──────────────────────────────────────────────

#[allow(clippy::too_many_arguments, dead_code)]
pub async fn upsert_author(
    db: &Db,
    id: &str,
    name: &str,
    variants: &[String],
    primary_affil: Option<&str>,
    orcid: Option<&str>,
    email_hints: &[String],
    paper_count: i32,
    year_min: Option<i32>,
    year_max: Option<i32>,
    total_citations: i32,
    h_index: i32,
) -> Result<()> {
    sqlx::query(
        r#"insert into authors(id, display_name, name_variants, primary_affil, orcid,
                               email_hints, paper_count, year_min, year_max,
                               total_citations, h_index)
           values(?,?,?,?,?,?,?,?,?,?,?)
           on conflict(id) do update set
             name_variants    = excluded.name_variants,
             primary_affil    = coalesce(excluded.primary_affil, authors.primary_affil),
             orcid            = coalesce(excluded.orcid, authors.orcid),
             email_hints      = excluded.email_hints,
             paper_count      = excluded.paper_count,
             year_min         = excluded.year_min,
             year_max         = excluded.year_max,
             total_citations  = excluded.total_citations,
             h_index          = excluded.h_index"#,
    )
    .bind(id).bind(name)
    .bind(json!(variants).to_string())
    .bind(primary_affil).bind(orcid)
    .bind(json!(email_hints).to_string())
    .bind(paper_count).bind(year_min).bind(year_max)
    .bind(total_citations).bind(h_index)
    .execute(db).await?;
    Ok(())
}

#[allow(dead_code)]
pub async fn link_paper_author(
    db: &Db, paper_id: &str, author_id: &str, position: &str, position_index: i32,
) -> Result<()> {
    sqlx::query(
        "insert into paper_authors(paper_id, author_id, position, position_index) values(?,?,?,?)
         on conflict do update set position=excluded.position",
    )
    .bind(paper_id).bind(author_id).bind(position).bind(position_index)
    .execute(db).await?;
    Ok(())
}

#[allow(dead_code)]
pub async fn increment_coauthor(db: &Db, a: &str, b: &str, year: Option<i32>) -> Result<()> {
    let (x, y) = if a < b { (a, b) } else { (b, a) };
    sqlx::query(
        r#"insert into author_coauthors(author_id, coauthor_id, co_count, years_json)
           values(?,?,1,?)
           on conflict do update set co_count = author_coauthors.co_count + 1"#,
    )
    .bind(x).bind(y)
    .bind(json!(year.map(|y| vec![y]).unwrap_or_default()).to_string())
    .execute(db).await?;
    Ok(())
}

// ── bandit ────────────────────────────────────────────────────────────

const DISCOUNT: f64 = 0.95;
const EXPLORE_C: f64 = 1.4;

pub async fn ensure_arms(db: &Db, pool: &str, arms: &[&str]) -> Result<()> {
    for id in arms {
        sqlx::query("insert or ignore into bandit_arms(pool, arm_id) values(?,?)")
            .bind(pool).bind(id).execute(db).await?;
    }
    Ok(())
}

pub async fn select_arm(db: &Db, pool: &str, avail: &[String]) -> Result<String> {
    if avail.is_empty() {
        return Ok("name_only".into());
    }
    let placeholders = std::iter::repeat("?").take(avail.len()).collect::<Vec<_>>().join(",");
    let sql = format!(
        "select arm_id, pulls, reward_sum from bandit_arms where pool=? and arm_id in ({})",
        placeholders
    );
    let mut q = sqlx::query_as::<_, (String, i64, f64)>(&sql).bind(pool);
    for a in avail { q = q.bind(a); }
    let rows = q.fetch_all(db).await?;

    let total: i64 = rows.iter().map(|r| r.1).sum::<i64>().max(1);
    let ln_t = (total as f64).ln().max(1.0);

    let mut best = avail[0].clone();
    let mut best_ucb = f64::MIN;
    for arm in avail {
        let (p, r) = rows.iter().find(|row| &row.0 == arm)
            .map(|row| (row.1 as f64, row.2))
            .unwrap_or((0.0, 0.0));
        let mean = if p > 0.0 { r / p } else { 0.0 };
        let bonus = if p > 0.0 { EXPLORE_C * (ln_t / p).sqrt() } else { f64::INFINITY };
        let ucb = mean + bonus;
        if ucb > best_ucb { best_ucb = ucb; best = arm.clone(); }
    }
    Ok(best)
}

pub async fn report_arm(db: &Db, pool: &str, arm: &str, reward: f64) -> Result<()> {
    sqlx::query(
        r#"update bandit_arms set
             pulls      = cast(pulls * ? + 1 as integer),
             reward_sum = reward_sum * ? + ?,
             reward_sq  = reward_sq  * ? + ?*?,
             last_pull  = datetime('now')
           where pool=? and arm_id=?"#,
    )
    .bind(DISCOUNT).bind(DISCOUNT).bind(reward)
    .bind(DISCOUNT).bind(reward).bind(reward)
    .bind(pool).bind(arm)
    .execute(db).await?;
    Ok(())
}

// ── contact match state ──────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
pub async fn upsert_match_state(
    db: &Db,
    contact_id: &str,
    author_id: Option<&str>,
    status: &str,
    score: Option<f32>,
    login: Option<&str>,
    arm_id: Option<&str>,
    evidence_ref: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"insert into contact_match_state(contact_id, author_id, status, score,
                                            login, arm_id, evidence_ref)
           values(?,?,?,?,?,?,?)
           on conflict(contact_id) do update set
             author_id    = excluded.author_id,
             status       = excluded.status,
             score        = excluded.score,
             login        = excluded.login,
             arm_id       = excluded.arm_id,
             evidence_ref = excluded.evidence_ref,
             updated_at   = datetime('now')"#,
    )
    .bind(contact_id).bind(author_id).bind(status).bind(score)
    .bind(login).bind(arm_id).bind(evidence_ref)
    .execute(db).await?;
    Ok(())
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct MatchStateRow {
    pub contact_id: String,
    #[allow(dead_code)]
    pub author_id: Option<String>,
    pub status: String,
    pub score: Option<f32>,
    pub login: Option<String>,
    pub arm_id: Option<String>,
    pub evidence_ref: Option<String>,
}

pub async fn list_match_state(db: &Db, status: &str) -> Result<Vec<MatchStateRow>> {
    let rows = sqlx::query_as::<_, MatchStateRow>(
        "select contact_id, author_id, status, score, login, arm_id, evidence_ref
         from contact_match_state where status = ?",
    )
    .bind(status)
    .fetch_all(db)
    .await?;
    Ok(rows)
}

// ── fetch cache ──────────────────────────────────────────────────────

pub async fn record_fetch(db: &Db, key: &str, format: &str, source_url: &str) -> Result<()> {
    sqlx::query(
        "insert into fetch_cache(key, format, source_url) values(?,?,?)
         on conflict(key) do update set
           format     = excluded.format,
           source_url = excluded.source_url,
           fetched_at = datetime('now')",
    )
    .bind(key).bind(format).bind(source_url)
    .execute(db).await?;
    Ok(())
}

pub async fn has_fetch(db: &Db, key: &str) -> Result<bool> {
    let row: Option<(i64,)> =
        sqlx::query_as("select 1 from fetch_cache where key = ?")
            .bind(key)
            .fetch_optional(db)
            .await?;
    Ok(row.is_some())
}
