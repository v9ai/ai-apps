use anyhow::Result;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::net::tcp::OwnedReadHalf;
use tokio::time::{timeout, Duration};

const SMTP_PORT: u16 = 25;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SmtpResult {
    /// RCPT TO returned 250 — mailbox accepted
    Valid,
    /// RCPT TO returned 550-559 — mailbox does not exist
    Invalid,
    /// Timeout, connection refused, unexpected code, or port blocked
    Unknown,
}

/// Probe a single email address via raw SMTP on port 25.
/// Opens a fresh TCP connection each call.
pub async fn smtp_probe(email: &str, mx_host: &str, timeout_secs: u64) -> SmtpResult {
    let t = Duration::from_secs(timeout_secs);
    match smtp_probe_inner(email, mx_host, t).await {
        Ok(result) => result,
        Err(_) => SmtpResult::Unknown,
    }
}

async fn smtp_probe_inner(email: &str, mx_host: &str, t: Duration) -> Result<SmtpResult> {
    // Strip trailing dot from DNS MX names (e.g. "mail.example.com.")
    let host = mx_host.trim_end_matches('.');

    let stream = timeout(t, TcpStream::connect((host, SMTP_PORT))).await??;
    let (read_half, mut write_half) = stream.into_split();
    let mut reader = BufReader::new(read_half);

    // 220 — service ready banner
    let code = read_response(&mut reader, t).await?;
    if code != 220 {
        return Ok(SmtpResult::Unknown);
    }

    // EHLO
    write_half.write_all(b"EHLO verify.local\r\n").await?;
    let code = read_response(&mut reader, t).await?;
    if code != 250 {
        // Fall back to HELO on servers that reject EHLO
        write_half.write_all(b"HELO verify.local\r\n").await?;
        let code = read_response(&mut reader, t).await?;
        if code != 250 {
            return Ok(SmtpResult::Unknown);
        }
    }

    // MAIL FROM with empty reverse-path (RFC 5321 §4.5.5 — standard for probing)
    write_half.write_all(b"MAIL FROM:<>\r\n").await?;
    let code = read_response(&mut reader, t).await?;
    if code != 250 {
        return Ok(SmtpResult::Unknown);
    }

    // RCPT TO — the key check
    let rcpt = format!("RCPT TO:<{email}>\r\n");
    write_half.write_all(rcpt.as_bytes()).await?;
    let code = read_response(&mut reader, t).await?;

    // QUIT — best-effort, ignore errors
    let _ = write_half.write_all(b"QUIT\r\n").await;

    Ok(match code {
        250 => SmtpResult::Valid,
        // 5xx permanent rejections for unknown mailbox
        550..=559 => SmtpResult::Invalid,
        _ => SmtpResult::Unknown,
    })
}

/// Read a (possibly multi-line) SMTP response and return the final status code.
///
/// Multi-line format:  "NNN-text\r\n" (hyphen = more lines follow)
/// Final line format:  "NNN text\r\n" or "NNN\r\n" (space or end = last line)
async fn read_response(reader: &mut BufReader<OwnedReadHalf>, t: Duration) -> Result<u16> {
    let mut last_code: u16 = 0;
    let mut line = String::new();

    loop {
        line.clear();
        let n = timeout(t, reader.read_line(&mut line)).await??;
        if n == 0 {
            break; // EOF
        }

        // Need at least "NNN " (4 chars) to be a valid response line
        if line.len() < 3 {
            break;
        }

        let code: u16 = line[..3].parse().unwrap_or(0);
        if code == 0 {
            break;
        }
        last_code = code;

        // 4th character: '-' = more lines; ' ' or '\r' or '\n' = final line
        let is_final = line
            .chars()
            .nth(3)
            .map(|c| c != '-')
            .unwrap_or(true); // < 4 chars means no continuation marker → treat as final

        if is_final {
            break;
        }
    }

    Ok(last_code)
}
