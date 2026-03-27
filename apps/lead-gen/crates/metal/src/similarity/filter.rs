/// Pre-similarity search filters applied BEFORE computing cosine distance.
/// Skipping non-matching vectors early saves ~10ns per skipped candidate.

/// Per-vector metadata stored alongside INT8 embeddings in the mmap index.
#[repr(C, packed)]
#[derive(Clone, Copy)]
pub struct VectorMeta {
    pub job_id: [u8; 12],
    pub pipeline_stage: u8, // 0=discovered, 1=qualified, 2=applied, 3+=interview stages
    pub remote_policy: u8,  // 0=unknown, 1=full_remote, 2=hybrid, 3=onsite
    pub salary_min_k: u16,  // salary / 1000
    pub salary_max_k: u16,
    pub source_board: u8,   // source index (0-7)
    pub flags: u8,          // bit 0: has_description, bit 1: has_skills, etc.
    pub score_cache: f32,   // cached match score (0 = not computed)
    pub _pad: [u8; 8],     // pad to 32 bytes for cache-friendly access
}

pub const VECTOR_META_SIZE: usize = std::mem::size_of::<VectorMeta>();

impl VectorMeta {
    pub fn new() -> Self {
        unsafe { std::mem::zeroed() }
    }

    pub fn job_id_str(&self) -> &str {
        let end = self.job_id.iter().position(|&b| b == 0).unwrap_or(12);
        std::str::from_utf8(&self.job_id[..end]).unwrap_or("")
    }

    pub fn set_job_id(&mut self, id: &str) {
        let bytes = id.as_bytes();
        let len = bytes.len().min(12);
        self.job_id[..len].copy_from_slice(&bytes[..len]);
    }
}

impl Default for VectorMeta {
    fn default() -> Self {
        Self::new()
    }
}

/// Search filter — applied before computing similarity.
/// Bit-based for minimal branching in the hot loop.
pub struct SearchFilter {
    pub remote_only: bool,
    pub min_salary_k: u16,   // 0 = no filter
    pub max_salary_k: u16,   // 0 = no filter
    pub pipeline_stages: u8, // bitmask: bit0=discovered, bit1=qualified, etc.
    pub source_boards: u8,   // bitmask of allowed source boards (0xFF = all)
}

impl SearchFilter {
    /// No filtering — accept everything.
    pub fn all() -> Self {
        Self {
            remote_only: false,
            min_salary_k: 0,
            max_salary_k: 0,
            pipeline_stages: 0xFF,
            source_boards: 0xFF,
        }
    }

    /// Only fully remote jobs.
    pub fn remote() -> Self {
        Self {
            remote_only: true,
            ..Self::all()
        }
    }

    /// Check if a vector's metadata passes this filter.
    /// Designed for the hot loop — all comparisons are branchless-friendly.
    #[inline(always)]
    pub fn matches(&self, meta: &VectorMeta) -> bool {
        if self.remote_only && meta.remote_policy != 1 {
            return false;
        }
        if self.min_salary_k > 0 && meta.salary_max_k > 0 && meta.salary_max_k < self.min_salary_k
        {
            return false;
        }
        if self.max_salary_k > 0 && meta.salary_min_k > self.max_salary_k {
            return false;
        }
        if self.pipeline_stages != 0xFF {
            let stage_bit = 1u8 << meta.pipeline_stage;
            if stage_bit & self.pipeline_stages == 0 {
                return false;
            }
        }
        if self.source_boards != 0xFF {
            let board_bit = 1u8 << meta.source_board;
            if board_bit & self.source_boards == 0 {
                return false;
            }
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_all() {
        let f = SearchFilter::all();
        let meta = VectorMeta::new();
        assert!(f.matches(&meta));
    }

    #[test]
    fn test_filter_remote() {
        let f = SearchFilter::remote();

        let mut remote_meta = VectorMeta::new();
        remote_meta.remote_policy = 1;
        assert!(f.matches(&remote_meta));

        let mut hybrid_meta = VectorMeta::new();
        hybrid_meta.remote_policy = 2;
        assert!(!f.matches(&hybrid_meta));
    }

    #[test]
    fn test_filter_salary() {
        let f = SearchFilter {
            min_salary_k: 140,
            max_salary_k: 250,
            ..SearchFilter::all()
        };

        let mut good = VectorMeta::new();
        good.salary_min_k = 150;
        good.salary_max_k = 200;
        assert!(f.matches(&good));

        let mut low = VectorMeta::new();
        low.salary_min_k = 80;
        low.salary_max_k = 120; // max < min_filter
        assert!(!f.matches(&low));

        let mut high = VectorMeta::new();
        high.salary_min_k = 300; // min > max_filter
        high.salary_max_k = 400;
        assert!(!f.matches(&high));
    }

    #[test]
    fn test_filter_pipeline_stage() {
        let f = SearchFilter {
            pipeline_stages: 0b0000_0011, // only discovered + qualified
            ..SearchFilter::all()
        };

        let mut discovered = VectorMeta::new();
        discovered.pipeline_stage = 0;
        assert!(f.matches(&discovered));

        let mut qualified = VectorMeta::new();
        qualified.pipeline_stage = 1;
        assert!(f.matches(&qualified));

        let mut applied = VectorMeta::new();
        applied.pipeline_stage = 2;
        assert!(!f.matches(&applied));
    }

    #[test]
    fn test_meta_job_id() {
        let mut meta = VectorMeta::new();
        meta.set_job_id("job-00042");
        assert_eq!(meta.job_id_str(), "job-00042");
    }

    #[test]
    fn test_meta_size() {
        assert_eq!(VECTOR_META_SIZE, 32);
    }
}
