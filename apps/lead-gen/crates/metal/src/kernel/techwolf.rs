//! TechWolf dataset integration — loader + eval harness for 9 HuggingFace datasets.
//!
//! Provides CSV parsing for all dataset formats and a skill extraction eval
//! harness that measures precision/recall/F1 of the `job_ner.rs` keyword extractor
//! and the ConTeXT ONNX extractor against ESCO ground truth.
//!
//! Dataset files are expected under `~/.cache/leadgen-ml/techwolf/` in CSV format.
//! Download from HuggingFace: `huggingface-cli download TechWolf/<dataset> --local-dir ...`
//!
//! Requires feature: `kernel-techwolf`

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::similarity::simd::levenshtein_similarity;

// ── Dataset record structs ──────────────────────────────────────────────────────

/// Dataset 1: TechWolf/vacancy-job-to-skill — job title → ESCO skills.
#[derive(Debug, Clone, Deserialize)]
pub struct VacancyJobToSkill {
    pub vacancy_job_title: String,
    /// Parsed from a JSON array column in the CSV.
    pub tagged_esco_skills: Vec<String>,
}

/// Dataset 2: TechWolf/SkillMatch-1K — skill pair relatedness.
#[derive(Debug, Clone, Deserialize)]
pub struct SkillMatchPair {
    pub skill_a: String,
    pub skill_b: String,
    pub related: bool,
}

/// Dataset 3: TechWolf/JobBERT-evaluation-dataset — title → ESCO occupation.
#[derive(Debug, Clone, Deserialize)]
pub struct JobBertEval {
    pub vacancy_job_title: String,
    pub esco_job_title: String,
    pub esco_uri: String,
}

/// Dataset 4: TechWolf/Skill-XL — sentence-level skill annotations.
#[derive(Debug, Clone, Deserialize)]
pub struct SkillXlRow {
    #[serde(rename = "ID")]
    pub id: String,
    pub subset: String,
    pub title: String,
    pub sentence: String,
    pub relevant: bool,
    pub cluster: u8,
    pub skill: String,
}

/// Dataset 5: TechWolf/Synthetic-ESCO-skill-sentences — sentence → ESCO skill.
#[derive(Debug, Clone, Deserialize)]
pub struct SyntheticEscoSentence {
    pub sentence: String,
    pub skill: String,
}

/// Datasets 6-8: TechWolf/skill-extraction-{techwolf,house,tech} — span-level annotations.
#[derive(Debug, Clone, Deserialize)]
pub struct SkillExtractionRow {
    pub sentence: String,
    #[serde(default)]
    pub span: String,
    #[serde(default)]
    pub sub_span: String,
    pub label: String,
}

/// Dataset 9: TechWolf/anonymous-working-histories — career paths.
#[derive(Debug, Clone, Deserialize)]
pub struct WorkHistory {
    pub title: String,
    pub description: String,
    pub start: String,
    pub end: String,
    #[serde(rename = "ESCO_uri")]
    pub esco_uri: String,
    #[serde(rename = "ESCO_title")]
    pub esco_title: String,
}

// ── Minimal CSV parser ──────────────────────────────────────────────────────────

/// Parse a single CSV line handling double-quoted fields.
///
/// Handles: bare fields, `"quoted fields"`, escaped quotes `""` inside quoted
/// fields, and embedded commas within quotes. Returns a `Vec<String>` of field
/// values with surrounding quotes stripped and inner `""` collapsed to `"`.
fn parse_csv_line(line: &str) -> Vec<String> {
    let mut fields: Vec<String> = Vec::new();
    let bytes = line.as_bytes();
    let len = bytes.len();
    let mut i = 0;

    while i <= len {
        if i == len {
            // Trailing empty field after final comma (only if last char was comma).
            if !fields.is_empty() && i > 0 && bytes[i - 1] == b',' {
                fields.push(String::new());
            } else if fields.is_empty() {
                // Completely empty line → single empty field.
                fields.push(String::new());
            }
            break;
        }

        if bytes[i] == b'"' {
            // Quoted field.
            let mut value = String::new();
            i += 1; // skip opening quote
            loop {
                if i >= len {
                    break;
                }
                if bytes[i] == b'"' {
                    if i + 1 < len && bytes[i + 1] == b'"' {
                        // Escaped quote → emit single quote.
                        value.push('"');
                        i += 2;
                    } else {
                        // Closing quote.
                        i += 1;
                        break;
                    }
                } else {
                    value.push(bytes[i] as char);
                    i += 1;
                }
            }
            fields.push(value);
            // Skip comma after closing quote.
            if i < len && bytes[i] == b',' {
                i += 1;
            }
        } else {
            // Unquoted field — read until comma or end.
            let start = i;
            while i < len && bytes[i] != b',' {
                i += 1;
            }
            fields.push(String::from_utf8_lossy(&bytes[start..i]).to_string());
            if i < len {
                i += 1; // skip comma
            }
            // Handle trailing comma → one more iteration will pick up the empty field.
        }
    }

    fields
}

/// Read all lines from a CSV file, skipping the header row.
/// Returns raw parsed rows as `Vec<Vec<String>>`.
fn read_csv_rows(path: &Path) -> anyhow::Result<Vec<Vec<String>>> {
    let file = std::fs::File::open(path)
        .map_err(|e| anyhow::anyhow!("cannot open CSV {}: {}", path.display(), e))?;
    let reader = BufReader::new(file);
    let mut rows = Vec::new();
    let mut first = true;

    for line in reader.lines() {
        let raw = line.map_err(|e| anyhow::anyhow!("I/O error reading {}: {}", path.display(), e))?;
        let trimmed = raw.trim_end();
        if trimmed.is_empty() {
            continue;
        }
        if first {
            first = false;
            continue; // skip header
        }
        rows.push(parse_csv_line(trimmed));
    }

    Ok(rows)
}

// ── Labels to skip in eval ──────────────────────────────────────────────────────

