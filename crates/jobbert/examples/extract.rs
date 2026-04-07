//! Extract skills from job descriptions using JobBERT NER.

use jobbert::{best_device, SkillClassifier, TaxonomyMapper};

fn main() -> jobbert::Result<()> {
    tracing_subscriber::fmt::init();

    let device = best_device()?;
    let classifier = SkillClassifier::from_hf(&device)?;
    let taxonomy = TaxonomyMapper::new();

    let texts = [
        "We are looking for a Senior Software Engineer with experience in Python, React, and AWS. Knowledge of machine learning and Docker is a plus.",
        "Ideal candidate has 5+ years of experience with TypeScript, Node.js, PostgreSQL, and Kubernetes. Familiarity with GraphQL and CI/CD pipelines preferred.",
        "Looking for an ML Engineer skilled in PyTorch, transformers, and RAG architectures. Experience with LLMs and fine-tuning required.",
    ];

    eprintln!("\n=== JobBERT Skill Extraction ===\n");

    for text in &texts {
        eprintln!("Text: {text}");
        let skills = classifier.extract(text)?;
        eprintln!("  Extracted {} skills:", skills.len());

        for skill in &skills {
            let mapped = taxonomy.map_skill(&skill.text);
            let tag_str = mapped.canonical_tag
                .as_deref()
                .unwrap_or("(unmapped)");
            let method_str = mapped.method
                .map(|m| format!("{m:?}"))
                .unwrap_or_else(|| "-".to_string());
            eprintln!(
                "    [{:.2}] \"{}\" → {} ({}, map_conf={:.2})",
                skill.confidence, skill.text, tag_str, method_str, mapped.mapping_confidence
            );
        }
        eprintln!();
    }

    eprintln!("Taxonomy: {} canonical tags", taxonomy.tag_count());

    Ok(())
}
