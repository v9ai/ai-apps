const RECORD_MAGIC: u16 = 0xCA_FE;
const RECORD_VERSION: u8 = 1;

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum RecordType {
    Company = 1,
    Contact = 2,
    EmailPattern = 3,
    LeadScore = 4,
}

pub struct RecordBuilder {
    buf: Vec<u8>,
    fields: Vec<(u16, u16)>,
    data_start: usize,
}

impl RecordBuilder {
    pub fn new(record_type: RecordType, estimated_fields: usize) -> Self {
        let header_size = 8;
        let offsets_size = 2 + estimated_fields * 4;
        let mut buf = vec![0u8; header_size + offsets_size];

        buf[0..2].copy_from_slice(&RECORD_MAGIC.to_le_bytes());
        buf[2] = RECORD_VERSION;
        buf[3] = record_type as u8;

        Self {
            data_start: header_size + offsets_size,
            buf,
            fields: Vec::with_capacity(estimated_fields),
        }
    }

    pub fn add_str(&mut self, value: &str) -> &mut Self {
        let bytes = value.as_bytes();
        let offset = self.buf.len() - self.data_start;
        self.fields.push((offset as u16, bytes.len() as u16));
        self.buf.extend_from_slice(bytes);
        self
    }

    pub fn add_u32(&mut self, value: u32) -> &mut Self {
        let offset = self.buf.len() - self.data_start;
        self.fields.push((offset as u16, 4));
        self.buf.extend_from_slice(&value.to_le_bytes());
        self
    }

    pub fn add_f64(&mut self, value: f64) -> &mut Self {
        let offset = self.buf.len() - self.data_start;
        self.fields.push((offset as u16, 8));
        self.buf.extend_from_slice(&value.to_le_bytes());
        self
    }

    pub fn add_opt_str(&mut self, value: Option<&str>) -> &mut Self {
        self.add_str(value.unwrap_or(""))
    }

    pub fn build(self) -> Vec<u8> {
        let field_count = self.fields.len();
        let header_fixed = 8;
        let offsets_actual = 2 + field_count * 4;
        let actual_data_start = header_fixed + offsets_actual;

        let mut final_buf = Vec::with_capacity(actual_data_start + (self.buf.len() - self.data_start));

        // Header
        final_buf.extend_from_slice(&RECORD_MAGIC.to_le_bytes());
        final_buf.push(RECORD_VERSION);
        final_buf.push(self.buf[3]); // record type

        let total_len_placeholder = final_buf.len();
        final_buf.extend_from_slice(&0u32.to_le_bytes()); // placeholder

        // Field count
        final_buf.extend_from_slice(&(field_count as u16).to_le_bytes());

        // Field offsets
        for (offset, length) in &self.fields {
            final_buf.extend_from_slice(&offset.to_le_bytes());
            final_buf.extend_from_slice(&length.to_le_bytes());
        }

        // Field data
        final_buf.extend_from_slice(&self.buf[self.data_start..]);

        // Write total length
        let total = final_buf.len() as u32;
        final_buf[total_len_placeholder..total_len_placeholder + 4]
            .copy_from_slice(&total.to_le_bytes());

        final_buf
    }
}

/// Zero-copy record reader
pub struct RecordReader<'a> {
    data: &'a [u8],
    field_count: usize,
    data_start: usize,
}

impl<'a> RecordReader<'a> {
    pub fn from_bytes(data: &'a [u8]) -> Option<Self> {
        if data.len() < 10 { return None; }

        let magic = u16::from_le_bytes([data[0], data[1]]);
        if magic != RECORD_MAGIC { return None; }

        let field_count = u16::from_le_bytes([data[8], data[9]]) as usize;
        let data_start = 10 + field_count * 4;

        if data_start > data.len() { return None; }

        Some(Self { data, field_count, data_start })
    }

    pub fn record_type(&self) -> RecordType {
        match self.data[3] {
            1 => RecordType::Company, 2 => RecordType::Contact,
            3 => RecordType::EmailPattern, 4 => RecordType::LeadScore,
            _ => RecordType::Company,
        }
    }

    pub fn field_count(&self) -> usize { self.field_count }

    pub fn field_bytes(&self, idx: usize) -> Option<&'a [u8]> {
        if idx >= self.field_count { return None; }

        let offset_pos = 10 + idx * 4;
        let rel_offset = u16::from_le_bytes([
            self.data[offset_pos], self.data[offset_pos + 1]
        ]) as usize;
        let length = u16::from_le_bytes([
            self.data[offset_pos + 2], self.data[offset_pos + 3]
        ]) as usize;

        let abs_offset = self.data_start + rel_offset;
        if abs_offset + length > self.data.len() { return None; }

        Some(&self.data[abs_offset..abs_offset + length])
    }

    pub fn field_str(&self, idx: usize) -> Option<&'a str> {
        self.field_bytes(idx).and_then(|b| std::str::from_utf8(b).ok())
    }

    pub fn field_u32(&self, idx: usize) -> Option<u32> {
        self.field_bytes(idx).and_then(|b| {
            if b.len() == 4 { Some(u32::from_le_bytes([b[0], b[1], b[2], b[3]])) }
            else { None }
        })
    }

    pub fn field_f64(&self, idx: usize) -> Option<f64> {
        self.field_bytes(idx).and_then(|b| {
            if b.len() == 8 {
                Some(f64::from_le_bytes([b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]]))
            } else { None }
        })
    }
}

pub mod company_fields {
    pub const ID: usize = 0;
    pub const NAME: usize = 1;
    pub const DOMAIN: usize = 2;
    pub const INDUSTRY: usize = 3;
    pub const EMPLOYEE_COUNT: usize = 4;
    pub const TECH_STACK: usize = 5;
    pub const LOCATION: usize = 6;
    pub const DESCRIPTION: usize = 7;
    pub const FIELD_COUNT: usize = 8;
}

pub mod contact_fields {
    pub const ID: usize = 0;
    pub const COMPANY_ID: usize = 1;
    pub const FIRST_NAME: usize = 2;
    pub const LAST_NAME: usize = 3;
    pub const TITLE: usize = 4;
    pub const SENIORITY: usize = 5;
    pub const EMAIL: usize = 6;
    pub const EMAIL_STATUS: usize = 7;
    pub const FIELD_COUNT: usize = 8;
}

pub fn build_company_record(
    id: &str, name: &str, domain: &str, industry: &str,
    employee_count: u32, tech_stack: &str, location: &str, description: &str,
) -> Vec<u8> {
    let mut b = RecordBuilder::new(RecordType::Company, company_fields::FIELD_COUNT);
    b.add_str(id);
    b.add_str(name);
    b.add_str(domain);
    b.add_str(industry);
    b.add_u32(employee_count);
    b.add_str(tech_stack);
    b.add_str(location);
    b.add_str(description);
    b.build()
}

pub fn build_contact_record(
    id: &str, company_id: &str, first: &str, last: &str,
    title: &str, seniority: &str, email: &str, status: &str,
) -> Vec<u8> {
    let mut b = RecordBuilder::new(RecordType::Contact, contact_fields::FIELD_COUNT);
    b.add_str(id);
    b.add_str(company_id);
    b.add_str(first);
    b.add_str(last);
    b.add_str(title);
    b.add_str(seniority);
    b.add_str(email);
    b.add_str(status);
    b.build()
}
