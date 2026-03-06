pub mod client;
pub mod error;
pub mod long;
pub mod split;
pub mod types;
pub mod wav;

pub use client::Client;
pub use error::{Error, Result};
pub use long::{Progress, SynthesizeLongBuilder};
pub use split::split_text;
pub use types::{TtsRequest, TtsResponse, Voice};