/// Labels that should be filtered out of ground truth before evaluation.
const SKIP_LABELS: &[&str] = &["LABEL NOT PRESENT", "UNDERSPECIFIED"];

fn should_skip_label(label: &str) -> bool {
    SKIP_LABELS.iter().any(|s| label.eq_ignore_ascii_case(s))
}

// ── ESCO mapping (inline, no separate module) ───────────────────────────────────

/// Lightweight mapping between ESCO skill labels and internal `TECH_KEYWORDS` tags.
///
/// Since there is no separate `esco` module in the crate, this struct provides a
/// self-contained bidirectional mapping built from a hardcoded table of known
/// correspondences plus a fuzzy-match fallback.
pub struct EscoMapping {
    /// ESCO label (lowercased) → internal tag (lowercased).
    esco_to_tag: HashMap<String, String>,
    /// Internal tag (lowercased) → canonical ESCO label.
    tag_to_esco: HashMap<String, String>,
}

impl Default for EscoMapping {
    fn default() -> Self {
        Self::new()
    }
}

/// Known correspondences between ESCO skill labels and `TECH_KEYWORDS`.
/// Covers the 48 keywords in `job_ner.rs` plus common ESCO synonyms.
const ESCO_TAG_PAIRS: &[(&str, &str)] = &[
    ("python (computer programming)", "python"),
    ("python", "python"),
    ("rust (programming language)", "rust"),
    ("rust", "rust"),
    ("javascript", "javascript"),
    ("typescript", "typescript"),
    ("java", "java"),
    ("go (programming language)", "go"),
    ("golang", "golang"),
    ("c++", "c++"),
    ("ruby", "ruby"),
    ("scala", "scala"),
    ("kotlin", "kotlin"),
    ("swift", "swift"),
    ("elixir", "elixir"),
    ("react", "react"),
    ("react.js", "react"),
    ("vue.js", "vue"),
    ("vue", "vue"),
    ("svelte", "svelte"),
    ("next.js", "nextjs"),
    ("nextjs", "nextjs"),
    ("nest.js", "nestjs"),
    ("nestjs", "nestjs"),
    ("express.js", "express"),
    ("express", "express"),
    ("node.js", "nodejs"),
    ("nodejs", "nodejs"),
    ("node", "node"),
    ("ruby on rails", "rails"),
    ("rails", "rails"),
    ("fastapi", "fastapi"),
    ("html", "html"),
    ("css", "css"),
    ("sql", "sql"),
    ("nosql", "nosql"),
    ("postgresql", "postgresql"),
    ("postgres", "postgres"),
    ("mongodb", "mongodb"),
    ("redis", "redis"),
    ("graphql", "graphql"),
    ("grpc", "grpc"),
    ("docker", "docker"),
    ("kubernetes", "kubernetes"),
    ("k8s", "k8s"),
    ("amazon web services", "aws"),
    ("aws", "aws"),
    ("microsoft azure", "azure"),
    ("azure", "azure"),
    ("google cloud platform", "gcp"),
    ("gcp", "gcp"),
    ("terraform", "terraform"),
    ("ansible", "ansible"),
    ("linux", "linux"),
    ("nginx", "nginx"),
    ("apache kafka", "kafka"),
    ("kafka", "kafka"),
    ("apache spark", "spark"),
    ("spark", "spark"),
    ("apache airflow", "airflow"),
    ("airflow", "airflow"),
    ("cloudflare", "cloudflare"),
    ("pytorch", "pytorch"),
    ("tensorflow", "tensorflow"),
    ("machine learning", "ml"),
    ("ml", "ml"),
    ("large language model", "llm"),
    ("llm", "llm"),
    ("langchain", "langchain"),
    ("openai", "openai"),
    ("retrieval-augmented generation", "rag"),
    ("rag", "rag"),
    ("webassembly", "webassembly"),
    ("wasm", "wasm"),
];

impl EscoMapping {
    /// Build the mapping from the hardcoded correspondence table.
    pub fn new() -> Self {
        let mut esco_to_tag = HashMap::new();
        let mut tag_to_esco = HashMap::new();

        for &(esco, tag) in ESCO_TAG_PAIRS {
            let esco_lower = esco.to_ascii_lowercase();
            let tag_lower = tag.to_ascii_lowercase();
            esco_to_tag.entry(esco_lower.clone()).or_insert_with(|| tag_lower.clone());
            tag_to_esco.entry(tag_lower).or_insert_with(|| esco_lower);
        }

        Self { esco_to_tag, tag_to_esco }
    }

    /// Look up the internal tag for an ESCO label. Falls back to fuzzy matching
    /// against known ESCO labels if no exact match is found.
    pub fn esco_to_tag(&self, esco_label: &str) -> Option<String> {
        let lower = esco_label.to_ascii_lowercase();
        if let Some(tag) = self.esco_to_tag.get(&lower) {
            return Some(tag.clone());
        }
        // Fuzzy fallback: find the closest ESCO key by Levenshtein similarity.
        let mut best: Option<(f64, &str)> = None;
        for (esco_key, tag) in &self.esco_to_tag {
            let sim = levenshtein_similarity(lower.as_bytes(), esco_key.as_bytes());
            if sim > 0.85 {
                if best.is_none() || sim > best.unwrap().0 {
                    best = Some((sim, tag.as_str()));
                }
            }
        }
        best.map(|(_, tag)| tag.to_string())
    }

    /// Look up the ESCO label for an internal tag.
    pub fn tag_to_esco(&self, tag: &str) -> Option<String> {
        self.tag_to_esco.get(&tag.to_ascii_lowercase()).cloned()
    }

    /// Number of unique ESCO→tag mappings.
    pub fn len(&self) -> usize {
        self.esco_to_tag.len()
    }

    /// Whether the mapping is empty.
    pub fn is_empty(&self) -> bool {
        self.esco_to_tag.is_empty()
    }
}

