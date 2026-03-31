use std::path::PathBuf;

pub struct Config {
    pub model_id: String,
    pub model_path: Option<PathBuf>,
    pub adapter_path: Option<PathBuf>,
    pub max_tokens: usize,
    pub temperature: f32,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            model_id: "Qwen/Qwen2.5-1.5B-Instruct".to_string(),
            model_path: None,
            adapter_path: None,
            max_tokens: 512,
            temperature: 0.3,
        }
    }
}

impl Config {
    pub fn from_args() -> Self {
        let args: Vec<String> = std::env::args().collect();
        let mut config = Self::default();
        let mut i = 1;

        while i < args.len() {
            match args[i].as_str() {
                "--model-path" => {
                    i += 1;
                    if i < args.len() {
                        config.model_path = Some(PathBuf::from(&args[i]));
                    }
                }
                "--model-id" => {
                    i += 1;
                    if i < args.len() {
                        config.model_id = args[i].clone();
                    }
                }
                "--adapter-path" => {
                    i += 1;
                    if i < args.len() {
                        config.adapter_path = Some(PathBuf::from(&args[i]));
                    }
                }
                "--max-tokens" => {
                    i += 1;
                    if i < args.len() {
                        config.max_tokens = args[i].parse().unwrap_or(512);
                    }
                }
                "--temperature" => {
                    i += 1;
                    if i < args.len() {
                        config.temperature = args[i].parse().unwrap_or(0.3);
                    }
                }
                "--help" | "-h" => {
                    print_usage();
                    std::process::exit(0);
                }
                _ => {
                    eprintln!("Unknown argument: {}", args[i]);
                    print_usage();
                    std::process::exit(1);
                }
            }
            i += 1;
        }

        config
    }
}

fn print_usage() {
    eprintln!(
        "email-gen: Rust inference engine for B2B email generation

USAGE:
    email-gen [OPTIONS]

    Reads JSON from stdin, generates email, writes JSON to stdout.

OPTIONS:
    --model-id <id>         HuggingFace model ID (default: Qwen/Qwen2.5-1.5B-Instruct)
    --model-path <path>     Path to local model weights directory (safetensors)
    --adapter-path <path>   Path to LoRA adapter (adapters.safetensors)
    --max-tokens <n>        Max generation tokens (default: 512)
    --temperature <f>       Sampling temperature (default: 0.3)
    --help, -h              Print this help

INPUT (stdin):
    {{\"recipient\": {{\"name\": \"Sarah\", \"position\": \"CTO\", \"company\": \"NeuralScale\", \"industry\": \"AI/ML Platform\"}}, \"email_type\": \"initial\"}}

OUTPUT (stdout):
    {{\"subject\": \"...\", \"body\": \"...\"}}"
    );
}
