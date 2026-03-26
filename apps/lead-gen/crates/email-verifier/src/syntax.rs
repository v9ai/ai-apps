use std::collections::HashMap;

static TYPO_MAP: std::sync::OnceLock<HashMap<&'static str, &'static str>> =
    std::sync::OnceLock::new();

fn typo_map() -> &'static HashMap<&'static str, &'static str> {
    TYPO_MAP.get_or_init(|| {
        [
            ("gmial.com", "gmail.com"),
            ("gmal.com", "gmail.com"),
            ("gamil.com", "gmail.com"),
            ("gnail.com", "gmail.com"),
            ("gmaill.com", "gmail.com"),
            ("gmail.con", "gmail.com"),
            ("gmail.co", "gmail.com"),
            ("gmail.cmo", "gmail.com"),
            ("gogglemail.com", "googlemail.com"),
            ("googlemail.con", "googlemail.com"),
            ("hotmal.com", "hotmail.com"),
            ("hotmial.com", "hotmail.com"),
            ("hotmil.com", "hotmail.com"),
            ("htomail.com", "hotmail.com"),
            ("hotmail.con", "hotmail.com"),
            ("hotmail.co", "hotmail.com"),
            ("hotmail.cmo", "hotmail.com"),
            ("outlok.com", "outlook.com"),
            ("outloook.com", "outlook.com"),
            ("outlook.con", "outlook.com"),
            ("outllok.com", "outlook.com"),
            ("yaho.com", "yahoo.com"),
            ("yahooo.com", "yahoo.com"),
            ("yahoo.con", "yahoo.com"),
            ("yhaoo.com", "yahoo.com"),
            ("iclod.com", "icloud.com"),
            ("icloud.con", "icloud.com"),
            ("protonmial.com", "protonmail.com"),
            ("protonmal.com", "protonmail.com"),
            ("protonmail.con", "protonmail.com"),
        ]
        .into()
    })
}

/// Basic format validation — no regex, pure char checks.
/// Follows practical subset of RFC 5321/5322.
pub fn is_valid_format(email: &str) -> bool {
    if email.len() > 254 {
        return false;
    }

    let Some(at_pos) = email.rfind('@') else {
        return false;
    };

    let local = &email[..at_pos];
    let domain = &email[at_pos + 1..];

    if local.is_empty() || local.len() > 64 {
        return false;
    }

    // Local part: allowed printable ASCII minus control chars; no consecutive dots
    if local.starts_with('.') || local.ends_with('.') || local.contains("..") {
        return false;
    }
    if !local
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || "!#$%&'*+/=?^_`{|}~-.".contains(c))
    {
        return false;
    }

    // Domain: at least one dot, labels separated by dots
    if domain.is_empty() || !domain.contains('.') {
        return false;
    }

    domain.split('.').all(|label| {
        !label.is_empty()
            && label.len() <= 63
            && label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
            && !label.starts_with('-')
            && !label.ends_with('-')
    })
}

/// Returns a suggested correction if the domain is a well-known typo.
pub fn check_typo(email: &str) -> Option<String> {
    let at = email.rfind('@')?;
    let domain = &email[at + 1..];
    let local = &email[..at];
    let correction = typo_map().get(domain.to_lowercase().as_str())?;
    Some(format!("{local}@{correction}"))
}

/// Extract domain part from a (pre-validated) email address.
pub fn extract_domain(email: &str) -> Option<&str> {
    let at = email.rfind('@')?;
    Some(&email[at + 1..])
}

/// Extract local part from a (pre-validated) email address.
pub fn extract_local(email: &str) -> Option<&str> {
    let at = email.rfind('@')?;
    Some(&email[..at])
}
