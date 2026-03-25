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
        let start = if i > match_distance { i - match_distance } else { 0 };
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
