//! Integration tests against the live DashScope API.
//!
//! Uses `text-embedding-v4` for embeddings and `qwen-turbo` for chat
//! (smallest/cheapest models) so tests cost almost nothing.
//!
//! All tests skip automatically when `DASHSCOPE_API_KEY` is not set.
//!
//! Run:
//!   cargo test --test integration -- --nocapture

use qwen::{ChatMessage, ChatRequest, Client, EmbeddingRequest};
use serial_test::serial;

// ─── Helper ───────────────────────────────────────────────────────────────────

fn try_client() -> Option<Client> {
    let _ = dotenvy::from_filename(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"),
    );
    let key = std::env::var("DASHSCOPE_API_KEY").ok()?;
    Some(Client::new(key))
}

// ─── Embedding tests ─────────────────────────────────────────────────────────

/// Basic embedding: single string returns a non-empty vector.
#[tokio::test]
#[serial]
async fn test_embed_single_returns_vector() {
    let Some(client) = try_client() else { return };

    let resp = client
        .embed(EmbeddingRequest::new("Hemoglobin level is 14.2 g/dL"))
        .await
        .expect("embed should succeed");

    assert_eq!(resp.data.len(), 1);
    assert_eq!(resp.data[0].embedding.len(), 1024, "expected 1024-dim vector");
    assert_eq!(resp.data[0].index, 0);
    assert!(resp.usage.total_tokens > 0);
    println!("tokens used: {}", resp.usage.total_tokens);
}

/// Batch embedding: multiple strings return multiple vectors.
#[tokio::test]
#[serial]
async fn test_embed_batch_returns_multiple_vectors() {
    let Some(client) = try_client() else { return };

    let resp = client
        .embed(EmbeddingRequest::batch(vec![
            "White blood cell count: 7.2 x10^9/L".into(),
            "Platelet count: 250 x10^9/L".into(),
            "Glucose: 95 mg/dL".into(),
        ]))
        .await
        .expect("batch embed should succeed");

    assert_eq!(resp.data.len(), 3);
    for (i, d) in resp.data.iter().enumerate() {
        assert_eq!(d.index as usize, i);
        assert_eq!(d.embedding.len(), 1024);
    }
}

/// Custom dimensions: request 512-dim vectors.
#[tokio::test]
#[serial]
async fn test_embed_custom_dimensions() {
    let Some(client) = try_client() else { return };

    let req = EmbeddingRequest::new("cholesterol test results")
        .with_dimensions(512);

    let resp = client.embed(req).await.expect("embed should succeed");
    assert_eq!(resp.data[0].embedding.len(), 512, "expected 512-dim vector");
}

/// Convenience embed_one returns just the vector.
#[tokio::test]
#[serial]
async fn test_embed_one_convenience() {
    let Some(client) = try_client() else { return };

    let vec = client
        .embed_one("iron levels are low")
        .await
        .expect("embed_one should succeed");

    assert_eq!(vec.len(), 1024);
    // Vectors should be normalized (L2 norm close to 1.0)
    let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
    assert!(
        (norm - 1.0).abs() < 0.1,
        "expected roughly unit norm, got {norm}"
    );
}

/// Similar texts produce similar embeddings, dissimilar texts do not.
#[tokio::test]
#[serial]
async fn test_embed_similarity_makes_sense() {
    let Some(client) = try_client() else { return };

    let resp = client
        .embed(EmbeddingRequest::batch(vec![
            "high cholesterol levels detected".into(),
            "elevated cholesterol in blood test".into(),
            "the weather is sunny today".into(),
        ]))
        .await
        .expect("embed should succeed");

    let a = &resp.data[0].embedding;
    let b = &resp.data[1].embedding;
    let c = &resp.data[2].embedding;

    let sim_ab = cosine_sim(a, b);
    let sim_ac = cosine_sim(a, c);

    println!("sim(cholesterol, cholesterol_synonym) = {sim_ab:.4}");
    println!("sim(cholesterol, weather) = {sim_ac:.4}");

    assert!(
        sim_ab > sim_ac,
        "similar texts should have higher similarity: {sim_ab} vs {sim_ac}"
    );
}

fn cosine_sim(a: &[f32], b: &[f32]) -> f32 {
    let dot: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let na: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let nb: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    dot / (na * nb)
}

// ─── Chat tests ──────────────────────────────────────────────────────────────

/// Basic chat round-trip.
#[tokio::test]
#[serial]
async fn test_chat_returns_response() {
    let Some(client) = try_client() else { return };

    let req = ChatRequest {
        model: "qwen-turbo".into(),
        messages: vec![ChatMessage::user("Reply with exactly: pong")],
        max_completion_tokens: Some(16),
        temperature: Some(0.0),
    };

    let resp = client.chat(req).await.expect("chat should succeed");

    assert!(!resp.choices.is_empty());
    let text = resp.text().expect("should have text");
    assert!(!text.is_empty());
    println!("reply: {text}");
}

/// System prompt is respected.
#[tokio::test]
#[serial]
async fn test_chat_system_prompt() {
    let Some(client) = try_client() else { return };

    let req = ChatRequest {
        model: "qwen-turbo".into(),
        messages: vec![
            ChatMessage::system("You are a calculator. Reply only with the numeric result."),
            ChatMessage::user("2 + 2"),
        ],
        max_completion_tokens: Some(16),
        temperature: Some(0.0),
    };

    let resp = client.chat(req).await.expect("chat should succeed");
    let text = resp.text().unwrap_or("");
    assert!(text.contains('4'), "expected '4' in reply, got: {text}");
}

// ─── Error handling ──────────────────────────────────────────────────────────

/// Invalid API key returns an error.
#[tokio::test]
#[serial]
async fn test_invalid_api_key_returns_error() {
    let client = Client::new("invalid-key-000");

    let err = client
        .embed(EmbeddingRequest::new("test"))
        .await
        .expect_err("bad key should fail");

    match err {
        qwen::Error::Api { .. } | qwen::Error::Http { .. } => {}
        other => panic!("unexpected error variant: {other:?}"),
    }
}
