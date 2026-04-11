/// Ingest a LinkedIn profile into the contacts table using JobBERT skill extraction.
///
/// Extracts skills from the profile's about/experience text using BERT NER,
/// maps them to canonical taxonomy tags, and inserts the contact into Neon PostgreSQL
/// with "open-to-work" + extracted skill tags.
use std::collections::BTreeSet;

use anyhow::Result;
use jobbert::{best_device, SkillClassifier, TaxonomyMapper};
use linkedin_posts::neon;

// ── Profile data ────────────────────────────────────────────────────────────

const FIRST_NAME: &str = "Diana";
const LAST_NAME: &str = "Cazangiu";
const LINKEDIN_URL: &str = "https://www.linkedin.com/in/diana-catalina-cazangiu-1b231439/";
const POSITION: &str = "Software Engineer in Test";
const COMPANY: &str = "Eviden Technologies";
const SENIORITY: &str = "Senior";
const DEPARTMENT: &str = "Engineering";

/// Concatenated about + experience text for skill extraction.
const PROFILE_TEXT: &str = "\
1 year in Web development: HTML, CSS, JavaScript, libraries (Bootstrap), \
extensions (Font Awesome, Google Fonts), Node.Js, Responsive design, ReactJS and TypeScript. \
5+ years in automation testing using Java, C#, Cucumber, Selenium, SpecFlow, Visual Studio, \
Python, JIRA, Confluence, SVN Subversion, Git, GitHub. \
Experience in performance testing using JMeter. \
Experience in working with Jenkins integration of automated tests in Jenkins pipeline. \
Software Engineer in Test at Eviden: creating test plan, test scenarios; \
development a framework using IntelliJ and Java for automated testing; \
performing automated testing for Vodafone Germany project; \
develop scripts for automated testing using Cypress and JavaScript; \
integration testing and performance testing; JUnit, Git. \
Schaeffler: developing new functionalities using Python code and dSPACE AutomationDesk; \
Python scripts for Data Analysis. \
NTT DATA Romania: plan develop and execute automatic tests using MS Excel; \
Vector CANalyzer, Vector CANape, LabVIEW development environment. \
Siemens Industry Software: QC software engineer for Siemens NX; \
automated tests using C++ language; Nastran solver. \
Transilvania University: mechanical automotive design using CATIA v5; CAD simulation. \
Web Page Digital Multimedia Design CodeBerry: React.js. \
PhD Mechanical Engineering Transilvania University of Brasov. \
Courses: Ethical Hacking, Industrial automation. \
Senior QA Engineer with 8+ years of hands-on experience in manual testing, \
test automation and quality assurance for complex enterprise, telecom, and automotive systems. \
Java test automation using Selenium, Cucumber, TestNG, Maven, \
API testing REST Postman, backend validation, SQL, Unix Linux, \
performance testing with JMeter. Agile environments.";

/// Fixed role tags from "Open to work" section.
const ROLE_TAGS: &[&str] = &[
    "open-to-work",
    "web-developer",
    "qa-automation",
    "frontend-developer",
    "java-engineer",
    "senior-test-engineer",
];

#[tokio::main]
async fn main() -> Result<()> {
    // Load .env.local (for NEON_DATABASE_URL)
    for path in &["../../.env.local", "../../.env", ".env"] {
        let _ = dotenvy::from_filename(path);
    }

    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    rustls::crypto::ring::default_provider()
        .install_default()
        .expect("Failed to install rustls crypto provider");

    // ── Step 1: JobBERT skill extraction ────────────────────────────────────

    eprintln!("\n=== JobBERT Skill Extraction ===\n");

    let device = best_device()?;
    eprintln!("Device: {:?}", device);

    let classifier = SkillClassifier::from_hf(&device)?;
    let taxonomy = TaxonomyMapper::new();

    let skills = classifier.extract(PROFILE_TEXT)?;
    eprintln!("Extracted {} raw skill spans:\n", skills.len());

    let mut canonical_tags: BTreeSet<String> = BTreeSet::new();

    // False positives from fuzzy matching — suppress these
    let suppress: &[&str] = &["gcp", "github-actions"];

    for skill in &skills {
        let mapped = taxonomy.map_skill(&skill.text);
        let tag = mapped
            .canonical_tag
            .as_deref()
            .unwrap_or("(unmapped)");
        let method = mapped
            .method
            .map(|m| format!("{m:?}"))
            .unwrap_or_else(|| "-".into());
        eprintln!(
            "  [{:.2}] {:30} → {:20} ({}, map={:.2})",
            skill.confidence, skill.text, tag, method, mapped.mapping_confidence
        );

        if let Some(ref canonical) = mapped.canonical_tag {
            if !suppress.contains(&canonical.as_str()) {
                canonical_tags.insert(canonical.clone());
            }
        }
    }

    // ── Step 2: Build final tags array ──────────────────────────────────────

    let mut all_tags: Vec<String> = ROLE_TAGS.iter().map(|t| t.to_string()).collect();
    for tag in &canonical_tags {
        if !all_tags.contains(tag) {
            all_tags.push(tag.clone());
        }
    }

    let tags_json = serde_json::to_string(&all_tags)?;

    eprintln!("\n=== Final Tags ({}) ===\n", all_tags.len());
    for tag in &all_tags {
        eprintln!("  • {tag}");
    }

    // ── Step 3: Insert into Neon PostgreSQL ─────────────────────────────────

    eprintln!("\n=== Neon PostgreSQL Insert ===\n");

    let client = neon::connect_neon().await?;

    let contact_id = neon::upsert_contact_by_linkedin(
        &client,
        FIRST_NAME,
        LAST_NAME,
        LINKEDIN_URL,
        Some(POSITION),
        Some(COMPANY),
        &tags_json,
        Some(SENIORITY),
        Some(DEPARTMENT),
    )
    .await?;

    eprintln!("Contact saved: id={contact_id}");
    eprintln!("  Name:     {FIRST_NAME} {LAST_NAME}");
    eprintln!("  Position: {POSITION}");
    eprintln!("  Company:  {COMPANY}");
    eprintln!("  LinkedIn: {LINKEDIN_URL}");
    eprintln!("  Tags:     {tags_json}");
    eprintln!("  JobBERT canonical skills: {}", canonical_tags.len());

    eprintln!("\nDone.");
    Ok(())
}
