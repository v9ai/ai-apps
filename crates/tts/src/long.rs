use std::path::PathBuf;
use std::sync::Arc;

use futures::stream::{self, StreamExt};

use crate::client::Client;
use crate::error::{Error, Result};
use crate::split::split_text;
use crate::types::{TtsRequest, Voice};
use crate::wav;

/// Progress info passed to the callback on each chunk completion.
#[derive(Debug, Clone)]
pub struct Progress {
    pub chunk_index: usize,
    pub total_chunks: usize,
    pub duration_secs: f64,
}

/// Builder for long-form TTS synthesis with concurrency, retry, and progress.
///
/// # Example
/// ```no_run
/// use tts::{Client, Voice};
///
/// # async fn example() -> tts::Result<()> {
/// let client = Client::new("key");
/// let wav = client.long(Voice::Cherry)
///     .text("Very long text here...")
///     .concurrency(8)
///     .retries(3)
///     .on_progress(|p| eprintln!("[{}/{}]", p.chunk_index + 1, p.total_chunks))
///     .synthesize()
///     .await?;
/// # Ok(())
/// # }
/// ```
pub struct SynthesizeLongBuilder {
    client: Client,
    voice: Voice,
    model: Option<String>,
    instructions: Option<String>,
    text: Option<String>,
    chunks: Option<Vec<String>>,
    concurrency: usize,
    retries: u32,
    progress_cb: Option<Arc<dyn Fn(Progress) + Send + Sync>>,
    output_file: Option<PathBuf>,
}

impl SynthesizeLongBuilder {
    pub(crate) fn new(client: Client, voice: Voice) -> Self {
        Self {
            client,
            voice,
            model: None,
            instructions: None,
            text: None,
            chunks: None,
            concurrency: 8,
            retries: 3,
            progress_cb: None,
            output_file: None,
        }
    }

    /// Set text to synthesize (will be auto-split at sentence boundaries).
    pub fn text(mut self, text: impl Into<String>) -> Self {
        self.text = Some(text.into());
        self
    }

    /// Provide pre-split chunks instead of auto-splitting.
    pub fn chunks(mut self, chunks: Vec<String>) -> Self {
        self.chunks = Some(chunks);
        self
    }

    /// Override the TTS model (default: `qwen3-tts-flash`).
    pub fn model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    /// Set voice instructions (switches to `qwen3-tts-instruct-flash` if no model override).
    pub fn instructions(mut self, instructions: impl Into<String>) -> Self {
        self.instructions = Some(instructions.into());
        self
    }

    /// Max concurrent API requests (default: 8).
    pub fn concurrency(mut self, n: usize) -> Self {
        self.concurrency = n.max(1);
        self
    }

    /// Max retries per chunk on transient errors (default: 3).
    pub fn retries(mut self, n: u32) -> Self {
        self.retries = n;
        self
    }

    /// Register a progress callback fired after each chunk completes.
    pub fn on_progress(mut self, cb: impl Fn(Progress) + Send + Sync + 'static) -> Self {
        self.progress_cb = Some(Arc::new(cb));
        self
    }

    /// Write the final WAV to a file instead of returning bytes.
    pub fn output_file(mut self, path: impl Into<PathBuf>) -> Self {
        self.output_file = Some(path.into());
        self
    }

