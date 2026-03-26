use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SmtpState {
    Connect,
    Banner,
    Ehlo,
    MailFrom,
    RcptTo,
    CatchAllTest,
    Quit,
    Done,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VerifyResult {
    Valid,
    Invalid,
    CatchAll,
    Timeout,
    Error,
}

struct SmtpResponse {
    code: u16,
    is_multiline: bool,
}

impl SmtpResponse {
    fn parse_line(line: &[u8]) -> Option<Self> {
        if line.len() < 3 { return None; }

        let code = (line[0] as u16 - b'0' as u16) * 100
            + (line[1] as u16 - b'0' as u16) * 10
            + (line[2] as u16 - b'0' as u16);

        let is_multiline = line.len() > 3 && line[3] == b'-';

        Some(Self { code, is_multiline })
    }
}

pub async fn verify_email_fsm(email: &str, mx_host: &str, our_domain: &str) -> VerifyResult {
    let addr = format!("{}:25", mx_host);
    let timeout = Duration::from_secs(10);

    let stream = match tokio::time::timeout(timeout, TcpStream::connect(&addr)).await {
        Ok(Ok(s)) => s,
        _ => return VerifyResult::Timeout,
    };

    let (reader, mut writer) = stream.into_split();
    let mut reader = BufReader::with_capacity(512, reader);
    let mut line_buf = Vec::with_capacity(512);

    let mut state = SmtpState::Banner;
    let mut result = VerifyResult::Error;

    loop {
        match state {
            SmtpState::Banner => {
                match read_smtp_code(&mut reader, &mut line_buf, timeout).await {
                    Some(220) => {
                        let cmd = format!("EHLO {}\r\n", our_domain);
                        if write_cmd(&mut writer, cmd.as_bytes(), timeout).await.is_err() {
                            return VerifyResult::Error;
                        }
                        state = SmtpState::Ehlo;
                    }
                    _ => return VerifyResult::Error,
                }
            }

            SmtpState::Ehlo => {
                match read_smtp_code(&mut reader, &mut line_buf, timeout).await {
                    Some(250) => {
                        let cmd = format!("MAIL FROM:<verify@{}>\r\n", our_domain);
                        if write_cmd(&mut writer, cmd.as_bytes(), timeout).await.is_err() {
                            return VerifyResult::Error;
                        }
                        state = SmtpState::MailFrom;
                    }
                    _ => return VerifyResult::Error,
                }
            }

            SmtpState::MailFrom => {
                match read_smtp_code(&mut reader, &mut line_buf, timeout).await {
                    Some(250) => {
                        let cmd = format!("RCPT TO:<{}>\r\n", email);
                        if write_cmd(&mut writer, cmd.as_bytes(), timeout).await.is_err() {
                            return VerifyResult::Error;
                        }
                        state = SmtpState::RcptTo;
                    }
                    _ => { state = SmtpState::Quit; result = VerifyResult::Error; }
                }
            }

            SmtpState::RcptTo => {
                match read_smtp_code(&mut reader, &mut line_buf, timeout).await {
                    Some(250) => {
                        let _ = write_cmd(&mut writer, b"RSET\r\n", timeout).await;
                        let _ = read_smtp_code(&mut reader, &mut line_buf, timeout).await;

                        let cmd = format!("MAIL FROM:<verify@{}>\r\n", our_domain);
                        let _ = write_cmd(&mut writer, cmd.as_bytes(), timeout).await;
                        let _ = read_smtp_code(&mut reader, &mut line_buf, timeout).await;

                        let random_local = format!("xzqprobe{:08x}", fastrand_u32());
                        let domain = email.split('@').nth(1).unwrap_or("x");
                        let cmd = format!("RCPT TO:<{}@{}>\r\n", random_local, domain);
                        if write_cmd(&mut writer, cmd.as_bytes(), timeout).await.is_err() {
                            result = VerifyResult::Valid;
                            state = SmtpState::Quit;
                        } else {
                            state = SmtpState::CatchAllTest;
                        }
                    }
                    Some(c) if (550..=559).contains(&c) => {
                        result = VerifyResult::Invalid;
                        state = SmtpState::Quit;
                    }
                    Some(252) => {
                        result = VerifyResult::CatchAll;
                        state = SmtpState::Quit;
                    }
                    _ => {
                        result = VerifyResult::Timeout;
                        state = SmtpState::Quit;
                    }
                }
            }

            SmtpState::CatchAllTest => {
                match read_smtp_code(&mut reader, &mut line_buf, timeout).await {
                    Some(250) => { result = VerifyResult::CatchAll; }
                    _ => { result = VerifyResult::Valid; }
                }
                state = SmtpState::Quit;
            }

            SmtpState::Quit => {
                let _ = write_cmd(&mut writer, b"QUIT\r\n", timeout).await;
                state = SmtpState::Done;
            }

            SmtpState::Done => break,
            SmtpState::Connect => unreachable!(),
        }
    }

    result
}

async fn read_smtp_code(
    reader: &mut BufReader<tokio::net::tcp::OwnedReadHalf>,
    buf: &mut Vec<u8>,
    timeout: Duration,
) -> Option<u16> {
    loop {
        buf.clear();
        match tokio::time::timeout(timeout, reader.read_until(b'\n', buf)).await {
            Ok(Ok(0)) => return None,
            Ok(Ok(_)) => {
                if let Some(resp) = SmtpResponse::parse_line(buf) {
                    if !resp.is_multiline {
                        return Some(resp.code);
                    }
                }
            }
            _ => return None,
        }
    }
}

async fn write_cmd(
    writer: &mut tokio::net::tcp::OwnedWriteHalf,
    cmd: &[u8],
    timeout: Duration,
) -> Result<(), ()> {
    match tokio::time::timeout(timeout, writer.write_all(cmd)).await {
        Ok(Ok(_)) => {
            let _ = writer.flush().await;
            Ok(())
        }
        _ => Err(()),
    }
}

fn fastrand_u32() -> u32 {
    use std::cell::Cell;
    thread_local! {
        static STATE: Cell<u32> = Cell::new(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap().subsec_nanos()
        );
    }
    STATE.with(|s| {
        let mut x = s.get();
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        s.set(x);
        x
    })
}
