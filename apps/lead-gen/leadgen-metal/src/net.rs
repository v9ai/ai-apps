/// Raw HTTP/1.1 client — zero dependencies beyond libc.
///
/// Uses `libc::socket`/`connect`/`send`/`recv` directly.
/// Builds request on stack buffer, parses response in-place.
/// Follows redirects. No TLS (add rustls for HTTPS).

pub struct HttpResponse {
    pub status: u16,
    pub body_start: usize,
    pub body_len: usize,
    pub content_len: usize,
    pub chunked: bool,
    pub redirect_location: [u8; 256],
}

impl HttpResponse {
    pub fn redirect_location_str(&self) -> Option<&str> {
        if self.redirect_location[0] == 0 {
            return None;
        }
        let end = self
            .redirect_location
            .iter()
            .position(|&b| b == 0)
            .unwrap_or(256);
        std::str::from_utf8(&self.redirect_location[..end]).ok()
    }

    pub fn is_redirect(&self) -> bool {
        (300..400).contains(&self.status) && self.redirect_location[0] != 0
    }
}

/// Fetch a URL using raw sockets. Writes response into provided buffer.
///
/// # Arguments
/// * `host` - Hostname (e.g., "example.com")
/// * `path` - Request path (e.g., "/about")
/// * `port` - TCP port (usually 80)
/// * `buf` - Caller-provided buffer for response (e.g., 1MB from arena)
/// * `timeout_secs` - Socket timeout in seconds
///
/// # Returns
/// `Ok(HttpResponse)` with status and body offsets, or `Err(error_code)`.
pub fn http_get_raw(
    host: &str,
    path: &str,
    port: u16,
    buf: &mut [u8],
    timeout_secs: i32,
) -> Result<HttpResponse, i32> {
    let host_c = std::ffi::CString::new(host).map_err(|_| -1)?;
    let port_c = std::ffi::CString::new(format!("{}", port)).map_err(|_| -1)?;

    let mut hints: libc::addrinfo = unsafe { std::mem::zeroed() };
    hints.ai_family = libc::AF_INET;
    hints.ai_socktype = libc::SOCK_STREAM;

    let mut result: *mut libc::addrinfo = std::ptr::null_mut();
    let ret =
        unsafe { libc::getaddrinfo(host_c.as_ptr(), port_c.as_ptr(), &hints, &mut result) };
    if ret != 0 || result.is_null() {
        return Err(-2);
    }

    let sock = unsafe { libc::socket(libc::AF_INET, libc::SOCK_STREAM, 0) };
    if sock < 0 {
        unsafe { libc::freeaddrinfo(result) };
        return Err(-3);
    }

    // Set timeouts
    let tv = libc::timeval {
        tv_sec: timeout_secs as _,
        tv_usec: 0,
    };
    unsafe {
        libc::setsockopt(
            sock,
            libc::SOL_SOCKET,
            libc::SO_RCVTIMEO,
            &tv as *const _ as *const libc::c_void,
            std::mem::size_of_val(&tv) as libc::socklen_t,
        );
        libc::setsockopt(
            sock,
            libc::SOL_SOCKET,
            libc::SO_SNDTIMEO,
            &tv as *const _ as *const libc::c_void,
            std::mem::size_of_val(&tv) as libc::socklen_t,
        );
    }

    // Connect
    let addr = unsafe { (*result).ai_addr };
    let addrlen = unsafe { (*result).ai_addrlen };
    if unsafe { libc::connect(sock, addr, addrlen) } < 0 {
        unsafe {
            libc::close(sock);
            libc::freeaddrinfo(result);
        }
        return Err(-4);
    }
    unsafe { libc::freeaddrinfo(result) };

    // Build request on stack
    let mut req_buf = [0u8; 2048];
    let req_len = {
        let mut pos = 0;
        let parts: &[&[u8]] = &[
            b"GET ",
            path.as_bytes(),
            b" HTTP/1.1\r\n",
            b"Host: ",
            host.as_bytes(),
            b"\r\n",
            b"User-Agent: leadgen-kernel/0.2\r\n",
            b"Accept: text/html,application/json\r\n",
            b"Connection: close\r\n",
            b"\r\n",
        ];
        for part in parts {
            let end = (pos + part.len()).min(req_buf.len());
            let copy_len = end - pos;
            req_buf[pos..end].copy_from_slice(&part[..copy_len]);
            pos = end;
        }
        pos
    };

    // Send
    let sent = unsafe { libc::send(sock, req_buf.as_ptr() as *const _, req_len, 0) };
    if sent <= 0 {
        unsafe { libc::close(sock) };
        return Err(-5);
    }

    // Receive
    let mut total = 0usize;
    loop {
        let remaining = buf.len() - total;
        if remaining == 0 {
            break;
        }
        let n = unsafe {
            libc::recv(
                sock,
                buf.as_mut_ptr().add(total) as *mut _,
                remaining,
                0,
            )
        };
        if n <= 0 {
            break;
        }
        total += n as usize;
    }
    unsafe { libc::close(sock) };

    if total < 12 {
        return Err(-6);
    }

    // Parse status line: "HTTP/1.1 200 OK\r\n"
    let status = if buf.len() > 11 && buf[9].is_ascii_digit() {
        (buf[9] - b'0') as u16 * 100
            + (buf[10] - b'0') as u16 * 10
            + (buf[11] - b'0') as u16
    } else {
        0
    };

    // Find header/body boundary (\r\n\r\n)
    let mut body_start = 0;
    let mut content_len = 0usize;
    let mut chunked = false;
    let mut redirect_location = [0u8; 256];

    for i in 0..total.saturating_sub(3) {
        if buf[i] == b'\r' && buf[i + 1] == b'\n' && buf[i + 2] == b'\r' && buf[i + 3] == b'\n' {
            body_start = i + 4;
            break;
        }
    }

    // Parse headers
    if body_start > 0 {
        let headers = &buf[..body_start];
        for line in headers.split(|&b| b == b'\n') {
            let line = if line.last() == Some(&b'\r') {
                &line[..line.len() - 1]
            } else {
                line
            };
            if line.len() < 3 {
                continue;
            }

            let line_lower: Vec<u8> = line.iter().map(|b| b.to_ascii_lowercase()).collect();

            if line_lower.starts_with(b"content-length:") {
                let val = &line[15..];
                content_len = val
                    .iter()
                    .filter(|b| b.is_ascii_digit())
                    .fold(0usize, |acc, &b| acc * 10 + (b - b'0') as usize);
            }
            if line_lower.starts_with(b"transfer-encoding:")
                && line_lower.windows(7).any(|w| w == b"chunked")
            {
                chunked = true;
            }
            if line_lower.starts_with(b"location:") {
                let val = trim_header_value(&line[9..]);
                let len = val.len().min(255);
                redirect_location[..len].copy_from_slice(&val[..len]);
            }
        }
    }

    let body_len = if content_len > 0 {
        content_len
    } else {
        total.saturating_sub(body_start)
    };

    Ok(HttpResponse {
        status,
        body_start,
        body_len,
        content_len,
        chunked,
        redirect_location,
    })
}

