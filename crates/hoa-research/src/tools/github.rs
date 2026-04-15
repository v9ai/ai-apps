//! GitHub API — profile + top repos.

use reqwest::Client;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct GhUser {
    login: String,
    name: Option<String>,
    bio: Option<String>,
    public_repos: u32,
    followers: u32,
    following: u32,
    company: Option<String>,
    location: Option<String>,
    #[allow(dead_code)]
    blog: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GhRepo {
    #[allow(dead_code)]
    name: String,
    full_name: String,
    description: Option<String>,
    stargazers_count: u32,
    forks_count: u32,
    language: Option<String>,
    html_url: String,
}

/// Fetch GitHub profile + top repos (by stars).
pub async fn github_profile(username: &str) -> String {
    let client = Client::builder()
        .user_agent("ResearchBot/1.0")
        .build()
        .unwrap();

    // Fetch user profile
    let user_url = format!("https://api.github.com/users/{username}");
    let user: Option<GhUser> = client
        .get(&user_url)
        .send()
        .await
        .ok()
        .and_then(|r| if r.status().is_success() { Some(r) } else { None })
        .and_then(|r| futures::executor::block_on(r.json()).ok());

    // Fetch repos sorted by stars
    let repos_url = format!(
        "https://api.github.com/users/{username}/repos?sort=stars&per_page=10&direction=desc"
    );
    let repos: Vec<GhRepo> = client
        .get(&repos_url)
        .send()
        .await
        .ok()
        .and_then(|r| if r.status().is_success() { Some(r) } else { None })
        .and_then(|r| futures::executor::block_on(r.json()).ok())
        .unwrap_or_default();

    let mut out = String::new();

    if let Some(u) = &user {
        out.push_str(&format!(
            "GitHub: {} ({})\n  Bio: {}\n  Repos: {} | Followers: {} | Following: {}\n",
            u.login,
            u.name.as_deref().unwrap_or(""),
            u.bio.as_deref().unwrap_or("N/A"),
            u.public_repos,
            u.followers,
            u.following,
        ));
        if let Some(c) = &u.company {
            out.push_str(&format!("  Company: {c}\n"));
        }
        if let Some(l) = &u.location {
            out.push_str(&format!("  Location: {l}\n"));
        }
    }

    out.push_str("\nTop repositories:\n");
    for repo in repos.iter().take(10) {
        out.push_str(&format!(
            "- {} (★{} | {} forks | {})\n  {}\n  {}\n",
            repo.full_name,
            repo.stargazers_count,
            repo.forks_count,
            repo.language.as_deref().unwrap_or("unknown"),
            repo.description.as_deref().unwrap_or(""),
            repo.html_url,
        ));
    }

    if out.is_empty() {
        format!("(GitHub user {username} not found)")
    } else {
        out
    }
}