    /// Execute the synthesis pipeline.
    pub async fn synthesize(self) -> Result<Vec<u8>> {
        // Resolve chunks
        let chunks = match (self.chunks, self.text) {
            (Some(c), _) => c,
            (None, Some(t)) => split_text(&t),
            (None, None) => {
                return Err(Error::Other(
                    "SynthesizeLongBuilder: provide .text() or .chunks()".into(),
                ));
            }
        };

        if chunks.is_empty() {
            return Err(Error::Other("SynthesizeLongBuilder: no chunks to synthesize".into()));
        }

        let total_chunks = chunks.len();

        // Build template request
        let mut template = TtsRequest::new("", self.voice);
        if let Some(model) = &self.model {
            template = template.with_model(model.clone());
        }
        if let Some(instructions) = &self.instructions {
            if self.model.is_none() {
                template = template.with_model("qwen3-tts-instruct-flash");
            }
            template = template.with_instructions(instructions.clone());
        }

        let client = Arc::new(self.client);
        let template = Arc::new(template);
        let progress_cb = self.progress_cb;
        let retries = self.retries;

        // Create indexed futures
        let futs = chunks.into_iter().enumerate().map(|(idx, chunk_text)| {
            let client = Arc::clone(&client);
            let template = Arc::clone(&template);
            let progress_cb = progress_cb.clone();

            async move {
                let result = synthesize_with_retry(&client, &template, &chunk_text, retries).await;

                if let Ok(ref wav_bytes) = result {
                    if let Some(ref cb) = progress_cb {
                        cb(Progress {
                            chunk_index: idx,
                            total_chunks,
                            duration_secs: wav::estimate_duration_secs(wav_bytes.len()),
                        });
                    }
                }

                (idx, result)
            }
        });

        // Execute concurrently, preserving order via index
        let results: Vec<(usize, Result<Vec<u8>>)> = stream::iter(futs)
            .buffer_unordered(self.concurrency)
            .collect()
            .await;

        // Sort by index and check for errors
        let mut sorted = results;
        sorted.sort_by_key(|(idx, _)| *idx);

        let mut wav_chunks: Vec<Vec<u8>> = Vec::with_capacity(total_chunks);
        for (_, result) in sorted {
            wav_chunks.push(result?);
        }

        // Assemble final WAV
        let wav = assemble_wav(wav_chunks);

        // Write to file if requested
        if let Some(path) = self.output_file {
            std::fs::write(&path, &wav)?;
        }

        Ok(wav)
    }
}

/// Synthesize a single chunk with exponential backoff retry.
async fn synthesize_with_retry(
    client: &Client,
    template: &TtsRequest,
    text: &str,
    max_retries: u32,
) -> Result<Vec<u8>> {
    let mut last_err = None;

    for attempt in 0..=max_retries {
        if attempt > 0 {
            let delay = std::time::Duration::from_secs(1 << (attempt - 1).min(4));
            tokio::time::sleep(delay).await;
        }

        let mut req = template.clone();
        req.input.text = text.to_owned();

        match client.synthesize_bytes(req).await {
            Ok(bytes) => return Ok(bytes),
            Err(e) if e.is_retryable() && attempt < max_retries => {
                last_err = Some(e);
                continue;
            }
            Err(e) => return Err(e),
        }
    }

    Err(last_err.unwrap())
}

/// Assemble multiple WAV byte arrays into a single WAV file.
/// Keeps the first chunk's header, appends PCM data from the rest, and fixes header sizes.
fn assemble_wav(wav_chunks: Vec<Vec<u8>>) -> Vec<u8> {
    let mut combined = Vec::new();

    for (i, chunk) in wav_chunks.iter().enumerate() {
        if i == 0 {
            combined.extend_from_slice(chunk);
        } else if chunk.len() > wav::HEADER_SIZE {
            combined.extend_from_slice(&chunk[wav::HEADER_SIZE..]);
        }
    }

    wav::fix_header_sizes(&mut combined);
    combined
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_fake_wav(pcm_bytes: usize) -> Vec<u8> {
        let mut wav = vec![0u8; wav::HEADER_SIZE + pcm_bytes];
        wav[0..4].copy_from_slice(b"RIFF");
        wav
    }

    #[test]
    fn assemble_two_chunks() {
        let c1 = make_fake_wav(100);
        let c2 = make_fake_wav(200);
        let result = assemble_wav(vec![c1, c2]);
        // header + 100 + 200 bytes of PCM
        assert_eq!(result.len(), wav::HEADER_SIZE + 300);
        let data_size = u32::from_le_bytes(result[40..44].try_into().unwrap());
        assert_eq!(data_size, 300);
    }

    #[test]
    fn assemble_single_chunk() {
        let c1 = make_fake_wav(500);
        let result = assemble_wav(vec![c1]);
        assert_eq!(result.len(), wav::HEADER_SIZE + 500);
    }
}
