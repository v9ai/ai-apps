use std::net::UdpSocket;
use std::time::Duration;

const DNS_TYPE_MX: u16 = 15;
const DNS_CLASS_IN: u16 = 1;
const DNS_FLAG_RD: u16 = 0x0100;

#[derive(Debug)]
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_mx_query_structure() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        let pkt = resolver.build_mx_query("example.com");

        // Header: 12 bytes (ID=2, flags=2, qdcount=2, ancount=2, nscount=2, arcount=2)
        assert!(pkt.len() >= 12);

        // Flags: recursion desired (0x0100)
        assert_eq!(u16::from_be_bytes([pkt[2], pkt[3]]), 0x0100);
        // QDCOUNT = 1
        assert_eq!(u16::from_be_bytes([pkt[4], pkt[5]]), 1);
        // ANCOUNT/NSCOUNT/ARCOUNT = 0
        assert_eq!(u16::from_be_bytes([pkt[6], pkt[7]]), 0);

        // Question: \x07example\x03com\x00 + QTYPE(MX=15) + QCLASS(IN=1)
        assert_eq!(pkt[12], 7); // "example" label length
        assert_eq!(&pkt[13..20], b"example");
        assert_eq!(pkt[20], 3); // "com" label length
        assert_eq!(&pkt[21..24], b"com");
        assert_eq!(pkt[24], 0); // root terminator

        // QTYPE = MX (15), QCLASS = IN (1)
        assert_eq!(u16::from_be_bytes([pkt[25], pkt[26]]), 15);
        assert_eq!(u16::from_be_bytes([pkt[27], pkt[28]]), 1);
    }

    #[test]
    fn test_build_mx_query_subdomain() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        let pkt = resolver.build_mx_query("mail.example.co.uk");

        // Labels: \x04mail\x07example\x02co\x02uk\x00
        assert_eq!(pkt[12], 4);
        assert_eq!(&pkt[13..17], b"mail");
        assert_eq!(pkt[17], 7);
        assert_eq!(&pkt[18..25], b"example");
        assert_eq!(pkt[25], 2);
        assert_eq!(&pkt[26..28], b"co");
        assert_eq!(pkt[28], 2);
        assert_eq!(&pkt[29..31], b"uk");
        assert_eq!(pkt[31], 0);
    }

    #[test]
    fn test_parse_mx_response_too_short() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        let result = resolver.parse_mx_response(&[0u8; 6]);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("too short"));
    }

    #[test]
    fn test_parse_mx_response_rcode_error() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        // Minimal 12-byte header with rcode=3 (NXDOMAIN)
        let mut hdr = [0u8; 12];
        hdr[2] = 0x81; // QR=1, RD=1
        hdr[3] = 0x03; // rcode=3
        let result = resolver.parse_mx_response(&hdr);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("rcode=3"));
    }

    #[test]
    fn test_parse_mx_response_crafted() {
        let resolver = DnsResolver::new("8.8.8.8:53");

        // Build a synthetic response for "example.com" with one MX record
        let mut pkt = Vec::new();

        // Header
        pkt.extend_from_slice(&[0x00, 0x01]); // ID
        pkt.extend_from_slice(&[0x81, 0x80]); // flags: QR=1, RD=1, RA=1, rcode=0
        pkt.extend_from_slice(&[0x00, 0x01]); // QDCOUNT=1
        pkt.extend_from_slice(&[0x00, 0x01]); // ANCOUNT=1
        pkt.extend_from_slice(&[0x00, 0x00]); // NSCOUNT=0
        pkt.extend_from_slice(&[0x00, 0x00]); // ARCOUNT=0

        // Question: example.com MX IN
        pkt.push(7); pkt.extend_from_slice(b"example");
        pkt.push(3); pkt.extend_from_slice(b"com");
        pkt.push(0);
        pkt.extend_from_slice(&[0x00, 0x0F]); // QTYPE=MX
        pkt.extend_from_slice(&[0x00, 0x01]); // QCLASS=IN

        // Answer: compressed name pointer to offset 12 (question name)
        pkt.extend_from_slice(&[0xC0, 0x0C]); // name pointer
        pkt.extend_from_slice(&[0x00, 0x0F]); // TYPE=MX
        pkt.extend_from_slice(&[0x00, 0x01]); // CLASS=IN
        pkt.extend_from_slice(&[0x00, 0x00, 0x00, 0x3C]); // TTL=60

        // RDATA: priority(2) + exchange name
        let exchange = b"\x04mail\x07example\x03com\x00";
        let rdlength = 2 + exchange.len();
        pkt.extend_from_slice(&(rdlength as u16).to_be_bytes());
        pkt.extend_from_slice(&10u16.to_be_bytes()); // priority=10
        pkt.extend_from_slice(exchange);

        let records = resolver.parse_mx_response(&pkt).unwrap();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].priority, 10);
        assert_eq!(records[0].exchange, "mail.example.com");
    }

    #[test]
    fn test_skip_name_root() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        // Root name: single zero byte
        let data = [0u8];
        assert_eq!(resolver.skip_name(&data, 0).unwrap(), 1);
    }

    #[test]
    fn test_skip_name_compressed() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        // Compressed pointer: 0xC0 0x0C
        let data = [0xC0, 0x0C];
        assert_eq!(resolver.skip_name(&data, 0).unwrap(), 2);
    }

    #[test]
    fn test_read_name_simple() {
        let resolver = DnsResolver::new("8.8.8.8:53");
        // \x03foo\x03bar\x00
        let data = [3, b'f', b'o', b'o', 3, b'b', b'a', b'r', 0];
        let (pos, name) = resolver.read_name(&data, 0).unwrap();
        assert_eq!(name, "foo.bar");
        assert_eq!(pos, 9);
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
