use ahash::AHashMap;

pub fn blocking_keys_contact(first: &str, last: &str, email: &str) -> Vec<String> {
    let mut keys = Vec::with_capacity(4);

    if let Some(domain) = email.split('@').nth(1) {
        keys.push(format!("d:{}", domain.to_lowercase()));
    }

    let first_lower = first.to_lowercase();
    let last_lower = last.to_lowercase();
    let fi = first_lower.chars().next().unwrap_or('_');
    let soundex = soundex_code(&last_lower);
    keys.push(format!("s:{}:{}", soundex, fi));

    let prefix = if last_lower.len() >= 3 { &last_lower[..3] } else { &last_lower };
    keys.push(format!("p:{}:{}", prefix, fi));

    if let Some(local) = email.split('@').next() {
        if !local.is_empty() {
            keys.push(format!("l:{}", local.to_lowercase()));
        }
    }

    keys
}

fn soundex_code(name: &str) -> String {
    if name.is_empty() { return "0000".to_string(); }

    let bytes = name.as_bytes();
    let mut code = Vec::with_capacity(4);
    code.push(bytes[0].to_ascii_uppercase());

    let map = |b: u8| -> u8 {
        match b.to_ascii_lowercase() {
            b'b' | b'f' | b'p' | b'v' => b'1',
            b'c' | b'g' | b'j' | b'k' | b'q' | b's' | b'x' | b'z' => b'2',
            b'd' | b't' => b'3',
            b'l' => b'4',
            b'm' | b'n' => b'5',
            b'r' => b'6',
            _ => b'0',
        }
    };

    let mut last = map(bytes[0]);

    for &b in &bytes[1..] {
        if code.len() >= 4 { break; }
        let mapped = map(b);
        if mapped != b'0' && mapped != last {
            code.push(mapped);
        }
        last = mapped;
    }

    while code.len() < 4 { code.push(b'0'); }

    String::from_utf8(code).unwrap_or_else(|_| "0000".to_string())
}

pub fn build_blocks(contacts: &[(String, String, String)]) -> AHashMap<String, Vec<usize>> {
    let mut blocks: AHashMap<String, Vec<usize>> = AHashMap::new();

    for (idx, (first, last, email)) in contacts.iter().enumerate() {
        for key in blocking_keys_contact(first, last, email) {
            blocks.entry(key).or_default().push(idx);
        }
    }

    blocks.retain(|_, v| v.len() > 1);

    blocks
}

pub fn sorted_neighborhood_compare<F>(
    block: &mut [usize],
    sort_key: &dyn Fn(usize) -> String,
    window: usize,
    compare: &F,
) -> Vec<(usize, usize)>
where
    F: Fn(usize, usize) -> bool,
{
    block.sort_by_key(|a| sort_key(*a));

    let mut pairs = Vec::new();

    for i in 0..block.len() {
        let end = (i + window).min(block.len());
        for j in (i + 1)..end {
            if compare(block[i], block[j]) {
                pairs.push((block[i], block[j]));
            }
        }
    }

    pairs
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blocking_keys_basic() {
        let keys = blocking_keys_contact("John", "Smith", "john.smith@example.com");
        assert_eq!(keys.len(), 4);
        assert!(keys.contains(&"d:example.com".to_string()));
        assert!(keys.contains(&"l:john.smith".to_string()));
        // Soundex of "smith" = S530, first initial = j
        assert!(keys.iter().any(|k| k.starts_with("s:") && k.ends_with(":j")));
        // Prefix of "smith" (first 3 chars) = smi
        assert!(keys.contains(&"p:smi:j".to_string()));
    }

    #[test]
    fn test_blocking_keys_no_domain() {
        let keys = blocking_keys_contact("Jane", "Doe", "nodomain");
        // No @ sign means no domain key, no local-part key (the whole thing IS the local part)
        // Should still have soundex and prefix keys
        assert!(keys.iter().any(|k| k.starts_with("s:")));
        assert!(keys.iter().any(|k| k.starts_with("p:")));
    }

    #[test]
    fn test_soundex_known_values() {
        // Standard Soundex test vectors
        assert_eq!(soundex_code("robert"), "R163");
        assert_eq!(soundex_code("smith"), "S530");
        assert_eq!(soundex_code(""), "0000");
    }

    #[test]
    fn test_build_blocks_groups_correctly() {
        let contacts = vec![
            ("John".into(), "Smith".into(), "john@example.com".into()),
            ("Jane".into(), "Smith".into(), "jane@example.com".into()),
            ("Bob".into(), "Jones".into(), "bob@other.com".into()),
        ];
        let blocks = build_blocks(&contacts);
        // John and Jane share domain "example.com"
        assert!(blocks.values().any(|indices| indices.contains(&0) && indices.contains(&1)));
    }

    #[test]
    fn test_build_blocks_no_singletons() {
        let contacts = vec![
            ("Alice".into(), "Unique".into(), "alice@unique.com".into()),
        ];
        let blocks = build_blocks(&contacts);
        // Single contact => all blocks have size 1 => all removed
        assert!(blocks.is_empty());
    }

    #[test]
    fn test_sorted_neighborhood_compare() {
        let mut block = vec![0, 1, 2, 3];
        let names = ["Alice", "Bob", "Charlie", "David"];
        let sort_key = |i: usize| names[i].to_string();
        let compare = |a: usize, b: usize| a != b; // all pairs match

        let pairs = sorted_neighborhood_compare(&mut block, &sort_key, 2, &compare);
        // Window=2: only consecutive pairs after sorting
        // Sorted by name: Alice(0), Bob(1), Charlie(2), David(3)
        // Window=2 means i compares with i+1 only
        assert!(!pairs.is_empty());
        assert!(pairs.len() <= 3); // at most 3 adjacent pairs
    }
}