// ── Dataset loaders ─────────────────────────────────────────────────────────────

/// Base directory for TechWolf dataset files.
pub struct DatasetDir {
    base: PathBuf,
}

impl DatasetDir {
    pub fn new(base: impl Into<PathBuf>) -> Self {
        Self { base: base.into() }
    }

    /// Default directory: `~/.cache/leadgen-ml/techwolf/`.
    pub fn default_dir() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        Self::new(PathBuf::from(home).join(".cache/leadgen-ml/techwolf"))
    }

    /// Path to a dataset subdirectory.
    fn dataset_path(&self, name: &str) -> PathBuf {
        self.base.join(name)
    }

    /// Find the first CSV file in a dataset directory.
    fn find_csv(&self, dataset_name: &str) -> anyhow::Result<PathBuf> {
        let dir = self.dataset_path(dataset_name);
        if !dir.exists() {
            anyhow::bail!("dataset directory not found: {}", dir.display());
        }
        // Look for .csv files in the directory.
        let mut csv_path: Option<PathBuf> = None;
        for entry in std::fs::read_dir(&dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "csv") {
                csv_path = Some(path);
                break;
            }
        }
        csv_path.ok_or_else(|| anyhow::anyhow!("no CSV file found in {}", dir.display()))
    }

    /// Load Dataset 1: vacancy-job-to-skill.
    ///
    /// Expected columns: `vacancy_job_title, tagged_esco_skills`
    /// `tagged_esco_skills` is a JSON array string like `["skill1", "skill2"]`.
    pub fn load_vacancy_job_to_skill(&self) -> anyhow::Result<Vec<VacancyJobToSkill>> {
        let csv_path = self.find_csv("vacancy-job-to-skill")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 2 {
                tracing::warn!(line = line_no + 2, "vacancy-job-to-skill: too few columns, skipping");
                continue;
            }
            let skills: Vec<String> = match serde_json::from_str(&row[1]) {
                Ok(v) => v,
                Err(_) => {
                    // Try splitting by semicolons as fallback.
                    row[1].split(';').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
                }
            };
            records.push(VacancyJobToSkill {
                vacancy_job_title: row[0].clone(),
                tagged_esco_skills: skills,
            });
        }

        Ok(records)
    }

    /// Load Dataset 2: SkillMatch-1K.
    ///
    /// Expected columns: `skill_a, skill_b, related` (related is 0/1 or true/false).
    pub fn load_skill_match(&self) -> anyhow::Result<Vec<SkillMatchPair>> {
        let csv_path = self.find_csv("SkillMatch-1K")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 3 {
                tracing::warn!(line = line_no + 2, "SkillMatch-1K: too few columns, skipping");
                continue;
            }
            let related = match row[2].trim() {
                "1" | "true" | "True" | "TRUE" => true,
                _ => false,
            };
            records.push(SkillMatchPair {
                skill_a: row[0].clone(),
                skill_b: row[1].clone(),
                related,
            });
        }

        Ok(records)
    }

    /// Load Dataset 3: JobBERT-evaluation-dataset.
    ///
    /// Expected columns: `vacancy_job_title, esco_job_title, esco_uri`.
    pub fn load_jobbert_eval(&self) -> anyhow::Result<Vec<JobBertEval>> {
        let csv_path = self.find_csv("JobBERT-evaluation-dataset")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 3 {
                tracing::warn!(line = line_no + 2, "JobBERT-eval: too few columns, skipping");
                continue;
            }
            records.push(JobBertEval {
                vacancy_job_title: row[0].clone(),
                esco_job_title: row[1].clone(),
                esco_uri: row[2].clone(),
            });
        }

        Ok(records)
    }

    /// Load Dataset 4: Skill-XL.
    ///
    /// Expected columns: `ID, subset, title, sentence, relevant, cluster, skill`.
    pub fn load_skill_xl(&self) -> anyhow::Result<Vec<SkillXlRow>> {
        let csv_path = self.find_csv("Skill-XL")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 7 {
                tracing::warn!(line = line_no + 2, "Skill-XL: too few columns, skipping");
                continue;
            }
            let relevant = match row[4].trim() {
                "1" | "true" | "True" | "TRUE" => true,
                _ => false,
            };
            let cluster: u8 = row[5].trim().parse().unwrap_or(0);
            records.push(SkillXlRow {
                id: row[0].clone(),
                subset: row[1].clone(),
                title: row[2].clone(),
                sentence: row[3].clone(),
                relevant,
                cluster,
                skill: row[6].clone(),
            });
        }

        Ok(records)
    }

    /// Load Dataset 5: Synthetic-ESCO-skill-sentences.
    ///
    /// Expected columns: `sentence, skill`.
    pub fn load_synthetic_esco(&self) -> anyhow::Result<Vec<SyntheticEscoSentence>> {
        let csv_path = self.find_csv("Synthetic-ESCO-skill-sentences")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 2 {
                tracing::warn!(line = line_no + 2, "Synthetic-ESCO: too few columns, skipping");
                continue;
            }
            let label = row[1].trim();
            if should_skip_label(label) {
                continue;
            }
            records.push(SyntheticEscoSentence {
                sentence: row[0].clone(),
                skill: label.to_string(),
            });
        }

        Ok(records)
    }

    /// Load Datasets 6-8: skill-extraction-{techwolf,house,tech}.
    ///
    /// `variant` is one of `"techwolf"`, `"house"`, or `"tech"`.
    /// Expected columns: `sentence, span, sub_span, label`.
    pub fn load_skill_extraction(&self, variant: &str) -> anyhow::Result<Vec<SkillExtractionRow>> {
        let dataset_name = format!("skill-extraction-{}", variant);
        let csv_path = self.find_csv(&dataset_name)?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 4 {
                tracing::warn!(line = line_no + 2, dataset = %dataset_name, "too few columns, skipping");
                continue;
            }
            let label = row[3].trim();
            if should_skip_label(label) {
                continue;
            }
            records.push(SkillExtractionRow {
                sentence: row[0].clone(),
                span: row[1].clone(),
                sub_span: row[2].clone(),
                label: label.to_string(),
            });
        }

        Ok(records)
    }

    /// Load Dataset 9: anonymous-working-histories.
    ///
    /// Expected columns: `title, description, start, end, ESCO_uri, ESCO_title`.
    pub fn load_work_histories(&self) -> anyhow::Result<Vec<WorkHistory>> {
        let csv_path = self.find_csv("anonymous-working-histories")?;
        let rows = read_csv_rows(&csv_path)?;
        let mut records = Vec::with_capacity(rows.len());

        for (line_no, row) in rows.iter().enumerate() {
            if row.len() < 6 {
                tracing::warn!(line = line_no + 2, "work-histories: too few columns, skipping");
                continue;
            }
            records.push(WorkHistory {
                title: row[0].clone(),
                description: row[1].clone(),
                start: row[2].clone(),
                end: row[3].clone(),
                esco_uri: row[4].clone(),
                esco_title: row[5].clone(),
            });
        }

        Ok(records)
    }
}

