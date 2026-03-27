use anyhow::Result;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;

#[derive(Debug, Clone, PartialEq)]
pub enum SmtpResult { Valid, Invalid, CatchAll, Timeout }

pub async fn verify_smtp(email: &str, mx_host: &str) -> Result<SmtpResult> {
    let our_domain = "verify.leadgen.local";
    let addr = format!("{}:25", mx_host);
    let stream = match tokio::time::timeout(Duration::from_secs(10), TcpStream::connect(&addr)).await {
        Ok(Ok(s)) => s, _ => return Ok(SmtpResult::Timeout),
    };

    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::new(reader);

    async fn read_resp(r: &mut BufReader<tokio::net::tcp::OwnedReadHalf>) -> Result<u16> {
        let mut full = String::new();
        loop {
            let mut line = String::new();
            match tokio::time::timeout(Duration::from_secs(10), r.read_line(&mut line)).await {
                Ok(Ok(0)) => return Err(anyhow::anyhow!("closed")),
                Ok(Ok(_)) => { full.push_str(&line);
                    if line.len() >= 4 && line.as_bytes()[3] == b' ' {
                        return Ok(line[..3].parse().unwrap_or(0)); } }
                _ => return Err(anyhow::anyhow!("timeout")),
            }
        }
    }

    async fn send(w: &mut tokio::net::tcp::OwnedWriteHalf, cmd: &str) -> Result<()> {
        w.write_all(cmd.as_bytes()).await?; w.write_all(b"\r\n").await?; w.flush().await?; Ok(())
    }

    let code = read_resp(&mut reader).await?;
    if code != 220 { return Ok(SmtpResult::Timeout); }

    send(&mut writer, &format!("EHLO {}", our_domain)).await?;
    if read_resp(&mut reader).await? != 250 { return Ok(SmtpResult::Timeout); }

    send(&mut writer, &format!("MAIL FROM:<verify@{}>", our_domain)).await?;
    if read_resp(&mut reader).await? != 250 { let _ = send(&mut writer, "QUIT").await; return Ok(SmtpResult::Timeout); }

    send(&mut writer, &format!("RCPT TO:<{}>", email)).await?;
    let code = read_resp(&mut reader).await?;

    let result = match code {
        250 => {
            send(&mut writer, "RSET").await?; let _ = read_resp(&mut reader).await;
            send(&mut writer, &format!("MAIL FROM:<verify@{}>", our_domain)).await?;
            let _ = read_resp(&mut reader).await;
            let random = format!("xyzcheck{}@{}", &uuid::Uuid::new_v4().to_string()[..8],
                email.split('@').nth(1).unwrap_or("x"));
            send(&mut writer, &format!("RCPT TO:<{}>", random)).await?;
            if read_resp(&mut reader).await? == 250 { SmtpResult::CatchAll } else { SmtpResult::Valid }
        }
        550 | 551 | 552 | 553 | 554 => SmtpResult::Invalid,
        252 => SmtpResult::CatchAll,
        _ => SmtpResult::Timeout,
    };

    let _ = send(&mut writer, "QUIT").await;
    Ok(result)
}

pub fn is_valid_syntax(email: &str) -> bool {
    regex::Regex::new(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$").unwrap().is_match(email)
}

pub fn is_role_based(email: &str) -> bool {
    let local = email.split('@').next().unwrap_or("");
    ["info","support","admin","sales","contact","hello","help","team","office","mail",
     "webmaster","postmaster","abuse","noreply","no-reply","marketing","billing","hr"]
        .contains(&local.to_lowercase().as_str())
}

pub fn is_disposable_domain(domain: &str) -> bool {
    ["mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
     "yopmail.com","sharklasers.com","maildrop.cc"]
        .contains(&domain.to_lowercase().as_str())
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- is_valid_syntax ---

    #[test]
    fn valid_simple_email() {
        assert!(is_valid_syntax("john@example.com"));
    }

    #[test]
    fn valid_email_with_dots_and_plus() {
        assert!(is_valid_syntax("john.doe+filter@sub.example.co.uk"));
    }

    #[test]
    fn valid_email_with_hyphens() {
        assert!(is_valid_syntax("first-last@my-company.io"));
    }

    #[test]
    fn invalid_missing_at() {
        assert!(!is_valid_syntax("johndoeexample.com"));
    }

    #[test]
    fn invalid_missing_domain() {
        assert!(!is_valid_syntax("john@"));
    }

    #[test]
    fn invalid_missing_tld() {
        assert!(!is_valid_syntax("john@example"));
    }

    #[test]
    fn invalid_double_at() {
        assert!(!is_valid_syntax("john@@example.com"));
    }

    #[test]
    fn invalid_empty_string() {
        assert!(!is_valid_syntax(""));
    }

    #[test]
    fn invalid_spaces() {
        assert!(!is_valid_syntax("john doe@example.com"));
    }

    // --- is_role_based ---

    #[test]
    fn role_based_info() {
        assert!(is_role_based("info@example.com"));
    }

    #[test]
    fn role_based_support() {
        assert!(is_role_based("support@example.com"));
    }

    #[test]
    fn role_based_noreply() {
        assert!(is_role_based("noreply@example.com"));
    }

    #[test]
    fn role_based_no_reply() {
        assert!(is_role_based("no-reply@example.com"));
    }

    #[test]
    fn role_based_hr() {
        assert!(is_role_based("hr@example.com"));
    }

    #[test]
    fn not_role_based_personal() {
        assert!(!is_role_based("john.doe@example.com"));
    }

    #[test]
    fn not_role_based_firstname() {
        assert!(!is_role_based("alice@example.com"));
    }

    // --- is_disposable_domain ---

    #[test]
    fn disposable_mailinator() {
        assert!(is_disposable_domain("mailinator.com"));
    }

    #[test]
    fn disposable_case_insensitive() {
        assert!(is_disposable_domain("Mailinator.COM"));
    }

    #[test]
    fn disposable_yopmail() {
        assert!(is_disposable_domain("yopmail.com"));
    }

    #[test]
    fn not_disposable_gmail() {
        assert!(!is_disposable_domain("gmail.com"));
    }

    #[test]
    fn not_disposable_company_domain() {
        assert!(!is_disposable_domain("acme.io"));
    }
}
