use anyhow::{Context, Result};
use deepseek::{
    build_request, client_from_env,
    types::{DeepSeekModel, EffortLevel},
    DeepSeekClient, ReqwestClient,
};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashSet;
use std::sync::Arc;

const MOVIE: &str = "The Little Mermaid";
const EMBED_URL: &str = "http://localhost:9999/embed";
const MIN_IMDB: f64 = 6.5;
const TOP_K: usize = 80;

struct SearchAngle {
    label: &'static str,
    focus: &'static str,
    count: usize,
}

const SEARCH_ANGLES: &[SearchAngle] = &[
    SearchAngle {
        label: "animated-family",
        focus: "animated films, family movies, musical films, fairy-tale adaptations, \
                and Disney/Pixar-style animation. Prioritize movies with animal/creature \
                protagonists, underwater or magical settings, and coming-of-age journeys",
        count: 35,
    },
    SearchAngle {
        label: "romance-drama",
        focus: "romantic films, forbidden love stories, drama with parent-child conflict, \
                stories about sacrifice for love, belonging vs. identity, and films where \
                characters cross between two worlds (social classes, cultures, realms)",
        count: 30,
    },
    SearchAngle {
        label: "adventure-fantasy",
        focus: "fantasy adventure films, hero's journey narratives, magical transformation \
                stories, quest narratives, films with mythological or supernatural elements, \
                and adventure stories with strong emotional cores",
        count: 30,
    },
];

// ── Embed server types ────────────────────────────────────────────────────────

#[derive(Serialize)]
struct EmbedRequest {
    input: Vec<String>,
}

#[derive(Deserialize)]
struct EmbedResponse {
    data: Vec<EmbedItem>,
}

#[derive(Deserialize)]
struct EmbedItem {
    index: usize,
    embedding: Vec<f32>,
}

// ── Output types ──────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
struct MovieResult {
    #[serde(default)]
    rank: usize,
    title: String,
    year: u32,
    platform: String,
    #[serde(default)]
    genre: Vec<String>,
    #[serde(default)]
    director: String,
    #[serde(default)]
    age_rating: String,
    #[serde(default)]
    imdb_rating: f64,
    #[serde(default)]
    similarity_score: f64,
    #[serde(default)]
    why_similar: String,
}

// ── Pipeline stages ───────────────────────────────────────────────────────────

async fn analyze_movie(client: &DeepSeekClient<ReqwestClient>, movie: &str) -> Result<String> {
    let req = build_request(
        &DeepSeekModel::Chat,
        vec![deepseek::types::user_msg(&format!(
            "Analyze the movie \"{movie}\" and produce a detailed profile including:\n\
             - Genre(s)\n\
             - Key themes (adventure, transformation, belonging, love, family conflict, magic)\n\
             - Emotional tone and target audience\n\
             - Narrative patterns (hero's journey, coming-of-age, forbidden romance)\n\
             Return a structured text profile for similarity matching."
        ))],
        None,
        &EffortLevel::Low,
    );
    let resp = client.chat(&req).await.map_err(|e| anyhow::anyhow!("{e}"))?;
    let content = resp.choices.into_iter().next().context("no choices")?.message.content;
    Ok(content.as_str().to_string())
}

async fn search_platform(
    client: Arc<DeepSeekClient<ReqwestClient>>,
    platform: String,
    movie: String,
    profile: String,
    focus: String,
    count: usize,
) -> Result<Vec<String>> {
    let req = build_request(
        &DeepSeekModel::Chat,
        vec![deepseek::types::user_msg(&format!(
            "Based on this movie profile for \"{movie}\":\n{profile}\n\n\
             List {count} movies currently available on {platform} that are similar.\n\
             Focus specifically on: {focus}.\n\
             Do NOT include \"{movie}\" itself.\n\
             Include hidden gems alongside popular titles.\n\n\
             For each: Title (Year) - brief thematic description (1-2 sentences).\n\
             Format as numbered list. Be exhaustive."
        ))],
        None,
        &EffortLevel::High,
    );
    let resp = client.chat(&req).await.map_err(|e| anyhow::anyhow!("{e}"))?;
    let text = resp.choices.into_iter().next().context("no choices")?.message.content;
    Ok(parse_numbered_list(text.as_str()))
}

async fn embed_texts(texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
    let client = reqwest::Client::new();
    let resp: EmbedResponse = client
        .post(EMBED_URL)
        .json(&EmbedRequest { input: texts })
        .send()
        .await
        .context("embed server request")?
        .error_for_status()
        .context("embed server error")?
        .json()
        .await
        .context("embed server parse")?;

    let mut items = resp.data;
    items.sort_by_key(|e| e.index);
    Ok(items.into_iter().map(|e| e.embedding).collect())
}

fn cosine_sim(a: &[f32], b: &[f32]) -> f64 {
    let dot: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if na == 0.0 || nb == 0.0 {
        return 0.0;
    }
    (dot / (na * nb)) as f64
}