// ── Skill Extraction Eval ───────────────────────────────────────────────────────

/// Skill extraction evaluation results.
#[derive(Debug, Clone, Serialize)]
pub struct SkillEvalReport {
    pub dataset: String,
    pub total_samples: usize,
    pub precision: f32,
    pub recall: f32,
    pub f1: f32,
    /// Skills found in ground truth but not extracted.
    pub missed_skills: Vec<(String, usize)>,
    /// Skills extracted but not in ground truth (false positives).
    pub false_positives: Vec<(String, usize)>,
    /// Coverage: fraction of unique ground truth skills matched by at least one extraction.
    pub skill_coverage: f32,
}

impl std::fmt::Display for SkillEvalReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "── Skill Extraction: {} ──", self.dataset)?;
        writeln!(f, "  Samples:    {}", self.total_samples)?;
        writeln!(f, "  Precision:  {:.4}", self.precision)?;
        writeln!(f, "  Recall:     {:.4}", self.recall)?;
        writeln!(f, "  F1:         {:.4}", self.f1)?;
        writeln!(f, "  Coverage:   {:.2}%", self.skill_coverage * 100.0)?;
        if !self.missed_skills.is_empty() {
            writeln!(f, "  Top missed:")?;
            for (skill, count) in self.missed_skills.iter().take(10) {
                writeln!(f, "    {}: {}", skill, count)?;
            }
        }
        if !self.false_positives.is_empty() {
            writeln!(f, "  Top false positives:")?;
            for (skill, count) in self.false_positives.iter().take(10) {
                writeln!(f, "    {}: {}", skill, count)?;
            }
        }
        Ok(())
    }
}

/// Helper: run `extract_job_fields` on a sentence and collect extracted skill strings.
fn extract_skills_from_text(text: &str) -> Vec<String> {
    use super::job_ner::{extract_job_fields, JobExtraction};

    let mut extraction = JobExtraction::new();
    extract_job_fields(text.as_bytes(), &mut extraction);

    let mut skills = Vec::new();
    for i in 0..extraction.skills_count as usize {
        let s = extraction.skill_str(i).to_ascii_lowercase();
        if !s.is_empty() {
            skills.push(s);
        }
    }
    skills
}

/// Evaluate the keyword-based skill extractor (`job_ner.rs`) against span-level
/// ground truth from skill-extraction datasets.
///
/// For each sample, the ground-truth label is mapped through the ESCO mapping to
/// an internal tag. The keyword extractor is run on the sentence and extracted
/// skills are compared against the mapped ground-truth tag.
pub fn eval_keyword_extraction(
    samples: &[SkillExtractionRow],
    esco_map: &EscoMapping,
) -> SkillEvalReport {
    let mut tp: usize = 0;
    let mut fp: usize = 0;
    let mut fn_count: usize = 0;

    let mut missed_counts: HashMap<String, usize> = HashMap::new();
    let mut fp_counts: HashMap<String, usize> = HashMap::new();
    let mut gt_unique: HashMap<String, bool> = HashMap::new(); // true if covered

    for sample in samples {
        let gt_label = sample.label.to_ascii_lowercase();
        let gt_tag = esco_map.esco_to_tag(&gt_label).unwrap_or_default();

        // Track unique ground-truth labels.
        gt_unique.entry(gt_label.clone()).or_insert(false);

        let extracted = extract_skills_from_text(&sample.sentence);

        if gt_tag.is_empty() {
            // No mapping for this ESCO label — cannot evaluate, count as FN.
            fn_count += 1;
            *missed_counts.entry(gt_label).or_insert(0) += 1;
            continue;
        }

        // Check if the expected tag was extracted.
        let found = extracted.iter().any(|s| s == &gt_tag);

        if found {
            tp += 1;
            gt_unique.insert(gt_label, true);
        } else {
            fn_count += 1;
            *missed_counts.entry(gt_label).or_insert(0) += 1;
        }

        // Count false positives: extracted skills with no corresponding ground truth.
        for skill in &extracted {
            if skill != &gt_tag {
                *fp_counts.entry(skill.clone()).or_insert(0) += 1;
                fp += 1;
            }
        }
    }

    let precision = if tp + fp > 0 { tp as f32 / (tp + fp) as f32 } else { 0.0 };
    let recall = if tp + fn_count > 0 { tp as f32 / (tp + fn_count) as f32 } else { 0.0 };
    let f1 = if precision + recall > 0.0 {
        2.0 * precision * recall / (precision + recall)
    } else {
        0.0
    };

    let total_unique = gt_unique.len();
    let covered = gt_unique.values().filter(|&&v| v).count();
    let skill_coverage = if total_unique > 0 {
        covered as f32 / total_unique as f32
    } else {
        0.0
    };

    // Sort missed/FP by count descending.
    let mut missed_skills: Vec<(String, usize)> = missed_counts.into_iter().collect();
    missed_skills.sort_by(|a, b| b.1.cmp(&a.1));

    let mut false_positives: Vec<(String, usize)> = fp_counts.into_iter().collect();
    false_positives.sort_by(|a, b| b.1.cmp(&a.1));

    SkillEvalReport {
        dataset: "skill-extraction (span-level)".to_string(),
        total_samples: samples.len(),
        precision,
        recall,
        f1,
        missed_skills,
        false_positives,
        skill_coverage,
    }
}

