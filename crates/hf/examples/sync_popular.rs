use std::time::Instant;
use hf::{HfClient, RepoType};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let db = hf::db::HfDb::open("hf_popular.db")?;

    let start = Instant::now();

    // ── Models: top 10,000 by downloads ───────────────────────
    print_phase("models", 10_000);
    let models = client.list_popular_models(10_000).await?;
    let fetched = models.len();
    let saved = db.upsert_repos(&models, RepoType::Model)?;
    drop(models);
    print_done("models", fetched, saved);

    // ── Datasets: top 5,000 by downloads ──────────────────────
    print_phase("datasets", 5_000);
    let datasets = client.list_popular_datasets(5_000).await?;
    let fetched = datasets.len();
    let saved = db.upsert_repos(&datasets, RepoType::Dataset)?;
    drop(datasets);
    print_done("datasets", fetched, saved);

    // ── Spaces: top 5,000 by likes ────────────────────────────
    print_phase("spaces", 5_000);
    let spaces = client.list_popular_spaces(5_000).await?;
    let fetched = spaces.len();
    let saved = db.upsert_repos(&spaces, RepoType::Space)?;
    drop(spaces);
    print_done("spaces", fetched, saved);

    let elapsed = start.elapsed();

    // ── Summary ───────────────────────────────────────────────
    println!("\n{}", "=".repeat(60));
    println!("  SYNC COMPLETE in {:.1}s", elapsed.as_secs_f64());
    println!("{}", "=".repeat(60));
    println!("  Models:   {:>6}", db.count(RepoType::Model)?);
    println!("  Datasets: {:>6}", db.count(RepoType::Dataset)?);
    println!("  Spaces:   {:>6}", db.count(RepoType::Space)?);
    println!("  TOTAL:    {:>6}", db.total_count()?);
    println!("  DB size:  {:.1} MB", db.file_size()? as f64 / 1_048_576.0);
    println!();

    // ── Analytics ─────────────────────────────────────────────
    section("Top 15 pipeline tags (models)");
    query_print(&db, "
        SELECT pipeline_tag, COUNT(*) as cnt, SUM(downloads) as total_dl
        FROM hf_repos WHERE repo_type = 'model' AND pipeline_tag IS NOT NULL
        GROUP BY pipeline_tag ORDER BY cnt DESC LIMIT 15
    ")?;

    section("Top 15 libraries");
    query_print(&db, "
        SELECT library, COUNT(*) as cnt, SUM(downloads) as total_dl
        FROM hf_repos WHERE repo_type = 'model' AND library IS NOT NULL
        GROUP BY library ORDER BY cnt DESC LIMIT 15
    ")?;

    section("Top 15 authors by model count");
    query_print(&db, "
        SELECT author, COUNT(*) as cnt, SUM(downloads) as total_dl
        FROM hf_repos WHERE repo_type = 'model' AND author IS NOT NULL
        GROUP BY author ORDER BY cnt DESC LIMIT 15
    ")?;

    section("Top 15 authors by dataset count");
    query_print(&db, "
        SELECT author, COUNT(*) as cnt, SUM(downloads) as total_dl
        FROM hf_repos WHERE repo_type = 'dataset' AND author IS NOT NULL
        GROUP BY author ORDER BY cnt DESC LIMIT 15
    ")?;

    section("Top 10 Space SDKs");
    query_print(&db, "
        SELECT sdk, COUNT(*) as cnt
        FROM hf_repos WHERE repo_type = 'space' AND sdk IS NOT NULL
        GROUP BY sdk ORDER BY cnt DESC LIMIT 10
    ")?;

    section("Gated models");
    let gated: i64 = db.conn().query_row(
        "SELECT COUNT(*) FROM hf_repos WHERE repo_type = 'model' AND gated IS NOT NULL AND gated != 'false'",
        [], |r| r.get(0),
    )?;
    let total_models = db.count(RepoType::Model)?;
    println!("  {gated} / {total_models} models are gated ({:.1}%)", gated as f64 / total_models as f64 * 100.0);

    section("Models with siblings (file listings)");
    let with_files: i64 = db.conn().query_row(
        "SELECT COUNT(*) FROM hf_repos WHERE repo_type = 'model' AND siblings IS NOT NULL",
        [], |r| r.get(0),
    )?;
    println!("  {with_files} / {total_models} models have file listings");

    section("License distribution (top 10, from tags)");
    let mut stmt = db.conn().prepare(
        "SELECT json_each.value, COUNT(*) as cnt
         FROM hf_repos, json_each(hf_repos.tags)
         WHERE repo_type = 'model' AND json_each.value LIKE 'license:%'
         GROUP BY json_each.value ORDER BY cnt DESC LIMIT 10"
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let tag: String = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        println!("  {tag:45} {cnt}");
    }

    println!("\nDone. Database: hf_popular.db");
    Ok(())
}

fn print_phase(kind: &str, target: usize) {
    println!("\nFetching {kind} (top {target})...");
}

fn print_done(kind: &str, fetched: usize, saved: usize) {
    println!("  fetched={fetched}  saved={saved} {kind}");
}

fn section(title: &str) {
    println!("\n--- {title} ---");
}

fn query_print(db: &hf::db::HfDb, sql: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut stmt = db.conn().prepare(sql)?;
    let col_count = stmt.column_count();
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        if col_count >= 3 {
            let dl: i64 = row.get(2)?;
            println!("  {name:45} count={cnt:<6} downloads={dl}");
        } else {
            println!("  {name:45} count={cnt}");
        }
    }
    Ok(())
}
