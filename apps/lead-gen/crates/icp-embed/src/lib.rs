pub mod device;
pub mod embedder;
pub mod error;
pub mod server;

pub use device::best_device;
pub use embedder::{IcpEmbedder, OUTPUT_DIM};
pub use error::{Error, Result};
