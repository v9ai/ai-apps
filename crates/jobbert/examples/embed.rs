//! Embed job titles with JobBERT-v3 and compute similarities.

use jobbert::{best_device, JobBertEmbedder};

fn main() -> jobbert::Result<()> {
    tracing_subscriber::fmt::init();

    let device = best_device()?;
    let model = JobBertEmbedder::from_hf(&device)?;

    let queries = [
        "Senior Machine Learning Engineer",
        "React Frontend Developer",
        "DevOps Engineer",
    ];

    let documents = [
        "ML Engineer - Deep Learning & NLP",
        "Full Stack React + TypeScript Developer",
        "Site Reliability Engineer - Kubernetes",
        "Data Scientist - Computer Vision",
        "Backend Python Developer",
    ];

    eprintln!("\n=== JobBERT-v3 Embeddings (dim={}) ===\n", model.dim());

    let query_vecs = model.embed_batch(
        &queries.iter().map(|s| *s).collect::<Vec<_>>(),
    )?;

    let doc_vecs = model.embed_batch(
        &documents.iter().map(|s| *s).collect::<Vec<_>>(),
    )?;

    for (i, query) in queries.iter().enumerate() {
        eprintln!("Query: {query}");
        let mut sims: Vec<(usize, f32)> = doc_vecs.iter()
            .enumerate()
            .map(|(j, dv)| (j, JobBertEmbedder::cosine_similarity(&query_vecs[i], dv)))
            .collect();
        sims.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        for (j, sim) in &sims {
            eprintln!("  {sim:.4}  {}", documents[*j]);
        }
        eprintln!();
    }

    Ok(())
}
