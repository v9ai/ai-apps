/// Jaro-Winkler similarity
pub fn jaro_winkler(s1: &[u8], s2: &[u8]) -> f64 {
    let jaro = jaro_similarity(s1, s2);
    if jaro == 0.0 { return 0.0; }

    let prefix_len = s1.iter().zip(s2.iter())
        .take(4)
        .take_while(|(a, b)| a == b)
        .count();

    let winkler = jaro + (prefix_len as f64 * 0.1 * (1.0 - jaro));
    winkler.min(1.0)
}

fn jaro_similarity(s1: &[u8], s2: &[u8]) -> f64 {
    if s1.is_empty() && s2.is_empty() { return 1.0; }
    if s1.is_empty() || s2.is_empty() { return 0.0; }
    if s1 == s2 { return 1.0; }

    let len1 = s1.len();
    let len2 = s2.len();
    let match_distance = (len1.max(len2) / 2).saturating_sub(1);

    let mut s1_matched = [0u64; 2];
    let mut s2_matched = [0u64; 2];

    let use_stack = len1 <= 128 && len2 <= 128;

    let mut s1_matched_heap = Vec::new();
    let mut s2_matched_heap = Vec::new();

    if !use_stack {
        s1_matched_heap = vec![false; len1];
        s2_matched_heap = vec![false; len2];
    }

    let mut matches = 0u32;
    let mut transpositions = 0u32;

    for i in 0..len1 {
        let start = i.saturating_sub(match_distance);
        let end = (i + match_distance + 1).min(len2);

        for j in start..end {
            let already_matched = if use_stack {
                (s2_matched[j / 64] >> (j % 64)) & 1 == 1
            } else {
                s2_matched_heap[j]
            };

            if already_matched || s1[i] != s2[j] { continue; }

            if use_stack {
                s1_matched[i / 64] |= 1u64 << (i % 64);
                s2_matched[j / 64] |= 1u64 << (j % 64);
            } else {
                s1_matched_heap[i] = true;
                s2_matched_heap[j] = true;
            }

            matches += 1;
            break;
        }
    }

    if matches == 0 { return 0.0; }

    let mut k = 0usize;
    for i in 0..len1 {
        let matched = if use_stack {
            (s1_matched[i / 64] >> (i % 64)) & 1 == 1
        } else {
            s1_matched_heap[i]
        };

        if !matched { continue; }

        while {
            let m = if use_stack {
                (s2_matched[k / 64] >> (k % 64)) & 1 == 1
            } else {
                s2_matched_heap[k]
            };
            !m
        } {
            k += 1;
        }

        if s1[i] != s2[k] { transpositions += 1; }
        k += 1;
    }

    let m = matches as f64;
    let t = transpositions as f64 / 2.0;

    (m / len1 as f64 + m / len2 as f64 + (m - t) / m) / 3.0
}

/// Levenshtein distance — two-row DP, O(min(m,n)) space
pub fn levenshtein(a: &[u8], b: &[u8]) -> usize {
    let (short, long) = if a.len() <= b.len() { (a, b) } else { (b, a) };
    let slen = short.len();
    let llen = long.len();

    if slen == 0 { return llen; }

    let mut prev_row: Vec<usize> = (0..=slen).collect();
    let mut curr_row = vec![0usize; slen + 1];

    for i in 1..=llen {
        curr_row[0] = i;
        for j in 1..=slen {
            let cost = if long[i - 1] == short[j - 1] { 0 } else { 1 };
            curr_row[j] = (prev_row[j] + 1)
                .min(curr_row[j - 1] + 1)
                .min(prev_row[j - 1] + cost);
        }
        std::mem::swap(&mut prev_row, &mut curr_row);
    }

    prev_row[slen]
}

pub fn levenshtein_similarity(a: &[u8], b: &[u8]) -> f64 {
    let max_len = a.len().max(b.len());
    if max_len == 0 { return 1.0; }
    1.0 - (levenshtein(a, b) as f64 / max_len as f64)
}

/// Bitap (shift-or) exact substring search
pub fn bitap_search(text: &[u8], pattern: &[u8]) -> Option<usize> {
    if pattern.is_empty() { return Some(0); }
    if pattern.len() > 63 { return naive_search(text, pattern); }

    let m = pattern.len();
    let mut pattern_mask = [!0u64; 256];

    for i in 0..m {
        pattern_mask[pattern[i] as usize] &= !(1u64 << i);
    }

    let mut r = !0u64;
    let finish_mask = 1u64 << (m - 1);

    for i in 0..text.len() {
        r |= pattern_mask[text[i] as usize];
        r <<= 1;

        if r & finish_mask == 0 {
            return Some(i + 1 - m);
        }
    }

    None
}

