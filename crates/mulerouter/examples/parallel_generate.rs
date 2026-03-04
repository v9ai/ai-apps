/// Run several Qwen Image Max generations in parallel and print each result.
///
///   MULEROUTER_API_KEY=xxx cargo run --example parallel_generate
use mulerouter::{Client, QwenImageMaxRequest, QwenImageMaxSize};
use std::env;

#[tokio::main]
async fn main() {
    let api_key = env::var("MULEROUTER_API_KEY").expect("set MULEROUTER_API_KEY");
    let client = Client::new(api_key);

    let prompts = [
        "A serene mountain lake at dawn with mist rising",
        "A futuristic city skyline at night with neon lights",
        "A cosy forest cabin in autumn, warm light inside",
    ];

    let requests: Vec<QwenImageMaxRequest> = prompts
        .iter()
        .map(|p| QwenImageMaxRequest {
            prompt: p.to_string(),
            size: Some(QwenImageMaxSize::W1024H1024),
            ..Default::default()
        })
        .collect();

    println!("Submitting {} tasks in parallel…", requests.len());
    let results = client
        .qwen_image_max_generate_and_wait_many(requests)
        .await;

    for (i, result) in results.into_iter().enumerate() {
        match result {
            Ok(task) => println!(
                "[{}] ✓ task={} status={:?}",
                i, task.task_info.id, task.task_info.status
            ),
            Err(e) => eprintln!("[{}] ✗ {e}", i),
        }
    }
}