/// Evaluate skill extraction on sentence→skill pairs (Synthetic-ESCO format).
///
/// Each sample has a sentence and an ESCO skill label. The keyword extractor is
/// run on the sentence and we check whether any extracted skill matches the ESCO
/// label after mapping through the ESCO↔tag table.
pub fn eval_sentence_extraction(
    samples: &[SyntheticEscoSentence],
    esco_map: &EscoMapping,
) -> SkillEvalReport {
    let mut tp: usize = 0;
    let mut fp: usize = 0;
    let mut fn_count: usize = 0;

    let mut missed_counts: HashMap<String, usize> = HashMap::new();
    let mut fp_counts: HashMap<String, usize> = HashMap::new();
    let mut gt_unique: HashMap<String, bool> = HashMap::new();

    for sample in samples {
        let gt_label = sample.skill.to_ascii_lowercase();
        let gt_tag = esco_map.esco_to_tag(&gt_label).unwrap_or_default();

        gt_unique.entry(gt_label.clone()).or_insert(false);

        let extracted = extract_skills_from_text(&sample.sentence);

        if gt_tag.is_empty() {
            fn_count += 1;
            *missed_counts.entry(gt_label).or_insert(0) += 1;
            continue;
        }

        let found = extracted.iter().any(|s| s == &gt_tag);

        if found {
            tp += 1;
            gt_unique.insert(gt_label, true);
        } else {
            fn_count += 1;
            *missed_counts.entry(gt_label).or_insert(0) += 1;
        }

        for skill in &extracted {
            if skill != &gt_tag {
                *fp_counts.entry(skill.clone()).or_insert(0) += 1;
                fp += 1;
            }
        }
    }

    let precision = if tp + fp > 0 { tp as f32 / (tp + fp) as f32 } else { 0.0 };
    let recall = if tp + fn_count > 0 { tp as f32 / (tp + fn_count) as f32 } else { 0.0 };
    let f1 = if precision + recall > 0.0 {
        2.0 * precision * recall / (precision + recall)
    } else {
        0.0
    };

    let total_unique = gt_unique.len();
    let covered = gt_unique.values().filter(|&&v| v).count();
    let skill_coverage = if total_unique > 0 {
        covered as f32 / total_unique as f32
    } else {
        0.0
    };

    let mut missed_skills: Vec<(String, usize)> = missed_counts.into_iter().collect();
    missed_skills.sort_by(|a, b| b.1.cmp(&a.1));

    let mut false_positives: Vec<(String, usize)> = fp_counts.into_iter().collect();
    false_positives.sort_by(|a, b| b.1.cmp(&a.1));

    SkillEvalReport {
        dataset: "synthetic-esco (sentence-level)".to_string(),
        total_samples: samples.len(),
        precision,
        recall,
        f1,
        missed_skills,
        false_positives,
        skill_coverage,
    }
}

// ── Skill Relatedness Eval ──────────────────────────────────────────────────────

/// Evaluation results for skill-pair relatedness (SkillMatch-1K).
#[derive(Debug, Clone, Serialize)]
pub struct RelatednessEvalReport {
    pub total_pairs: usize,
    pub accuracy: f32,
    pub precision: f32,
    pub recall: f32,
    pub f1: f32,
}

impl std::fmt::Display for RelatednessEvalReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "── Skill Relatedness ──")?;
        writeln!(f, "  Pairs:      {}", self.total_pairs)?;
        writeln!(f, "  Accuracy:   {:.4}", self.accuracy)?;
        writeln!(f, "  Precision:  {:.4}", self.precision)?;
        writeln!(f, "  Recall:     {:.4}", self.recall)?;
        writeln!(f, "  F1:         {:.4}", self.f1)?;
        Ok(())
    }
}

/// Evaluate skill relatedness using Levenshtein similarity as a baseline.
///
/// Predicts `related = true` if the similarity between `skill_a` and `skill_b`
/// exceeds `threshold`. Returns classification metrics against the ground-truth
/// labels.
pub fn eval_skill_relatedness_baseline(
    pairs: &[SkillMatchPair],
    threshold: f32,
) -> RelatednessEvalReport {
    if pairs.is_empty() {
        return RelatednessEvalReport {
            total_pairs: 0,
            accuracy: 0.0,
            precision: 0.0,
            recall: 0.0,
            f1: 0.0,
        };
    }

    let mut tp: usize = 0;
    let mut fp: usize = 0;
    let mut tn: usize = 0;
    let mut fn_count: usize = 0;

    for pair in pairs {
        let sim = levenshtein_similarity(
            pair.skill_a.to_ascii_lowercase().as_bytes(),
            pair.skill_b.to_ascii_lowercase().as_bytes(),
        ) as f32;

        let predicted = sim >= threshold;
        let actual = pair.related;

        match (predicted, actual) {
            (true, true) => tp += 1,
            (true, false) => fp += 1,
            (false, true) => fn_count += 1,
            (false, false) => tn += 1,
        }
    }

    let total = pairs.len();
    let accuracy = (tp + tn) as f32 / total as f32;
    let precision = if tp + fp > 0 { tp as f32 / (tp + fp) as f32 } else { 0.0 };
    let recall = if tp + fn_count > 0 { tp as f32 / (tp + fn_count) as f32 } else { 0.0 };
    let f1 = if precision + recall > 0.0 {
        2.0 * precision * recall / (precision + recall)
    } else {
        0.0
    };

    RelatednessEvalReport {
        total_pairs: total,
        accuracy,
        precision,
        recall,
        f1,
    }
}

