//! Unified Udemy CLI: crawl, scrape (ingest), and search.
//!
//! Usage:
//!   cargo run --bin udemy -- crawl --output ./data/crawled-courses.json
//!   cargo run --bin udemy -- scrape --json ./data/courses.json
//!   cargo run --bin udemy -- search "docker kubernetes deployment"

use std::collections::{HashMap, HashSet, VecDeque};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use serde::Deserialize;
use tokio::sync::Semaphore;
use tracing::{info, warn};

use udemy::crawler::{CrawlConfig, FetchResult, UdemyClient};
use udemy::keywords::{
    classify_topic_group, is_relevant, match_slugs, should_follow_topic, SEED_TOPICS,
};
use udemy::scraper::{load_courses_json, parse_course_html};
use udemy::types::{CrawlStats, ExternalCourseJson, SlugMapping};
use udemy::{Course, CourseStore};

#[derive(Parser)]
#[command(name = "udemy", about = "Udemy course pipeline: crawl, ingest, search")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    /// BFS-crawl Udemy topics and fetch course pages in parallel
    Crawl {
        /// Output JSON file path
        #[arg(long, default_value = "./data/crawled-courses.json")]
        output: PathBuf,

        /// Max concurrent topic page fetches
        #[arg(long, default_value_t = 4)]
        topic_concurrency: usize,

        /// Max concurrent course page fetches
        #[arg(long, default_value_t = 8)]
        course_concurrency: usize,

        /// Delay between batches in milliseconds
        #[arg(long, default_value_t = 1000)]
        delay_ms: u64,

        /// Also embed and store in LanceDB
        #[arg(long)]
        embed: bool,

        /// LanceDB path (only used with --embed)
        #[arg(long, default_value = "./lance-db")]
        db: String,

        /// Embed server URL (only used with --embed)
        #[arg(long, default_value = "http://localhost:9999")]
        embed_url: String,

        /// Batch size for embedding
        #[arg(long, default_value_t = 8)]
        embed_batch: usize,
    },

    /// Ingest courses from JSON into a Lance vector store
    Scrape {
        /// Path to a JSON file with course data
        #[arg(long)]
        json: PathBuf,

        /// Where to create / open the Lance database
        #[arg(long, default_value = "./lance-db")]
        db: String,

        /// Candle embed server URL
        #[arg(long, default_value = "http://localhost:9999")]
        embed_url: String,

        /// How many courses to embed per batch
        #[arg(long, default_value_t = 8)]
        batch: usize,
    },

    /// Semantic search over embedded Udemy courses
    Search {
        /// The search query
        query: String,

        /// Lance database path
        #[arg(long, default_value = "./lance-db")]
        db: String,

        /// Number of results to return
        #[arg(long, short, default_value_t = 5)]
        top: usize,

        /// Candle embed server URL
        #[arg(long, default_value = "http://localhost:9999")]
        embed_url: String,
    },
}

#[derive(Deserialize)]
struct EmbedResponse {
    data: Vec<EmbedData>,
}

#[derive(Deserialize)]
struct EmbedData {
    embedding: Vec<f32>,
}

async fn embed_batch(
    client: &reqwest::Client,
    url: &str,
    texts: &[String],
) -> Result<Vec<Vec<f32>>> {
    let resp: EmbedResponse = client
        .post(format!("{url}/embed"))
        .json(&serde_json::json!({ "input": texts }))
        .send()
        .await
        .context("calling embed server")?
        .json()
        .await
        .context("parsing embed response")?;

    let vecs: Vec<Vec<f32>> = resp.data.into_iter().map(|d| d.embedding).collect();
    assert_eq!(
        vecs.len(),
        texts.len(),
        "embed server returned wrong number of vectors"
    );
    Ok(vecs)
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Command::Crawl {
            output,
            topic_concurrency,
            course_concurrency,
            delay_ms,
            embed,
            db,
            embed_url,
            embed_batch,
        } => {
            cmd_crawl(
                output,
                topic_concurrency,
                course_concurrency,
                delay_ms,
                embed,
                db,
                embed_url,
                embed_batch,
            )
            .await
        }
        Command::Scrape {
            json,
            db,
            embed_url,
            batch,
        } => cmd_scrape(json, db, embed_url, batch).await,
        Command::Search {
            query,
            db,
            top,
            embed_url,
        } => cmd_search(query, db, top, embed_url).await,
    }
}

