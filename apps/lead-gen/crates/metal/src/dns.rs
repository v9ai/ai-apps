use std::net::UdpSocket;
use std::time::Duration;

const DNS_TYPE_MX: u16 = 15;
const DNS_CLASS_IN: u16 = 1;
const DNS_FLAG_RD: u16 = 0x0100;

pub struct MxRecord {
    pub priority: u16,
    pub exchange: String,
}

pub struct DnsResolver {
    server: String,
    timeout: Duration,
}

impl DnsResolver {
    pub fn new(server: &str) -> Self {
        Self {
            server: server.to_string(),
            timeout: Duration::from_secs(5),
        }
    }

    pub fn default_resolver() -> Self {
        Self::new("8.8.8.8:53")
    }

    pub fn resolve_mx(&self, domain: &str) -> Result<Vec<MxRecord>, String> {
        let query = self.build_mx_query(domain);

        let socket = UdpSocket::bind("0.0.0.0:0")
            .map_err(|e| format!("bind: {}", e))?;
        socket.set_read_timeout(Some(self.timeout))
            .map_err(|e| format!("timeout: {}", e))?;

        socket.send_to(&query, &self.server)
            .map_err(|e| format!("send: {}", e))?;

        let mut buf = [0u8; 1024];
        let (len, _) = socket.recv_from(&mut buf)
            .map_err(|e| format!("recv: {}", e))?;

        self.parse_mx_response(&buf[..len])
    }

    fn build_mx_query(&self, domain: &str) -> Vec<u8> {
        let mut packet = Vec::with_capacity(64);

        let id: u16 = (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap().subsec_nanos() & 0xFFFF) as u16;

        packet.extend_from_slice(&id.to_be_bytes());
        packet.extend_from_slice(&DNS_FLAG_RD.to_be_bytes());
        packet.extend_from_slice(&1u16.to_be_bytes());
        packet.extend_from_slice(&0u16.to_be_bytes());
        packet.extend_from_slice(&0u16.to_be_bytes());
        packet.extend_from_slice(&0u16.to_be_bytes());

        for label in domain.split('.') {
            let len = label.len() as u8;
            packet.push(len);
            packet.extend_from_slice(label.as_bytes());
        }
        packet.push(0);

        packet.extend_from_slice(&DNS_TYPE_MX.to_be_bytes());
        packet.extend_from_slice(&DNS_CLASS_IN.to_be_bytes());

        packet
    }

    fn parse_mx_response(&self, data: &[u8]) -> Result<Vec<MxRecord>, String> {
        if data.len() < 12 {
            return Err("response too short".into());
        }

        let flags = u16::from_be_bytes([data[2], data[3]]);
        let rcode = flags & 0x000F;
        if rcode != 0 {
            return Err(format!("DNS error rcode={}", rcode));
        }

        let qd_count = u16::from_be_bytes([data[4], data[5]]) as usize;
        let an_count = u16::from_be_bytes([data[6], data[7]]) as usize;

        let mut pos = 12;

        // Skip questions
        for _ in 0..qd_count {
            pos = self.skip_name(data, pos)?;
            pos += 4;
        }

        // Parse answers
        let mut records = Vec::new();
        for _ in 0..an_count {
            let (name_end, _name) = self.read_name(data, pos)?;
            pos = name_end;

            if pos + 10 > data.len() { break; }

            let rtype = u16::from_be_bytes([data[pos], data[pos + 1]]);
            let rdlength = u16::from_be_bytes([data[pos + 8], data[pos + 9]]) as usize;
            pos += 10;

            if rtype == DNS_TYPE_MX && rdlength >= 2 {
                let priority = u16::from_be_bytes([data[pos], data[pos + 1]]);
                let (_, exchange) = self.read_name(data, pos + 2)?;
                records.push(MxRecord { priority, exchange });
            }

            pos += rdlength;
        }

        records.sort_by_key(|r| r.priority);
        Ok(records)
    }

    fn skip_name(&self, data: &[u8], mut pos: usize) -> Result<usize, String> {
        loop {
            if pos >= data.len() { return Err("truncated name".into()); }
            let len = data[pos] as usize;
            if len == 0 { return Ok(pos + 1); }
            if len & 0xC0 == 0xC0 { return Ok(pos + 2); }
            pos += 1 + len;
        }
    }

    fn read_name(&self, data: &[u8], mut pos: usize) -> Result<(usize, String), String> {
        let mut name = String::new();
        let mut jumped = false;
        let mut first_jump_pos = pos;

        loop {
            if pos >= data.len() { return Err("truncated".into()); }

            let len = data[pos] as usize;

            if len == 0 {
                if !jumped { first_jump_pos = pos + 1; }
                break;
            }

            if len & 0xC0 == 0xC0 {
                if pos + 1 >= data.len() { return Err("truncated pointer".into()); }
                let pointer = ((len & 0x3F) << 8) | data[pos + 1] as usize;
                if !jumped { first_jump_pos = pos + 2; }
                jumped = true;
                pos = pointer;
                continue;
            }

            pos += 1;
            if pos + len > data.len() { return Err("truncated label".into()); }

            if !name.is_empty() { name.push('.'); }
            name.push_str(
                std::str::from_utf8(&data[pos..pos + len])
                    .map_err(|_| "invalid utf8 in label")?
            );
            pos += len;
        }

        let ret_pos = if jumped { first_jump_pos } else { pos + 1 };
        Ok((ret_pos, name))
    }
}

pub async fn resolve_mx_async(domain: &str) -> Result<Vec<MxRecord>, String> {
    let domain = domain.to_string();
    tokio::task::spawn_blocking(move || {
        DnsResolver::default_resolver().resolve_mx(&domain)
    })
    .await
    .map_err(|e| format!("join: {}", e))?
}