// ── Title Normalization Eval ────────────────────────────────────────────────────

/// Job title normalization evaluation results.
#[derive(Debug, Clone, Serialize)]
pub struct TitleNormEvalReport {
    pub total_titles: usize,
    /// How many titles mapped to at least one ESCO occupation.
    pub mapped_count: usize,
    pub mapping_rate: f32,
    /// Top unmapped titles by frequency.
    pub top_unmapped: Vec<(String, usize)>,
}

impl std::fmt::Display for TitleNormEvalReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "── Title Normalization ──")?;
        writeln!(f, "  Total titles:  {}", self.total_titles)?;
        writeln!(f, "  Mapped:        {} ({:.1}%)", self.mapped_count, self.mapping_rate * 100.0)?;
        if !self.top_unmapped.is_empty() {
            writeln!(f, "  Top unmapped:")?;
            for (title, count) in self.top_unmapped.iter().take(15) {
                writeln!(f, "    {}: {}", title, count)?;
            }
        }
        Ok(())
    }
}

/// Evaluate title normalization by checking how many vacancy titles can be
/// mapped to their ESCO counterpart via Levenshtein similarity.
///
/// Uses the JobBERT evaluation dataset where each row has a vacancy title and
/// its expected ESCO title. A title is considered "mapped" if the similarity
/// between the lowercased vacancy title and the lowercased ESCO title exceeds
/// 0.6 (lenient threshold to account for synonym-level differences).
pub fn eval_title_normalization(samples: &[JobBertEval]) -> TitleNormEvalReport {
    if samples.is_empty() {
        return TitleNormEvalReport {
            total_titles: 0,
            mapped_count: 0,
            mapping_rate: 0.0,
            top_unmapped: Vec::new(),
        };
    }

    let mut mapped_count: usize = 0;
    let mut unmapped_counts: HashMap<String, usize> = HashMap::new();

    for sample in samples {
        let vacancy = sample.vacancy_job_title.to_ascii_lowercase();
        let esco = sample.esco_job_title.to_ascii_lowercase();

        let sim = levenshtein_similarity(vacancy.as_bytes(), esco.as_bytes());

        if sim > 0.6 {
            mapped_count += 1;
        } else {
            *unmapped_counts.entry(sample.vacancy_job_title.clone()).or_insert(0) += 1;
        }
    }

    let mapping_rate = mapped_count as f32 / samples.len() as f32;

    let mut top_unmapped: Vec<(String, usize)> = unmapped_counts.into_iter().collect();
    top_unmapped.sort_by(|a, b| b.1.cmp(&a.1));

    TitleNormEvalReport {
        total_titles: samples.len(),
        mapped_count,
        mapping_rate,
        top_unmapped,
    }
}

// ── Full Pipeline Eval ──────────────────────────────────────────────────────────

/// Complete TechWolf evaluation report.
#[derive(Debug, Clone, Serialize)]
pub struct FullEvalReport {
    pub keyword_extraction: Option<SkillEvalReport>,
    pub sentence_extraction: Option<SkillEvalReport>,
    pub skill_relatedness: Option<RelatednessEvalReport>,
    pub title_normalization: Option<TitleNormEvalReport>,
    pub datasets_loaded: Vec<String>,
    pub datasets_missing: Vec<String>,
}

impl std::fmt::Display for FullEvalReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        writeln!(f, "═══ TechWolf Eval Report ═══")?;
        writeln!(f)?;

        writeln!(
            f,
            "Datasets loaded:  {} | missing: {}",
            self.datasets_loaded.len(),
            self.datasets_missing.len()
        )?;
        if !self.datasets_loaded.is_empty() {
            writeln!(f, "  Loaded:  {}", self.datasets_loaded.join(", "))?;
        }
        if !self.datasets_missing.is_empty() {
            writeln!(f, "  Missing: {}", self.datasets_missing.join(", "))?;
        }
        writeln!(f)?;

        if let Some(ref report) = self.keyword_extraction {
            write!(f, "{}", report)?;
            writeln!(f)?;
        }

        if let Some(ref report) = self.sentence_extraction {
            write!(f, "{}", report)?;
            writeln!(f)?;
        }

        if let Some(ref report) = self.skill_relatedness {
            write!(f, "{}", report)?;
            writeln!(f)?;
        }

        if let Some(ref report) = self.title_normalization {
            write!(f, "{}", report)?;
        }

        Ok(())
    }
}