// ── crawl ──────────────────────────────────────────────────────────────────────

async fn cmd_crawl(
    output: PathBuf,
    topic_concurrency: usize,
    course_concurrency: usize,
    delay_ms: u64,
    embed: bool,
    db: String,
    embed_url: String,
    embed_batch_size: usize,
) -> Result<()> {
    let start = Instant::now();
    let mut stats = CrawlStats::default();
    let client = Arc::new(UdemyClient::new(&CrawlConfig::default()));

    // ── Phase 1: BFS topic crawl ────────────────────────────────────────────
    eprintln!("Phase 1: Crawling topic pages...\n");

    let mut topic_queue: VecDeque<String> = SEED_TOPICS.iter().map(|s| s.to_string()).collect();
    let mut crawled_topics: HashSet<String> = HashSet::new();
    let mut discovered_urls: HashMap<String, String> = HashMap::new();

    let topic_sem = Arc::new(Semaphore::new(topic_concurrency));

    while !topic_queue.is_empty() {
        let mut batch = Vec::new();
        while batch.len() < topic_concurrency {
            match topic_queue.pop_front() {
                Some(t) if crawled_topics.insert(t.clone()) => batch.push(t),
                Some(_) => continue,
                None => break,
            }
        }
        if batch.is_empty() {
            break;
        }

        let mut handles = Vec::new();
        for topic in batch {
            let sem = Arc::clone(&topic_sem);
            let client = Arc::clone(&client);
            handles.push(tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                let url = format!("https://www.udemy.com/topic/{topic}/");
                let result = client.fetch_page(&url).await;
                (topic, result)
            }));
        }

        for handle in handles {
            match handle.await {
                Ok((topic, FetchResult::Ok(html))) => {
                    let parsed = udemy::topic_parser::parse_topic_page(&html);
                    let n_courses = parsed.course_urls.len();
                    let n_topics = parsed.related_topics.len();
                    eprintln!(
                        "  /topic/{topic}/ — {n_courses} courses, {n_topics} related topics"
                    );
                    stats.topics_crawled += 1;

                    for url in parsed.course_urls {
                        discovered_urls.entry(url).or_insert_with(|| topic.clone());
                    }
                    for rt in parsed.related_topics {
                        if should_follow_topic(&rt) && !crawled_topics.contains(&rt) {
                            topic_queue.push_back(rt);
                        }
                    }
                }
                Ok((topic, FetchResult::CloudflareBlocked)) => {
                    eprintln!("  /topic/{topic}/ — BLOCKED (Cloudflare)");
                    stats.topics_blocked += 1;
                }
                Ok((topic, FetchResult::HttpError(code, _))) => {
                    warn!("/topic/{topic}/: HTTP {code}");
                    stats.topics_blocked += 1;
                }
                Ok((topic, FetchResult::ConnectionError(e))) => {
                    warn!("/topic/{topic}/: connection error: {e}");
                    stats.topics_blocked += 1;
                }
                Err(e) => {
                    warn!("topic task panicked: {e}");
                }
            }
        }

        if delay_ms > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        }
    }

    stats.courses_discovered = discovered_urls.len();
    eprintln!(
        "\nDiscovered {} courses from {} topics\n",
        stats.courses_discovered,
        stats.topics_crawled + stats.topics_blocked
    );

    if discovered_urls.is_empty() {
        eprintln!("No courses found — Cloudflare may be blocking topic pages.");
        stats.elapsed_secs = start.elapsed().as_secs_f64();
        eprintln!("\n{stats}");
        return Ok(());
    }

    // ── Phase 2: Parallel course fetch ──────────────────────────────────────
    eprintln!("Phase 2: Fetching course pages...\n");

    let course_sem = Arc::new(Semaphore::new(course_concurrency));
    let entries: Vec<(String, String)> = discovered_urls.into_iter().collect();
    let total = entries.len();
    let mut handles = Vec::new();

    for (url, from_topic) in entries {
        let sem = Arc::clone(&course_sem);
        let client = Arc::clone(&client);
        handles.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            let result = client.fetch_page(&url).await;
            (url, from_topic, result)
        }));
    }

    let mut courses: Vec<ExternalCourseJson> = Vec::new();

    for (i, handle) in handles.into_iter().enumerate() {
        match handle.await {
            Ok((url, from_topic, FetchResult::Ok(html))) => {
                stats.courses_fetched += 1;

                match parse_course_html(&html, &url) {
                    Ok(course) => {
                        let full_text = course.embed_text();

                        if !is_relevant(&full_text) {
                            if (i + 1) % 50 == 0 || i + 1 == total {
                                eprintln!("  [{}/{}] progress...", i + 1, total);
                            }
                            stats.courses_irrelevant += 1;
                            continue;
                        }

                        let topic_group = classify_topic_group(&full_text);
                        let slug_mappings: Vec<SlugMapping> = match_slugs(&full_text)
                            .into_iter()
                            .map(|(slug, relevance)| SlugMapping { slug, relevance })
                            .collect();

                        let short = url
                            .replace("https://www.udemy.com/course/", "")
                            .replace('/', "");
                        eprintln!(
                            "  [{}/{}] [{topic_group}] {short} — {:.1}★",
                            i + 1,
                            total,
                            course.rating
                        );

                        let metadata = serde_json::json!({
                            "instructors": [course.instructor],
                            "whatYoullLearn": serde_json::from_str::<Vec<String>>(&course.topics_json).unwrap_or_default(),
                            "discoveredFrom": from_topic,
                        });

                        courses.push(ExternalCourseJson {
                            title: course.title,
                            url: course.url,
                            provider: "Udemy".to_string(),
                            description: if course.description.is_empty() {
                                None
                            } else {
                                Some(course.description)
                            },
                            level: if course.level.is_empty() {
                                None
                            } else {
                                Some(course.level)
                            },
                            rating: if course.rating > 0.0 {
                                Some(course.rating as f64)
                            } else {
                                None
                            },
                            review_count: if course.review_count > 0 {
                                Some(course.review_count)
                            } else {
                                None
                            },
                            duration_hours: if course.duration_hours > 0.0 {
                                Some(course.duration_hours as f64)
                            } else {
                                None
                            },
                            is_free: course.price.to_lowercase() == "free",
                            enrolled: if course.num_students > 0 {
                                Some(course.num_students)
                            } else {
                                None
                            },
                            image_url: if course.image_url.is_empty() {
                                None
                            } else {
                                Some(course.image_url)
                            },
                            language: course.language,
                            topic_group: topic_group.to_string(),
                            metadata,
                            slug_mappings,
                        });

                        stats.courses_saved += 1;
                    }
                    Err(e) => {
                        warn!("Parse error for {url}: {e}");
                        stats.courses_failed += 1;
                    }
                }
            }
            Ok((url, _, FetchResult::CloudflareBlocked)) => {
                let short = url
                    .replace("https://www.udemy.com/course/", "")
                    .replace('/', "");
                if stats.courses_blocked < 5 {
                    eprintln!("  [{}/{}] BLOCKED {short}", i + 1, total);
                } else if stats.courses_blocked == 5 {
                    eprintln!("  ... suppressing further block messages");
                }
                stats.courses_blocked += 1;
            }
            Ok((url, _, FetchResult::HttpError(code, _))) => {
                warn!("{url}: HTTP {code}");
                stats.courses_failed += 1;
            }
            Ok((url, _, FetchResult::ConnectionError(e))) => {
                warn!("{url}: {e}");
                stats.courses_failed += 1;
            }
            Err(e) => {
                warn!("course task panicked: {e}");
                stats.courses_failed += 1;
            }
        }
    }

    // ── Phase 3: Write JSON output ──────────────────────────────────────────
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    let json = serde_json::to_string_pretty(&courses).context("serializing courses")?;
    std::fs::write(&output, &json)
        .with_context(|| format!("writing {}", output.display()))?;

    eprintln!(
        "\nWrote {} courses to {}",
        courses.len(),
        output.display()
    );

    // ── Phase 4 (optional): Embed + LanceDB ────────────────────────────────
    if embed && !courses.is_empty() {
        eprintln!("\nPhase 4: Embedding + LanceDB storage...\n");

        let http = reqwest::Client::new();
        http.get(format!("{}/health", embed_url))
            .send()
            .await
            .context("embed server not reachable — start with: cargo run -p candle --bin embed-server --features server")?;

        let store_courses: Vec<Course> = courses
            .iter()
            .map(|c| Course {
                course_id: c
                    .url
                    .trim_end_matches('/')
                    .rsplit('/')
                    .next()
                    .unwrap_or("unknown")
                    .to_string(),
                title: c.title.clone(),
                url: c.url.clone(),
                description: c.description.clone().unwrap_or_default(),
                instructor: c
                    .metadata
                    .get("instructors")
                    .and_then(|v| v.as_array())
                    .and_then(|a| a.first())
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                level: c.level.clone().unwrap_or_default(),
                rating: c.rating.unwrap_or(0.0) as f32,
                review_count: c.review_count.unwrap_or(0),
                num_students: c.enrolled.unwrap_or(0),
                duration_hours: c.duration_hours.unwrap_or(0.0) as f32,
                price: if c.is_free {
                    "Free".to_string()
                } else {
                    String::new()
                },
                language: c.language.clone(),
                category: c.topic_group.clone(),
                image_url: c.image_url.clone().unwrap_or_default(),
                topics_json: c
                    .metadata
                    .get("whatYoullLearn")
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "[]".to_string()),
            })
            .collect();

        let mut store = CourseStore::connect(&db).await?;
        let mut done = 0usize;

        for chunk in store_courses.chunks(embed_batch_size) {
            let texts: Vec<String> = chunk.iter().map(|c| c.embed_text()).collect();
            let vecs = embed_batch(&http, &embed_url, &texts).await?;
            store.add(chunk, &vecs).await?;

            done += chunk.len();
            eprintln!("  {done}/{} embedded", store_courses.len());
        }

        eprintln!("Stored {done} course embeddings in {db}");
    }

    stats.elapsed_secs = start.elapsed().as_secs_f64();
    eprintln!("\n{}", "─".repeat(50));
    eprintln!("{stats}");

    Ok(())
}

