#[derive(Debug, Clone, Copy)]
pub enum Segment {
    FirstFull,
    FirstInitial,
    LastFull,
    LastInitial,
    Literal(u8),
}

#[derive(Debug, Clone)]
pub struct CompiledPattern {
    pub segments: Vec<Segment>,
}

impl CompiledPattern {
    pub fn compile(pattern: &str) -> Self {
        let mut segments = Vec::new();

        let parts: Vec<&str> = pattern.split(|c| c == '.' || c == '-' || c == '_').collect();
        let separators: Vec<char> = pattern.chars().filter(|c| *c == '.' || *c == '-' || *c == '_').collect();

        for (i, part) in parts.iter().enumerate() {
            match *part {
                "first" => segments.push(Segment::FirstFull),
                "last" => segments.push(Segment::LastFull),
                "f" => segments.push(Segment::FirstInitial),
                "l" => segments.push(Segment::LastInitial),
                "flast" => {
                    segments.push(Segment::FirstInitial);
                    segments.push(Segment::LastFull);
                }
                "firstlast" => {
                    segments.push(Segment::FirstFull);
                    segments.push(Segment::LastFull);
                }
                "lastf" => {
                    segments.push(Segment::LastFull);
                    segments.push(Segment::FirstInitial);
                }
                _ => {
                    for b in part.bytes() {
                        segments.push(Segment::Literal(b));
                    }
                }
            }

            if i < separators.len() {
                segments.push(Segment::Literal(separators[i] as u8));
            }
        }

        Self { segments }
    }

    pub fn generate_into<'a>(
        &self, first: &str, last: &str, domain: &str, buf: &'a mut [u8],
    ) -> Option<&'a str> {
        let mut pos = 0;

        let first_bytes = first.as_bytes();
        let last_bytes = last.as_bytes();

        for seg in &self.segments {
            match seg {
                Segment::FirstFull => {
                    for &b in first_bytes {
                        if pos >= buf.len() { return None; }
                        buf[pos] = b.to_ascii_lowercase();
                        pos += 1;
                    }
                }
                Segment::FirstInitial => {
                    if first_bytes.is_empty() || pos >= buf.len() { return None; }
                    buf[pos] = first_bytes[0].to_ascii_lowercase();
                    pos += 1;
                }
                Segment::LastFull => {
                    for &b in last_bytes {
                        if pos >= buf.len() { return None; }
                        buf[pos] = b.to_ascii_lowercase();
                        pos += 1;
                    }
                }
                Segment::LastInitial => {
                    if last_bytes.is_empty() || pos >= buf.len() { return None; }
                    buf[pos] = last_bytes[0].to_ascii_lowercase();
                    pos += 1;
                }
                Segment::Literal(b) => {
                    if pos >= buf.len() { return None; }
                    buf[pos] = *b;
                    pos += 1;
                }
            }
        }

        // Append @domain
        if !domain.is_empty() {
            if pos >= buf.len() { return None; }
            buf[pos] = b'@';
            pos += 1;

            for &b in domain.as_bytes() {
                if pos >= buf.len() { return None; }
                buf[pos] = b;
                pos += 1;
            }
        }

        std::str::from_utf8(&buf[..pos]).ok()
    }

    pub fn matches(&self, email: &str, first: &str, last: &str) -> bool {
        let mut buf = [0u8; 256];
        if let Some(generated) = self.generate_into(first, last, "", &mut buf) {
            let local = email.split('@').next().unwrap_or("");
            local == generated
        } else {
            false
        }
    }
}

pub fn all_patterns() -> Vec<(&'static str, CompiledPattern)> {
    vec![
        ("first.last", CompiledPattern::compile("first.last")),
        ("flast", CompiledPattern { segments: vec![Segment::FirstInitial, Segment::LastFull] }),
        ("first", CompiledPattern { segments: vec![Segment::FirstFull] }),
        ("last.first", CompiledPattern::compile("last.first")),
        ("firstlast", CompiledPattern { segments: vec![Segment::FirstFull, Segment::LastFull] }),
        ("first-last", CompiledPattern::compile("first-last")),
        ("f.last", CompiledPattern::compile("f.last")),
        ("lastf", CompiledPattern { segments: vec![Segment::LastFull, Segment::FirstInitial] }),
        ("first.l", CompiledPattern::compile("first.l")),
    ]
}

pub fn infer_pattern<'a>(
    known: &[(String, String, String)],
    patterns: &'a [(&'static str, CompiledPattern)],
) -> Option<(&'a str, f64)> {
    if known.is_empty() { return None; }

    let mut best_name = "";
    let mut best_score = 0.0f64;
    let mut buf = [0u8; 256];

    for (name, pattern) in patterns {
        let mut matches = 0usize;
        for (first, last, email) in known {
            let domain = email.split('@').nth(1).unwrap_or("");
            if let Some(generated) = pattern.generate_into(first, last, domain, &mut buf) {
                if generated == email.as_str() {
                    matches += 1;
                }
            }
        }

        let score = matches as f64 / known.len() as f64;
        if score > best_score {
            best_score = score;
            best_name = name;
        }
    }

    if best_score > 0.0 { Some((best_name, best_score)) } else { None }
}
