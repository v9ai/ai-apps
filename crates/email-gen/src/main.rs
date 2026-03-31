mod config;
mod error;
mod inference;
mod lora;
mod prompt;

use anyhow::Result;
use candle_core::Device;

use config::Config;
use inference::EmailGenerator;
use prompt::{parse_output, build_prompt, InputPayload};

fn best_device() -> Result<Device> {
    #[cfg(feature = "metal")]
    {
        tracing::info!("using Metal device");
        return Ok(Device::new_metal(0)?);
    }

    #[cfg(feature = "cuda")]
    {
        tracing::info!("using CUDA device");
        return Ok(Device::new_cuda(0)?);
    }

    #[allow(unreachable_code)]
    {
        tracing::info!("using CPU device");
        Ok(Device::Cpu)
    }
}

fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("email_gen=info".parse()?)
        )
        .init();

    let config = Config::from_args();

    // Read input JSON from stdin
    let input: InputPayload = {
        let mut buf = String::new();
        std::io::Read::read_to_string(&mut std::io::stdin(), &mut buf)?;
        serde_json::from_str(&buf)?
    };

    tracing::info!(
        "generating {} email for {} ({} at {})",
        input.email_type,
        input.recipient.name,
        input.recipient.position,
        input.recipient.company
    );

    // Build prompt
    let prompt_text = build_prompt(&input.recipient, &input.email_type);

    // Initialize model
    let device = best_device()?;
    let mut generator = EmailGenerator::load(&config, &device)?;

    // Generate
    let raw_output = generator.generate(&prompt_text)?;
    tracing::info!("raw output: {raw_output}");

    // Parse JSON from output
    let email = parse_output(&raw_output)
        .ok_or_else(|| error::Error::NoOutput)?;

    // Write JSON to stdout
    serde_json::to_writer(std::io::stdout(), &email)?;
    println!(); // trailing newline

    Ok(())
}