async fn refine_batch(
    client: &DeepSeekClient<ReqwestClient>,
    batch: &[(&str, &str, f64)],
    movie: &str,
) -> Result<Vec<MovieResult>> {
    let items: Vec<serde_json::Value> = batch
        .iter()
        .map(|(platform, desc, score)| {
            json!({
                "platform": platform,
                "description": desc,
                "similarity_score": score
            })
        })
        .collect();

    let req = build_request(
        &DeepSeekModel::Chat,
        vec![deepseek::types::user_msg(&format!(
            "Extract structured movie info from these candidates. Return a JSON array.\n\n\
             {}\n\n\
             For EACH entry return:\n\
             - \"title\": movie title (string)\n\
             - \"year\": release year (integer)\n\
             - \"platform\": keep from data\n\
             - \"similarity_score\": keep from data (float)\n\
             - \"imdb_rating\": real IMDB rating as float (e.g. 7.8)\n\
             - \"age_rating\": US content rating (\"G\", \"PG\", \"PG-13\")\n\
             - \"genre\": list of genre strings\n\
             - \"director\": director name\n\
             - \"why_similar\": one English sentence about thematic connection to \"{}\"\n\n\
             Return ONLY the JSON array. No markdown fences.",
            serde_json::to_string_pretty(&items)?,
            movie
        ))],
        None,
        &EffortLevel::High,
    );

    let resp = client.chat(&req).await.map_err(|e| anyhow::anyhow!("{e}"))?;
    let text = resp.choices.into_iter().next().context("no choices")?.message.content;
    extract_json_array(text.as_str())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn parse_numbered_list(text: &str) -> Vec<String> {
    let re = Regex::new(r"^\s*\*{0,2}\s*\d{1,3}[.)]\*{0,2}\s*\*{0,2}").unwrap();
    let mut items: Vec<String> = Vec::new();
    let mut current: Vec<String> = Vec::new();

    for line in text.lines() {
        let stripped = line.trim();
        if stripped.is_empty() {
            if !current.is_empty() {
                items.push(current.join(" "));
                current.clear();
            }
            continue;
        }
        if re.is_match(stripped) {
            if !current.is_empty() {
                items.push(current.join(" "));
            }
            let clean = re.replace(stripped, "").trim_matches('*').trim().to_string();
            current = vec![clean];
        } else if !current.is_empty() {
            current.push(stripped.to_string());
        }
    }
    if !current.is_empty() {
        items.push(current.join(" "));
    }
    items
}

fn extract_json_array(text: &str) -> Result<Vec<MovieResult>> {
    let text = text.trim();
    let fence_start = Regex::new(r"^```(?:json)?\s*").unwrap();
    let fence_end = Regex::new(r"\s*```$").unwrap();
    let text = fence_start.replace(text, "");
    let text = fence_end.replace(text.trim(), "");
    let text = text.trim();

    if let Ok(v) = serde_json::from_str::<Vec<MovieResult>>(text) {
        return Ok(v);
    }
    if let Some(m) = Regex::new(r"(?s)\[.*\]").unwrap().find(text) {
        return Ok(serde_json::from_str(m.as_str()).context("parsing JSON array")?);
    }
    anyhow::bail!("no JSON array found in response")
}

fn normalize_title(s: &str) -> String {
    let s = s.to_lowercase();
    let s = s.trim();
    // Strip trailing year suffixes like "(2023)"
    let s = Regex::new(r"\s*\(\d{4}\)\s*$").unwrap().replace(s, "");
    // Strip leading articles
    let s = Regex::new(r"^(the|a|an)\s+").unwrap().replace(&s, "");
    // Remove punctuation, collapse whitespace
    let s: String = s.chars()
        .map(|c| if c.is_alphanumeric() || c == ' ' { c } else { ' ' })
        .collect();
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();

    let client = Arc::new(client_from_env().context("DEEPSEEK_API_KEY required")?);

    // 1. Analyze
    println!("▸ Analyzing: {MOVIE}");
    let profile = analyze_movie(&client, MOVIE).await?;
    println!("  Profile: {:.120}…", profile.replace('\n', " "));

    // 2. Search Netflix + Disney+ across multiple angles in parallel
    println!("▸ Searching candidates across {} angles…", SEARCH_ANGLES.len());
    let mut search_futures = Vec::new();
    for angle in SEARCH_ANGLES {
        for platform in &["Netflix", "Disney+"] {
            let c = Arc::clone(&client);
            let p = platform.to_string();
            let m = MOVIE.to_string();
            let pr = profile.clone();
            let f = angle.focus.to_string();
            let cnt = angle.count;
            let lbl = angle.label;
            search_futures.push(async move {
                let results = search_platform(c, p.clone(), m, pr, f, cnt).await?;
                Ok::<_, anyhow::Error>((p, lbl.to_string(), results))
            });
        }
    }
    let search_results = futures::future::try_join_all(search_futures).await?;

    // Merge + early-dedup by rough title
    let mut candidates: Vec<(String, String)> = Vec::new();
    let mut seen_rough: HashSet<String> = HashSet::new();
    for (platform, label, items) in &search_results {
        let mut added = 0;
        for item in items {
            let rough = normalize_title(
                item.split(" - ").next().unwrap_or(item)
                    .split('(').next().unwrap_or(item),
            );
            if seen_rough.insert(rough) {
                candidates.push((platform.clone(), item.clone()));
                added += 1;
            }
        }
        println!("  {platform}/{label}: {added}/{} unique", items.len());
    }
    println!("  Total unique candidates: {}", candidates.len());

    // 3. Embed profile + all candidates
    println!("▸ Embedding {} candidates…", candidates.len());

    let texts: Vec<String> = std::iter::once(profile.clone())
        .chain(candidates.iter().map(|(_, t)| t.clone()))
        .collect();

    let mut embeddings = embed_texts(texts).await?;
    let profile_embed = embeddings.remove(0); // first = profile

    // 4. Rank by cosine similarity, take top K
    let mut ranked: Vec<(usize, f64)> = embeddings
        .iter()
        .enumerate()
        .map(|(i, e)| (i, cosine_sim(&profile_embed, e)))
        .collect();
    ranked.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    let top_k: Vec<(usize, f64)> = ranked.into_iter().take(TOP_K).collect();
    println!("  Top-{TOP_K} selected (similarity range: {:.3}–{:.3})", top_k.last().unwrap().1, top_k.first().unwrap().1);

    // 5. Refine in batches of 15
    println!("▸ Refining with DeepSeek…");
    let batch_data: Vec<(&str, &str, f64)> = top_k
        .iter()
        .map(|(i, score)| {
            let (platform, text) = &candidates[*i];
            (platform.as_str(), text.as_str(), *score)
        })
        .collect();

    let mut all_results: Vec<MovieResult> = Vec::new();
    for (idx, chunk) in batch_data.chunks(15).enumerate() {
        match refine_batch(&client, chunk, MOVIE).await {
            Ok(mut batch) => {
                println!("  Batch {}: {} → {} structured", idx + 1, chunk.len(), batch.len());
                all_results.append(&mut batch);
            }
            Err(e) => eprintln!("  Batch {} error: {e}", idx + 1),
        }
    }

    // 6. Deduplicate + filter
    let query_key = normalize_title(MOVIE);
    let mut seen: HashSet<String> = HashSet::new();
    all_results.retain(|m| {
        let key = normalize_title(&m.title);
        key != query_key && seen.insert(key)
    });
    all_results.retain(|m| m.imdb_rating >= MIN_IMDB);
    all_results.sort_by(|a, b| b.similarity_score.partial_cmp(&a.similarity_score).unwrap());
    for (i, m) in all_results.iter_mut().enumerate() {
        m.rank = i + 1;
    }

    // 7. Print results
    println!("\n{}", "─".repeat(90));
    println!(" Movies similar to: {MOVIE}");
    println!("{}", "─".repeat(90));
    println!("{:>3}  {:<42} {:>4}  {:<9}  {:>4}  {:<6}  {:.4}",
        "#", "Title", "Year", "Platform", "IMDb", "Rating", "Score");
    println!("{}", "─".repeat(90));
    for m in &all_results {
        println!("{:>3}. {:<42} {:>4}  {:<9}  {:>4.1}  {:<6}  {:.4}",
            m.rank, m.title, m.year, m.platform, m.imdb_rating, m.age_rating, m.similarity_score);
        if !m.why_similar.is_empty() {
            println!("     └ {}", m.why_similar);
        }
    }
    println!("{}", "─".repeat(90));

    // 8. Save JSON
    let output = json!({
        "query_movie": MOVIE,
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "total_results": all_results.len(),
        "results": all_results,
    });
    let json_path = concat!(env!("CARGO_MANIFEST_DIR"), "/similar_movies_results.json");
    std::fs::write(json_path, serde_json::to_string_pretty(&output)?)?;

    // 9. Save Markdown with URLs
    let md_path = concat!(env!("CARGO_MANIFEST_DIR"), "/similar_movies.md");
    std::fs::write(md_path, build_markdown(MOVIE, &all_results))?;
    println!("\n✓ {} results → similar_movies_results.json + similar_movies.md", all_results.len());

    Ok(())
}

fn justwatch_url(title: &str, year: u32) -> String {
    let q = title.split_whitespace().collect::<Vec<_>>().join("+");
    format!("https://www.justwatch.com/us/search?q={q}+{year}")
}

fn imdb_url(title: &str, year: u32) -> String {
    let q = title.split_whitespace().collect::<Vec<_>>().join("+");
    format!("https://www.imdb.com/find/?q={q}+{year}")
}

fn build_markdown(query: &str, results: &[MovieResult]) -> String {
    let mut md = String::new();
    md.push_str(&format!("# Movies similar to: {query}\n\n"));
    md.push_str("| # | Title | Year | Platform | IMDb | JustWatch | IMDB |\n");
    md.push_str("|---|-------|------|----------|------|-----------|------|\n");
    for m in results {
        let jw = justwatch_url(&m.title, m.year);
        let imdb = imdb_url(&m.title, m.year);
        md.push_str(&format!(
            "| {} | {} | {} | {} | {:.1} | [Watch]({}) | [IMDb]({}) |\n",
            m.rank, m.title, m.year, m.platform, m.imdb_rating, jw, imdb,
        ));
    }
    md
}
