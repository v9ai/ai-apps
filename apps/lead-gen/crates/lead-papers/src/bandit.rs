use anyhow::Result;
use chrono::Utc;
use sqlx::PgPool;

const POOL: &str = "github_query";
const DISCOUNT: f64 = 0.95;
const EXPLORE_C: f64 = 1.4;

pub struct Bandit<'a> {
    pub pg: &'a PgPool,
}

impl<'a> Bandit<'a> {
    pub async fn ensure_arms(&self, arm_ids: &[&str]) -> Result<()> {
        for id in arm_ids {
            sqlx::query(
                "insert into bandit_arms(pool, arm_id) values($1,$2) on conflict do nothing",
            )
            .bind(POOL)
            .bind(id)
            .execute(self.pg)
            .await?;
        }
        Ok(())
    }

    pub async fn select(&self, available: &[String]) -> Result<String> {
        if available.is_empty() {
            return Ok("name_only".into());
        }
        let rows: Vec<(String, i32, f64)> = sqlx::query_as(
            "select arm_id, pulls, reward_sum from bandit_arms where pool=$1 and arm_id = any($2)",
        )
        .bind(POOL)
        .bind(available)
        .fetch_all(self.pg)
        .await?;

        let total_pulls: i32 = rows.iter().map(|r| r.1).sum::<i32>().max(1);
        let ln_t = (total_pulls as f64).ln().max(1.0);

        let mut best_arm = available[0].clone();
        let mut best_ucb = f64::MIN;
        for arm in available {
            let (pulls, reward) = rows
                .iter()
                .find(|r| &r.0 == arm)
                .map(|r| (r.1 as f64, r.2))
                .unwrap_or((0.0, 0.0));
            let mean = if pulls > 0.0 { reward / pulls } else { 0.0 };
            let bonus = if pulls > 0.0 {
                EXPLORE_C * (ln_t / pulls).sqrt()
            } else {
                f64::INFINITY
            };
            let ucb = mean + bonus;
            if ucb > best_ucb {
                best_ucb = ucb;
                best_arm = arm.clone();
            }
        }
        Ok(best_arm)
    }

    /// Discounted reward update: pulls and reward_sum get decayed.
    pub async fn report(&self, arm_id: &str, reward: f64) -> Result<()> {
        sqlx::query(
            r#"update bandit_arms
               set pulls = (pulls::double precision * $1 + 1)::integer,
                   reward_sum = reward_sum * $1 + $2,
                   reward_sq  = reward_sq  * $1 + $2*$2,
                   last_pull  = $3
               where pool=$4 and arm_id=$5"#,
        )
        .bind(DISCOUNT)
        .bind(reward)
        .bind(Utc::now())
        .bind(POOL)
        .bind(arm_id)
        .execute(self.pg)
        .await?;
        Ok(())
    }
}
