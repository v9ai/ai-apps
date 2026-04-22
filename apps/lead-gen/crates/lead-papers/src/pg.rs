use crate::types::{Contact, MatchResult};
use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn connect(url: &str) -> Result<PgPool> {
    Ok(PgPoolOptions::new()
        .max_connections(5)
        .connect(url)
        .await?)
}

pub async fn migrate(pg: &PgPool) -> Result<()> {
    let sql = include_str!("../migrations/0001_init.sql");
    sqlx::raw_sql(sql).execute(pg).await?;
    Ok(())
}

pub async fn upsert_contact(pg: &PgPool, c: &Contact) -> Result<()> {
    sqlx::query(
        r#"insert into contacts(id,name,affiliation,email,tags)
           values($1,$2,$3,$4,$5)
           on conflict (id) do update set
             name=excluded.name,
             affiliation=excluded.affiliation,
             email=excluded.email,
             tags=excluded.tags"#,
    )
    .bind(&c.id).bind(&c.name).bind(&c.affiliation).bind(&c.email).bind(&c.tags)
    .execute(pg).await?;
    Ok(())
}

pub async fn persist_match(pg: &PgPool, r: &MatchResult) -> Result<()> {
    let (name_sim, affil, topic) = match &r.breakdown {
        Some(b) => (b.name_sim, b.affil_overlap, b.topic_cos),
        None => (0.0, 0.0, 0.0),
    };
    sqlx::query(
        r#"insert into gh_matches(contact_id,login,score,name_sim,affil_overlap,topic_cos,evidence,arm_id,status)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (contact_id) do update set
             login=excluded.login,
             score=excluded.score,
             name_sim=excluded.name_sim,
             affil_overlap=excluded.affil_overlap,
             topic_cos=excluded.topic_cos,
             evidence=excluded.evidence,
             arm_id=excluded.arm_id,
             status=excluded.status,
             matched_at=now()"#,
    )
    .bind(&r.contact_id)
    .bind(&r.login)
    .bind(r.score)
    .bind(name_sim)
    .bind(affil)
    .bind(topic)
    .bind(&r.evidence)
    .bind(&r.arm_id)
    .bind(r.status.as_str())
    .execute(pg).await?;
    Ok(())
}