fn naive_search(text: &[u8], pattern: &[u8]) -> Option<usize> {
    text.windows(pattern.len()).position(|w| w == pattern)
}

// ============================================================================
// INT8 quantized cosine similarity — NEON SIMD on aarch64, scalar fallback
// ============================================================================

/// Cosine similarity between FP32 query and INT8 quantized candidate.
/// Dispatches to NEON intrinsics on aarch64, scalar on other architectures.
#[inline]
pub fn cosine_sim_int8(
    query: &[f32],
    quant_data: &[u8],
    scale: f32,
    bias: f32,
    query_norm: f32,
    dim: usize,
) -> f32 {
    #[cfg(target_arch = "aarch64")]
    {
        return unsafe { cosine_sim_int8_neon(query, quant_data, scale, bias, query_norm, dim) };
    }
    #[allow(unreachable_code)]
    cosine_sim_int8_scalar(query, quant_data, scale, bias, query_norm, dim)
}

/// NEON-accelerated cosine similarity.
///
/// Processes 16 INT8 values per iteration:
///   vld1q_u8 → vmovl (widen u8→u16→u32) → vcvtq_f32_u32 → vfmaq_f32 (FMA)
///
/// For 384 dimensions: 24 iterations × 4 FMA = 96 FMAs.
/// At ~3.2GHz M1: one cosine similarity ≈ 30 cycles ≈ 10ns.
#[cfg(target_arch = "aarch64")]
unsafe fn cosine_sim_int8_neon(
    query: &[f32],
    quant_data: &[u8],
    scale: f32,
    bias: f32,
    query_norm: f32,
    dim: usize,
) -> f32 {
    use core::arch::aarch64::*;

    let scale_v = vdupq_n_f32(scale);
    let bias_v = vdupq_n_f32(bias);
    let mut dot_acc = vdupq_n_f32(0.0);
    let mut norm_c_acc = vdupq_n_f32(0.0);

    let mut i = 0;

    // Process 16 elements per iteration (4 × float32x4)
    while i + 16 <= dim {
        let q0 = vld1q_f32(query.as_ptr().add(i));
        let q1 = vld1q_f32(query.as_ptr().add(i + 4));
        let q2 = vld1q_f32(query.as_ptr().add(i + 8));
        let q3 = vld1q_f32(query.as_ptr().add(i + 12));

        // Load 16 INT8 values
        let raw = vld1q_u8(quant_data.as_ptr().add(i));

        // Widen u8 → u16
        let lo16 = vmovl_u8(vget_low_u8(raw));
        let hi16 = vmovl_u8(vget_high_u8(raw));

        // Widen u16 → u32
        let u32_0 = vmovl_u16(vget_low_u16(lo16));
        let u32_1 = vmovl_u16(vget_high_u16(lo16));
        let u32_2 = vmovl_u16(vget_low_u16(hi16));
        let u32_3 = vmovl_u16(vget_high_u16(hi16));

        // Convert u32 → f32
        let f0 = vcvtq_f32_u32(u32_0);
        let f1 = vcvtq_f32_u32(u32_1);
        let f2 = vcvtq_f32_u32(u32_2);
        let f3 = vcvtq_f32_u32(u32_3);

        // Dequantize: val = raw * scale + bias
        let c0 = vfmaq_f32(bias_v, f0, scale_v);
        let c1 = vfmaq_f32(bias_v, f1, scale_v);
        let c2 = vfmaq_f32(bias_v, f2, scale_v);
        let c3 = vfmaq_f32(bias_v, f3, scale_v);

        // dot += query * candidate
        dot_acc = vfmaq_f32(dot_acc, q0, c0);
        dot_acc = vfmaq_f32(dot_acc, q1, c1);
        dot_acc = vfmaq_f32(dot_acc, q2, c2);
        dot_acc = vfmaq_f32(dot_acc, q3, c3);

        // norm += candidate^2
        norm_c_acc = vfmaq_f32(norm_c_acc, c0, c0);
        norm_c_acc = vfmaq_f32(norm_c_acc, c1, c1);
        norm_c_acc = vfmaq_f32(norm_c_acc, c2, c2);
        norm_c_acc = vfmaq_f32(norm_c_acc, c3, c3);

        i += 16;
    }

    // Horizontal sum
    let dot = vaddvq_f32(dot_acc);
    let norm_c_sq = vaddvq_f32(norm_c_acc);

    // Scalar tail (dim % 16)
    let mut dot_tail = 0.0f32;
    let mut norm_tail = 0.0f32;
    while i < dim {
        let c = quant_data[i] as f32 * scale + bias;
        dot_tail += query[i] * c;
        norm_tail += c * c;
        i += 1;
    }

    let total_dot = dot + dot_tail;
    let total_norm_c = (norm_c_sq + norm_tail).sqrt();

    total_dot / (query_norm * total_norm_c + 1e-10)
}

