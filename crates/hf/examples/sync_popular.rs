use hf::{HfClient, RepoType};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let db = hf::db::HfDb::open("hf_popular.db")?;

    println!("Fetching popular models (top 200)...");
    let models = client.list_popular_models(200).await?;
    println!("Got {} models", models.len());
    for m in models.iter().take(10) {
        println!(
            "  {:50} dl={:<12} likes={:<8} lib={:<20} task={}",
            m.repo_id.as_deref().unwrap_or("?"),
            m.downloads.unwrap_or(0),
            m.likes.unwrap_or(0),
            m.library.as_deref().unwrap_or("-"),
            m.pipeline_tag.as_deref().unwrap_or("-"),
        );
    }
    let count = db.upsert_repos(&models, RepoType::Model)?;
    println!("Saved {count} models to SQLite\n");

    println!("Fetching popular datasets (top 100)...");
    let datasets = client.list_popular_datasets(100).await?;
    println!("Got {} datasets", datasets.len());
    for d in datasets.iter().take(5) {
        println!(
            "  {:50} dl={:<12} likes={}",
            d.repo_id.as_deref().unwrap_or("?"),
            d.downloads.unwrap_or(0),
            d.likes.unwrap_or(0),
        );
    }
    let count = db.upsert_repos(&datasets, RepoType::Dataset)?;
    println!("Saved {count} datasets to SQLite\n");

    println!("Fetching popular spaces (top 50)...");
    let spaces = client.list_popular_spaces(50).await?;
    println!("Got {} spaces", spaces.len());
    for s in spaces.iter().take(5) {
        println!(
            "  {:50} likes={}",
            s.repo_id.as_deref().unwrap_or("?"),
            s.likes.unwrap_or(0),
        );
    }
    let count = db.upsert_repos(&spaces, RepoType::Space)?;
    println!("Saved {count} spaces to SQLite\n");

    // Summary from DB
    println!("=== DB Summary ===");
    println!("Models:   {}", db.count(RepoType::Model)?);
    println!("Datasets: {}", db.count(RepoType::Dataset)?);
    println!("Spaces:   {}", db.count(RepoType::Space)?);

    // Check v9ai repos specifically
    let v9ai_count: i64 = db.conn().query_row(
        "SELECT COUNT(*) FROM hf_repos WHERE repo_id LIKE 'v9ai/%'",
        [],
        |row| row.get(0),
    )?;
    println!("\nv9ai repos in popular: {v9ai_count}");

    // Top 5 pipeline tags
    println!("\n=== Top pipeline tags (models) ===");
    let mut stmt = db.conn().prepare(
        "SELECT pipeline_tag, COUNT(*) as cnt, SUM(downloads) as total_dl
         FROM hf_repos WHERE repo_type = 'model' AND pipeline_tag IS NOT NULL
         GROUP BY pipeline_tag ORDER BY cnt DESC LIMIT 10"
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let tag: String = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        let dl: i64 = row.get(2)?;
        println!("  {tag:40} count={cnt:<5} total_dl={dl}");
    }

    // Top libraries
    println!("\n=== Top libraries (models) ===");
    let mut stmt = db.conn().prepare(
        "SELECT library, COUNT(*) as cnt
         FROM hf_repos WHERE repo_type = 'model' AND library IS NOT NULL
         GROUP BY library ORDER BY cnt DESC LIMIT 10"
    )?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let lib: String = row.get(0)?;
        let cnt: i64 = row.get(1)?;
        println!("  {lib:40} count={cnt}");
    }

    println!("\nDone. Database saved to hf_popular.db");
    Ok(())
}
