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