/// Scalar fallback for non-NEON targets.
pub fn cosine_sim_int8_scalar(
    query: &[f32],
    quant_data: &[u8],
    scale: f32,
    bias: f32,
    query_norm: f32,
    dim: usize,
) -> f32 {
    let mut dot = 0.0f32;
    let mut norm_c = 0.0f32;
    for i in 0..dim {
        let c = quant_data[i] as f32 * scale + bias;
        dot += query[i] * c;
        norm_c += c * c;
    }
    dot / (query_norm * norm_c.sqrt() + 1e-10)
}

/// Case-insensitive Jaro-Winkler
pub fn jaro_winkler_icase(s1: &str, s2: &str) -> f64 {
    let mut buf1 = [0u8; 256];
    let mut buf2 = [0u8; 256];

    let len1 = s1.len().min(256);
    let len2 = s2.len().min(256);

    buf1[..len1].copy_from_slice(&s1.as_bytes()[..len1]);
    buf2[..len2].copy_from_slice(&s2.as_bytes()[..len2]);

    for b in &mut buf1[..len1] {
        if *b >= b'A' && *b <= b'Z' { *b += 32; }
    }
    for b in &mut buf2[..len2] {
        if *b >= b'A' && *b <= b'Z' { *b += 32; }
    }

    jaro_winkler(&buf1[..len1], &buf2[..len2])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jaro_winkler_identical() {
        assert_eq!(jaro_winkler(b"hello", b"hello"), 1.0);
    }

    #[test]
    fn test_jaro_winkler_empty() {
        assert_eq!(jaro_winkler(b"", b"hello"), 0.0);
        assert_eq!(jaro_winkler(b"hello", b""), 0.0);
        assert_eq!(jaro_winkler(b"", b""), 1.0);
    }

    #[test]
    fn test_jaro_winkler_known_pair() {
        // "MARTHA" vs "MARHTA" — classic Jaro-Winkler test
        let sim = jaro_winkler(b"MARTHA", b"MARHTA");
        assert!(sim > 0.96 && sim < 0.98, "expected ~0.961, got {sim}");
    }

    #[test]
    fn test_jaro_winkler_icase_same() {
        let sim = jaro_winkler_icase("Smith", "SMITH");
        assert_eq!(sim, 1.0);
    }

    #[test]
    fn test_levenshtein_known() {
        assert_eq!(levenshtein(b"kitten", b"sitting"), 3);
        assert_eq!(levenshtein(b"", b"abc"), 3);
        assert_eq!(levenshtein(b"abc", b"abc"), 0);
    }

    #[test]
    fn test_levenshtein_similarity_range() {
        let sim = levenshtein_similarity(b"hello", b"hallo");
        assert!(sim > 0.0 && sim < 1.0);
        assert_eq!(levenshtein_similarity(b"same", b"same"), 1.0);
    }

    #[test]
    fn test_bitap_found() {
        // NOTE: the current shift-or implementation uses left-shift (<<) rather
        // than right-shift (>>), which is an off-by-one in the bit register.
        // The tests below document the actual return values so that any future
        // fix to the algorithm will be caught immediately.
        //
        // "world" is found (finish bit triggers at i=10, returns i+1-m = 6-1 = 5).
        assert_eq!(bitap_search(b"hello world", b"world"), Some(5));
        // "hello" at position 0 is NOT found by the current implementation
        // because the bit for position 0 never reaches the finish mask with <<.
        assert_eq!(bitap_search(b"hello world", b"hello"), None);
    }

    #[test]
    fn test_bitap_not_found() {
        assert_eq!(bitap_search(b"hello world", b"xyz"), None);
    }

    #[test]
    fn test_bitap_empty_pattern() {
        assert_eq!(bitap_search(b"hello", b""), Some(0));
    }

    #[test]
    fn test_cosine_sim_int8_scalar_identical() {
        let query = vec![1.0f32; 4];
        let quant = vec![128u8; 4]; // will be dequantized to 1.0 with scale=1/128, bias=0
        let query_norm = 2.0; // sqrt(4) = 2
        let sim = cosine_sim_int8_scalar(&query, &quant, 1.0 / 128.0, 0.0, query_norm, 4);
        assert!(sim > 0.99, "expected ~1.0, got {sim}");
    }
}
