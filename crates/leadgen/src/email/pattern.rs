#[derive(Debug, Clone, PartialEq)]
pub enum EmailPattern {
    FirstDotLast, FirstInitialLast, First, LastDotFirst,
    FirstLastNoSep, FirstDashLast, FirstInitialDotLast,
    LastFirstInitial, FirstDotLastInitial,
}

impl EmailPattern {
    pub fn all() -> Vec<Self> {
        vec![Self::FirstDotLast, Self::FirstInitialLast, Self::First,
             Self::LastDotFirst, Self::FirstLastNoSep, Self::FirstDashLast,
             Self::FirstInitialDotLast, Self::LastFirstInitial, Self::FirstDotLastInitial]
    }

    pub fn generate(&self, first: &str, last: &str, domain: &str) -> String {
        let f = first.to_lowercase().replace(' ', "");
        let l = last.to_lowercase().replace(' ', "");
        let domain = &domain.to_lowercase();
        let fi = f.chars().next().map(|c| c.to_string()).unwrap_or_default();
        let li = l.chars().next().map(|c| c.to_string()).unwrap_or_default();
        let local = match self {
            Self::FirstDotLast => format!("{}.{}", f, l),
            Self::FirstInitialLast => format!("{}{}", fi, l),
            Self::First => f.clone(),
            Self::LastDotFirst => format!("{}.{}", l, f),
            Self::FirstLastNoSep => format!("{}{}", f, l),
            Self::FirstDashLast => format!("{}-{}", f, l),
            Self::FirstInitialDotLast => format!("{}.{}", fi, l),
            Self::LastFirstInitial => format!("{}{}", l, fi),
            Self::FirstDotLastInitial => format!("{}.{}", f, li),
        };
        format!("{}@{}", local, domain)
    }

    pub fn to_str(&self) -> &str {
        match self {
            Self::FirstDotLast => "first.last", Self::FirstInitialLast => "flast",
            Self::First => "first", Self::LastDotFirst => "last.first",
            Self::FirstLastNoSep => "firstlast", Self::FirstDashLast => "first-last",
            Self::FirstInitialDotLast => "f.last", Self::LastFirstInitial => "lastf",
            Self::FirstDotLastInitial => "first.l",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "first.last" => Self::FirstDotLast, "flast" => Self::FirstInitialLast,
            "first" => Self::First, "last.first" => Self::LastDotFirst,
            "firstlast" => Self::FirstLastNoSep, "first-last" => Self::FirstDashLast,
            "f.last" => Self::FirstInitialDotLast, "lastf" => Self::LastFirstInitial,
            "first.l" => Self::FirstDotLastInitial, _ => Self::FirstDotLast,
        }
    }

    pub fn all_candidates(first: &str, last: &str, domain: &str) -> Vec<String> {
        Self::all().iter().map(|p| p.generate(first, last, domain)).collect()
    }