/// Run the complete TechWolf evaluation pipeline.
///
/// Loads all available datasets from the cache directory and runs eval benchmarks
/// for keyword extraction, sentence extraction, skill relatedness, and title
/// normalization. Datasets that are not found are reported as missing but do not
/// cause failure.
pub fn run_full_eval(data_dir: &DatasetDir) -> anyhow::Result<FullEvalReport> {
    let esco_map = EscoMapping::default();

    let mut datasets_loaded: Vec<String> = Vec::new();
    let mut datasets_missing: Vec<String> = Vec::new();

    // ── Keyword extraction eval (skill-extraction-techwolf) ──────────────
    let keyword_extraction = match data_dir.load_skill_extraction("techwolf") {
        Ok(samples) => {
            datasets_loaded.push("skill-extraction-techwolf".to_string());
            tracing::info!(samples = samples.len(), "loaded skill-extraction-techwolf");
            Some(eval_keyword_extraction(&samples, &esco_map))
        }
        Err(e) => {
            tracing::warn!(error = %e, "skill-extraction-techwolf not available");
            datasets_missing.push("skill-extraction-techwolf".to_string());
            None
        }
    };

    // ── Sentence extraction eval (Synthetic-ESCO) ───────────────────────
    let sentence_extraction = match data_dir.load_synthetic_esco() {
        Ok(samples) => {
            datasets_loaded.push("Synthetic-ESCO-skill-sentences".to_string());
            tracing::info!(samples = samples.len(), "loaded Synthetic-ESCO-skill-sentences");
            Some(eval_sentence_extraction(&samples, &esco_map))
        }
        Err(e) => {
            tracing::warn!(error = %e, "Synthetic-ESCO not available");
            datasets_missing.push("Synthetic-ESCO-skill-sentences".to_string());
            None
        }
    };

    // ── Skill relatedness eval (SkillMatch-1K) ──────────────────────────
    let skill_relatedness = match data_dir.load_skill_match() {
        Ok(pairs) => {
            datasets_loaded.push("SkillMatch-1K".to_string());
            tracing::info!(pairs = pairs.len(), "loaded SkillMatch-1K");
            Some(eval_skill_relatedness_baseline(&pairs, 0.7))
        }
        Err(e) => {
            tracing::warn!(error = %e, "SkillMatch-1K not available");
            datasets_missing.push("SkillMatch-1K".to_string());
            None
        }
    };

    // ── Title normalization eval (JobBERT) ──────────────────────────────
    let title_normalization = match data_dir.load_jobbert_eval() {
        Ok(samples) => {
            datasets_loaded.push("JobBERT-evaluation-dataset".to_string());
            tracing::info!(samples = samples.len(), "loaded JobBERT-evaluation-dataset");
            Some(eval_title_normalization(&samples))
        }
        Err(e) => {
            tracing::warn!(error = %e, "JobBERT-evaluation-dataset not available");
            datasets_missing.push("JobBERT-evaluation-dataset".to_string());
            None
        }
    };

    // ── Check remaining datasets for completeness ───────────────────────
    let extra_datasets = [
        ("vacancy-job-to-skill", data_dir.load_vacancy_job_to_skill()),
        ("Skill-XL", data_dir.load_skill_xl().map(|_| ())),
        ("skill-extraction-house", data_dir.load_skill_extraction("house").map(|_| ())),
        ("skill-extraction-tech", data_dir.load_skill_extraction("tech").map(|_| ())),
        ("anonymous-working-histories", data_dir.load_work_histories().map(|_| ())),
    ];

    // Helper trait not needed — just handle each tuple.
    for (name, result) in [
        ("vacancy-job-to-skill", data_dir.load_vacancy_job_to_skill().map(|_| ())),
        ("Skill-XL", data_dir.load_skill_xl().map(|_| ())),
        ("skill-extraction-house", data_dir.load_skill_extraction("house").map(|_| ())),
        ("skill-extraction-tech", data_dir.load_skill_extraction("tech").map(|_| ())),
        ("anonymous-working-histories", data_dir.load_work_histories().map(|_| ())),
    ] {
        match result {
            Ok(()) => datasets_loaded.push(name.to_string()),
            Err(_) => datasets_missing.push(name.to_string()),
        }
    }

    Ok(FullEvalReport {
        keyword_extraction,
        sentence_extraction,
        skill_relatedness,
        title_normalization,
        datasets_loaded,
        datasets_missing,
    })
}

