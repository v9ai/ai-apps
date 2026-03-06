pub mod agent;
pub mod code;
pub mod core_api;
pub mod crossref;
pub mod dual;
pub mod openalex;
pub mod paper;
pub mod scholar;
pub mod team;
pub mod tools;

pub use core_api::CoreClient;
pub use crossref::CrossrefClient;
pub use dual::DualModelResearcher;
pub use openalex::OpenAlexClient;
pub use paper::ResearchPaper;
pub use scholar::SemanticScholarClient;
