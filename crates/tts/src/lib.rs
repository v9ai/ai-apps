pub mod client;
pub mod error;
pub mod long;
#[cfg(feature = "r2")]
pub mod r2;
pub mod split;
pub mod types;
pub mod wav;

pub use client::Client;
pub use error::{Error, Result};
pub use long::{Progress, SynthesizeLongBuilder};
#[cfg(feature = "r2")]
pub use r2::{R2Config, R2UploadResult};
pub use split::split_text;
pub use types::{TtsRequest, TtsResponse, Voice};