// ── scrape ─────────────────────────────────────────────────────────────────────

async fn cmd_scrape(json: PathBuf, db: String, embed_url: String, batch: usize) -> Result<()> {
    let courses: Vec<Course> = load_courses_json(&json)?;
    if courses.is_empty() {
        eprintln!("No courses found in {}", json.display());
        return Ok(());
    }
    eprintln!(
        "Loaded {} courses from {}",
        courses.len(),
        json.display()
    );

    let client = reqwest::Client::new();
    client
        .get(format!("{}/health", embed_url))
        .send()
        .await
        .context("embed server not reachable — start it with: cargo run -p candle --bin embed-server --features server")?;
    eprintln!("Embed server OK at {embed_url}");

    let mut store = CourseStore::connect(&db).await?;
    let already = store.count().await?;
    info!("{already} courses already in store");

    let total = courses.len();
    let mut done = 0usize;

    for chunk in courses.chunks(batch) {
        let texts: Vec<String> = chunk.iter().map(|c| c.embed_text()).collect();
        let vecs = embed_batch(&client, &embed_url, &texts).await?;
        store.add(chunk, &vecs).await?;

        done += chunk.len();
        eprintln!("  {done}/{total} embedded");
    }

    eprintln!(
        "\nDone — {done} courses indexed into {db} ({} total rows)",
        already + done
    );
    Ok(())
}

