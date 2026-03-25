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
    block.sort_by(|a, b| sort_key(*a).cmp(&sort_key(*b)));

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