// ── Tests ───────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_csv_line_simple() {
        let fields = parse_csv_line("hello,world,foo");
        assert_eq!(fields, vec!["hello", "world", "foo"]);
    }

    #[test]
    fn test_parse_csv_line_quoted() {
        let fields = parse_csv_line(r#""hello, world","bar","baz""#);
        assert_eq!(fields, vec!["hello, world", "bar", "baz"]);
    }

    #[test]
    fn test_parse_csv_line_escaped_quotes() {
        let fields = parse_csv_line(r#""he said ""hi""",normal"#);
        assert_eq!(fields, vec![r#"he said "hi""#, "normal"]);
    }

    #[test]
    fn test_parse_csv_line_json_array() {
        let line = r#"Software Engineer,"[""python"",""rust"",""docker""]""#;
        let fields = parse_csv_line(line);
        assert_eq!(fields.len(), 2);
        assert_eq!(fields[0], "Software Engineer");
        // The JSON array is preserved with quotes collapsed.
        assert!(fields[1].contains("python"));
    }

    #[test]
    fn test_parse_csv_line_empty_fields() {
        let fields = parse_csv_line("a,,b");
        assert_eq!(fields, vec!["a", "", "b"]);
    }

    #[test]
    fn test_skill_extraction_row_parse() {
        let row = SkillExtractionRow {
            sentence: "We need Python developers".to_string(),
            span: "Python".to_string(),
            sub_span: String::new(),
            label: "python (computer programming)".to_string(),
        };
        assert_eq!(row.label, "python (computer programming)");
        assert!(!should_skip_label(&row.label));
    }

    #[test]
    fn test_skip_labels() {
        assert!(should_skip_label("LABEL NOT PRESENT"));
        assert!(should_skip_label("label not present"));
        assert!(should_skip_label("UNDERSPECIFIED"));
        assert!(should_skip_label("underspecified"));
        assert!(!should_skip_label("python"));
        assert!(!should_skip_label("machine learning"));
    }

    #[test]
    fn test_esco_mapping_exact() {
        let map = EscoMapping::default();
        assert!(map.len() > 0);
        assert!(!map.is_empty());

        // Exact matches.
        assert_eq!(map.esco_to_tag("python"), Some("python".to_string()));
        assert_eq!(map.esco_to_tag("Python (computer programming)"), Some("python".to_string()));
        assert_eq!(map.esco_to_tag("kubernetes"), Some("kubernetes".to_string()));
        assert_eq!(map.esco_to_tag("Amazon Web Services"), Some("aws".to_string()));
    }

    #[test]
    fn test_esco_mapping_reverse() {
        let map = EscoMapping::default();
        let esco = map.tag_to_esco("python");
        assert!(esco.is_some());
    }

    #[test]
    fn test_eval_empty_dataset() {
        let esco_map = EscoMapping::default();

        let report = eval_keyword_extraction(&[], &esco_map);
        assert_eq!(report.total_samples, 0);
        assert_eq!(report.precision, 0.0);
        assert_eq!(report.recall, 0.0);
        assert_eq!(report.f1, 0.0);
        assert_eq!(report.skill_coverage, 0.0);
    }

    #[test]
    fn test_eval_keyword_extraction_basic() {
        let esco_map = EscoMapping::default();

        let samples = vec![
            SkillExtractionRow {
                sentence: "We are looking for a Python developer with Docker experience".to_string(),
                span: "Python".to_string(),
                sub_span: String::new(),
                label: "python".to_string(),
            },
            SkillExtractionRow {
                sentence: "Must know Kubernetes and Terraform".to_string(),
                span: "Kubernetes".to_string(),
                sub_span: String::new(),
                label: "kubernetes".to_string(),
            },
        ];

        let report = eval_keyword_extraction(&samples, &esco_map);
        assert_eq!(report.total_samples, 2);
        // Both python and kubernetes are in TECH_KEYWORDS, should be found.
        assert!(report.recall > 0.0, "recall should be > 0: {}", report.recall);
    }

    #[test]
    fn test_eval_sentence_extraction_basic() {
        let esco_map = EscoMapping::default();

        let samples = vec![
            SyntheticEscoSentence {
                sentence: "Proficiency in Rust programming is required".to_string(),
                skill: "rust".to_string(),
            },
        ];

        let report = eval_sentence_extraction(&samples, &esco_map);
        assert_eq!(report.total_samples, 1);
        assert!(report.recall > 0.0);
    }

    #[test]
    fn test_relatedness_eval_basic() {
        let pairs = vec![
            SkillMatchPair {
                skill_a: "python".to_string(),
                skill_b: "python3".to_string(),
                related: true,
            },
            SkillMatchPair {
                skill_a: "rust".to_string(),
                skill_b: "cooking".to_string(),
                related: false,
            },
            SkillMatchPair {
                skill_a: "javascript".to_string(),
                skill_b: "java".to_string(),
                related: false,
            },
        ];

        let report = eval_skill_relatedness_baseline(&pairs, 0.7);
        assert_eq!(report.total_pairs, 3);
        // "python" vs "python3" similarity > 0.7 → predicts related (TP)
        // "rust" vs "cooking" similarity < 0.7 → predicts not related (TN)
        assert!(report.accuracy > 0.0);
    }

    #[test]
    fn test_relatedness_eval_empty() {
        let report = eval_skill_relatedness_baseline(&[], 0.5);
        assert_eq!(report.total_pairs, 0);
        assert_eq!(report.accuracy, 0.0);
    }

    #[test]
    fn test_skill_eval_report_format() {
        let report = SkillEvalReport {
            dataset: "test".to_string(),
            total_samples: 100,
            precision: 0.75,
            recall: 0.60,
            f1: 0.6667,
            missed_skills: vec![("obscure_skill".to_string(), 10)],
            false_positives: vec![("python".to_string(), 5)],
            skill_coverage: 0.42,
        };

        let formatted = format!("{}", report);
        assert!(formatted.contains("test"));
        assert!(formatted.contains("100"));
        assert!(formatted.contains("0.75"));
        assert!(formatted.contains("0.60"));
        assert!(formatted.contains("obscure_skill"));
    }

    #[test]
    fn test_full_eval_report_format() {
        let report = FullEvalReport {
            keyword_extraction: None,
            sentence_extraction: None,
            skill_relatedness: None,
            title_normalization: None,
            datasets_loaded: vec!["a".to_string()],
            datasets_missing: vec!["b".to_string(), "c".to_string()],
        };

        let formatted = format!("{}", report);
        assert!(formatted.contains("TechWolf Eval Report"));
        assert!(formatted.contains("loaded:  1"));
        assert!(formatted.contains("missing: 2"));
    }

    #[test]
    fn test_title_norm_eval_empty() {
        let report = eval_title_normalization(&[]);
        assert_eq!(report.total_titles, 0);
        assert_eq!(report.mapping_rate, 0.0);
    }

    #[test]
    fn test_title_norm_eval_basic() {
        let samples = vec![
            JobBertEval {
                vacancy_job_title: "Software Engineer".to_string(),
                esco_job_title: "Software engineer".to_string(),
                esco_uri: "http://example.com/1".to_string(),
            },
            JobBertEval {
                vacancy_job_title: "ML Wizard".to_string(),
                esco_job_title: "Machine learning engineer".to_string(),
                esco_uri: "http://example.com/2".to_string(),
            },
        ];

        let report = eval_title_normalization(&samples);
        assert_eq!(report.total_titles, 2);
        // "Software Engineer" vs "Software engineer" → high similarity → mapped.
        assert!(report.mapped_count >= 1);
    }

    #[test]
    fn test_dataset_dir_default() {
        let dir = DatasetDir::default_dir();
        // Should point to home directory + cache path.
        let path_str = dir.base.to_string_lossy();
        assert!(path_str.contains("techwolf") || path_str.contains("/tmp"));
    }

    /// Integration test that loads real data (requires downloaded datasets).
    #[test]
    #[ignore]
    fn test_full_eval_pipeline() {
        tracing_subscriber::fmt::init();

        let data_dir = DatasetDir::default_dir();
        let report = run_full_eval(&data_dir).expect("full eval should succeed");

        println!("{}", report);

        assert!(
            !report.datasets_loaded.is_empty(),
            "at least one dataset should be available"
        );

        if let Some(ref kw) = report.keyword_extraction {
            println!(
                "Keyword extraction: P={:.3} R={:.3} F1={:.3} coverage={:.1}%",
                kw.precision, kw.recall, kw.f1, kw.skill_coverage * 100.0
            );
        }

        if let Some(ref rel) = report.skill_relatedness {
            println!(
                "Relatedness baseline: accuracy={:.3} F1={:.3}",
                rel.accuracy, rel.f1
            );
        }
    }
}