/// Fetch with automatic redirect following (up to 5 hops).
pub fn http_get_follow(
    host: &str,
    path: &str,
    port: u16,
    buf: &mut [u8],
    timeout_secs: i32,
) -> Result<HttpResponse, i32> {
    let mut current_host = host.to_string();
    let mut current_path = path.to_string();

    for _ in 0..5 {
        let resp = http_get_raw(&current_host, &current_path, port, buf, timeout_secs)?;
        if !resp.is_redirect() {
            return Ok(resp);
        }
        if let Some(loc) = resp.redirect_location_str() {
            if loc.starts_with('/') {
                current_path = loc.to_string();
            } else if loc.starts_with("http://") {
                let without_scheme = &loc[7..];
                if let Some(slash) = without_scheme.find('/') {
                    current_host = without_scheme[..slash].to_string();
                    current_path = without_scheme[slash..].to_string();
                }
            }
        } else {
            break;
        }
    }
    Err(-7) // too many redirects
}

fn trim_header_value(b: &[u8]) -> &[u8] {
    let start = b
        .iter()
        .position(|&c| c != b' ' && c != b'\t')
        .unwrap_or(b.len());
    let end = b
        .iter()
        .rposition(|&c| c != b' ' && c != b'\t')
        .map(|p| p + 1)
        .unwrap_or(start);
    &b[start..end]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_http_response_redirect() {
        let mut resp = HttpResponse {
            status: 301,
            body_start: 0,
            body_len: 0,
            content_len: 0,
            chunked: false,
            redirect_location: [0; 256],
        };
        assert!(!resp.is_redirect()); // no location set

        resp.redirect_location[..6].copy_from_slice(b"/about");
        assert!(resp.is_redirect());
        assert_eq!(resp.redirect_location_str(), Some("/about"));
    }

    #[test]
    fn test_http_response_no_redirect() {
        let resp = HttpResponse {
            status: 200,
            body_start: 100,
            body_len: 500,
            content_len: 500,
            chunked: false,
            redirect_location: [0; 256],
        };
        assert!(!resp.is_redirect());
    }
}
