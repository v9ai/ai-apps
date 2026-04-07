use hf::{HfClient, OrgScanner};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = HfClient::from_env(8)?;
    let scanner = OrgScanner::new(&client);

    let orgs = ["AssemblyAI", "sumble"];

    for org in orgs {
        println!("\n{}", "=".repeat(70));
        println!("  SCANNING: {org}");
        println!("{}", "=".repeat(70));

        let profile = scanner.scan_org(org).await?;
        let score = OrgScanner::compute_hf_score(&profile);

        println!("\n  Models:    {}", profile.models.len());
        println!("  Datasets:  {}", profile.datasets.len());
        println!("  Spaces:    {}", profile.spaces.len());
        println!("  Downloads: {}", profile.total_downloads);
        println!("  HF Score:  {score:.3}");

        if !profile.libraries_used.is_empty() {
            println!("\n  Libraries:");
            for (lib, count) in &profile.libraries_used {
                println!("    {lib}: {count}");
            }
        }

        if !profile.pipeline_tags.is_empty() {
            println!("\n  Pipeline tags:");
            for (tag, count) in &profile.pipeline_tags {
                println!("    {tag}: {count}");
            }
        }

        if !profile.arxiv_links.is_empty() {
            println!("\n  ArXiv links:");
            for link in &profile.arxiv_links {
                println!("    {link}");
            }
        }

        if !profile.training_signals.is_empty() {
            println!("\n  Training signals:");
            for signal in &profile.training_signals {
                println!(
                    "    [{:?}] {} — {}",
                    signal.signal_type, signal.repo_id, signal.evidence
                );
            }
        }

        // Print individual models with details
        if !profile.models.is_empty() {
            println!("\n  Models detail:");
            for m in &profile.models {
                let repo_id = m.repo_id.as_deref().unwrap_or("?");
                let dl = m.downloads.unwrap_or(0);
                let likes = m.likes.unwrap_or(0);
                let lib = m.library.as_deref().unwrap_or("-");
                let tag = m.pipeline_tag.as_deref().unwrap_or("-");
                println!("    {repo_id}  dl={dl}  likes={likes}  lib={lib}  tag={tag}");
            }
        }

        if !profile.datasets.is_empty() {
            println!("\n  Datasets detail:");
            for d in &profile.datasets {
                let repo_id = d.repo_id.as_deref().unwrap_or("?");
                let dl = d.downloads.unwrap_or(0);
                println!("    {repo_id}  dl={dl}");
            }
        }

        println!();
    }

    Ok(())
}