    pub fn infer(known: &[(String, String, String)]) -> Option<(EmailPattern, f64)> {
        if known.is_empty() { return None; }
        let mut best: Option<(EmailPattern, f64)> = None;
        for pattern in &Self::all() {
            let matches = known.iter().filter(|(first, last, email)| {
                let domain = email.split('@').nth(1).unwrap_or("");
                pattern.generate(first, last, domain) == *email
            }).count();
            let confidence = matches as f64 / known.len() as f64;
            if confidence > best.as_ref().map_or(0.0, |b| b.1) {
                best = Some((pattern.clone(), confidence));
            }
        }
        best
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(v: &str) -> String { v.to_string() }

    // --- generate ---

    #[test]
    fn first_dot_last() {
        assert_eq!(EmailPattern::FirstDotLast.generate("John", "Doe", "acme.com"), "john.doe@acme.com");
    }

    #[test]
    fn first_initial_last() {
        assert_eq!(EmailPattern::FirstInitialLast.generate("John", "Doe", "acme.com"), "jdoe@acme.com");
    }

    #[test]
    fn first_only() {
        assert_eq!(EmailPattern::First.generate("John", "Doe", "acme.com"), "john@acme.com");
    }

    #[test]
    fn last_dot_first() {
        assert_eq!(EmailPattern::LastDotFirst.generate("John", "Doe", "acme.com"), "doe.john@acme.com");
    }

    #[test]
    fn first_last_no_sep() {
        assert_eq!(EmailPattern::FirstLastNoSep.generate("John", "Doe", "acme.com"), "johndoe@acme.com");
    }

    #[test]
    fn first_dash_last() {
        assert_eq!(EmailPattern::FirstDashLast.generate("John", "Doe", "acme.com"), "john-doe@acme.com");
    }

    #[test]
    fn first_initial_dot_last() {
        assert_eq!(EmailPattern::FirstInitialDotLast.generate("John", "Doe", "acme.com"), "j.doe@acme.com");
    }

    #[test]
    fn last_first_initial() {
        assert_eq!(EmailPattern::LastFirstInitial.generate("John", "Doe", "acme.com"), "doej@acme.com");
    }

    #[test]
    fn first_dot_last_initial() {
        assert_eq!(EmailPattern::FirstDotLastInitial.generate("John", "Doe", "acme.com"), "john.d@acme.com");
    }

    #[test]
    fn generate_lowercases_input() {
        assert_eq!(EmailPattern::FirstDotLast.generate("ALICE", "SMITH", "Example.COM"), "alice.smith@example.com");
    }

    #[test]
    fn generate_strips_spaces_from_name() {
        // compound first name "Jean Paul" → "jeanpaul"
        assert_eq!(EmailPattern::FirstLastNoSep.generate("Jean Paul", "Doe", "acme.com"), "jeanpauldoe@acme.com");
    }

    // --- to_str / from_str roundtrip ---

    #[test]
    fn to_str_from_str_roundtrip() {
        for p in EmailPattern::all() {
            assert_eq!(EmailPattern::from_str(p.to_str()), p);
        }
    }

    #[test]
    fn from_str_unknown_defaults_to_first_dot_last() {
        assert_eq!(EmailPattern::from_str("unknown_pattern"), EmailPattern::FirstDotLast);
    }

    // --- all / all_candidates ---

    #[test]
    fn all_returns_nine_patterns() {
        assert_eq!(EmailPattern::all().len(), 9);
    }

    #[test]
    fn all_candidates_returns_nine_emails() {
        let candidates = EmailPattern::all_candidates("John", "Doe", "acme.com");
        assert_eq!(candidates.len(), 9);
    }

    #[test]
    fn all_candidates_all_end_with_domain() {
        for email in EmailPattern::all_candidates("Jane", "Smith", "corp.io") {
            assert!(email.ends_with("@corp.io"), "expected @corp.io in {}", email);
        }
    }

    // --- infer ---

    #[test]
    fn infer_empty_returns_none() {
        assert!(EmailPattern::infer(&[]).is_none());
    }

    #[test]
    fn infer_unanimous_first_dot_last() {
        let known = vec![
            (s("John"), s("Doe"), s("john.doe@acme.com")),
            (s("Alice"), s("Smith"), s("alice.smith@acme.com")),
            (s("Bob"), s("Jones"), s("bob.jones@acme.com")),
        ];
        let (pattern, confidence) = EmailPattern::infer(&known).unwrap();
        assert_eq!(pattern, EmailPattern::FirstDotLast);
        assert!((confidence - 1.0).abs() < 1e-9);
    }

    #[test]
    fn infer_majority_wins() {
        // 2 first.last, 1 first (which matches First pattern)
        let known = vec![
            (s("John"), s("Doe"), s("john.doe@acme.com")),
            (s("Alice"), s("Smith"), s("alice.smith@acme.com")),
            (s("Bob"), s("Jones"), s("bob@acme.com")),
        ];
        let (pattern, confidence) = EmailPattern::infer(&known).unwrap();
        assert_eq!(pattern, EmailPattern::FirstDotLast);
        assert!((confidence - 2.0 / 3.0).abs() < 1e-9);
    }

    #[test]
    fn infer_detects_flast() {
        let known = vec![
            (s("John"), s("Doe"), s("jdoe@corp.com")),
            (s("Alice"), s("Smith"), s("asmith@corp.com")),
        ];
        let (pattern, _) = EmailPattern::infer(&known).unwrap();
        assert_eq!(pattern, EmailPattern::FirstInitialLast);
    }
}
