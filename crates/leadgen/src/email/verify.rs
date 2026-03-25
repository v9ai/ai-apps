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