// ── search ─────────────────────────────────────────────────────────────────────

async fn cmd_search(query: String, db: String, top: usize, embed_url: String) -> Result<()> {
    let client = reqwest::Client::new();
    let resp: EmbedResponse = client
        .post(format!("{}/embed", embed_url))
        .json(&serde_json::json!({ "input": query }))
        .send()
        .await
        .context("embed server not reachable — start it with: cargo run -p candle --bin embed-server --features server")?
        .json()
        .await
        .context("parsing embed response")?;

    let vec = resp
        .data
        .into_iter()
        .next()
        .context("empty embed response")?
        .embedding;

    let store = CourseStore::connect(&db).await?;
    let results = store.search(vec, top).await?;

    if results.is_empty() {
        eprintln!("No results — is the store populated? Run `udemy scrape` first.");
        return Ok(());
    }

    println!("\nQuery: \"{query}\"\n");
    println!(
        "{:<4} {:<6} {:<45} {:<6} {}",
        "Rank", "Score", "Title", "Rating", "Instructor"
    );
    println!("{}", "-".repeat(90));

    for (i, r) in results.iter().enumerate() {
        let c = &r.course;
        println!(
            "{:<4} {:<6.3} {:<45} {:<6.1} {}",
            i + 1,
            r.score,
            truncate(&c.title, 44),
            c.rating,
            truncate(&c.instructor, 25),
        );
        println!("     {} | {} | {}", c.level, c.price, c.url);
        println!("     {}", truncate(&c.description, 85));
        println!();
    }

    Ok(())
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max.saturating_sub(1)])
    }
}
