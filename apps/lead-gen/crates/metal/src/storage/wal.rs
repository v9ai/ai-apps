use memmap2::{MmapMut, MmapOptions};
use std::fs::{OpenOptions};
use std::io;
use std::sync::atomic::{AtomicU64, Ordering};

/// On-disk WAL entry header (24 bytes, packed)
/// | crc32 (4) | len (4) | sequence (8) | type (1) | flags (1) | padding (6) |
#[repr(C, packed)]
#[derive(Clone, Copy, Debug)]
pub struct WalEntryHeader {
    pub crc32: u32,
    pub data_len: u32,
    pub sequence: u64,
    pub entry_type: u8,
    pub flags: u8,
    pub _pad: [u8; 6],
}

const WAL_HEADER_SIZE: usize = std::mem::size_of::<WalEntryHeader>(); // 24 bytes

#[repr(u8)]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum EntryType {
    CompanyInsert = 1,
    CompanyUpdate = 2,
    ContactInsert = 3,
    ContactUpdate = 4,
    EmailVerified = 5,
    ScoreUpdate = 6,
    Delete = 7,
}

impl From<u8> for EntryType {
    fn from(v: u8) -> Self {
        match v {
            1 => Self::CompanyInsert, 2 => Self::CompanyUpdate,
            3 => Self::ContactInsert, 4 => Self::ContactUpdate,
            5 => Self::EmailVerified, 6 => Self::ScoreUpdate,
            7 => Self::Delete, _ => Self::CompanyInsert,
        }
    }
}

pub struct WriteAheadLog {
    file: std::fs::File,
    mmap: Option<MmapMut>,
    write_pos: AtomicU64,
    sequence: AtomicU64,
    capacity: AtomicU64,
    _path: String,
}

impl WriteAheadLog {
    pub fn open(path: &str, initial_size_mb: u64) -> io::Result<Self> {
        let capacity = initial_size_mb * 1024 * 1024;

        let file = OpenOptions::new()
            .read(true).write(true).create(true)
            .truncate(false)
            .open(path)?;

        let metadata = file.metadata()?;
        if metadata.len() == 0 {
            file.set_len(capacity)?;
        }

        let actual_len = file.metadata()?.len();
        let mmap = unsafe { MmapOptions::new().len(actual_len as usize).map_mut(&file)? };

        // Scan to find write position and max sequence
        let (write_pos, max_seq) = Self::scan_entries(&mmap);

        Ok(Self {
            file,
            mmap: Some(mmap),
            write_pos: AtomicU64::new(write_pos),
            sequence: AtomicU64::new(max_seq + 1),
            capacity: AtomicU64::new(actual_len),
            _path: path.to_string(),
        })
    }

    fn scan_entries(mmap: &MmapMut) -> (u64, u64) {
        let mut pos = 0u64;
        let mut max_seq = 0u64;
        let len = mmap.len() as u64;

        while pos + WAL_HEADER_SIZE as u64 <= len {
            let header: WalEntryHeader = unsafe {
                std::ptr::read_unaligned(mmap[pos as usize..].as_ptr() as *const WalEntryHeader)
            };

            // Zero sequence = unused space
            if header.sequence == 0 && header.data_len == 0 {
                break;
            }

            // Verify CRC
            let data_end = pos as usize + WAL_HEADER_SIZE + header.data_len as usize;
            if data_end > len as usize { break; }

            let data = &mmap[pos as usize + WAL_HEADER_SIZE..data_end];
            let computed_crc = crc32fast::hash(data);
            if computed_crc != header.crc32 { break; } // corruption, stop here

            max_seq = max_seq.max(header.sequence);
            pos = data_end as u64;

            // Align to 8 bytes
            pos = (pos + 7) & !7;
        }

        (pos, max_seq)
    }

    /// Append an entry. Returns the sequence number.
    /// Auto-grows the WAL file if capacity is exceeded.
    pub fn append(&self, entry_type: EntryType, data: &[u8]) -> io::Result<u64> {
        let seq = self.sequence.fetch_add(1, Ordering::SeqCst);
        let crc = crc32fast::hash(data);

        let header = WalEntryHeader {
            crc32: crc,
            data_len: data.len() as u32,
            sequence: seq,
            entry_type: entry_type as u8,
            flags: 0,
            _pad: [0; 6],
        };

        let entry_size = WAL_HEADER_SIZE + data.len();
        let aligned_size = (entry_size + 7) & !7; // 8-byte alignment

        let pos = self.write_pos.fetch_add(aligned_size as u64, Ordering::SeqCst);
        let capacity = self.capacity.load(Ordering::SeqCst);

        if pos + aligned_size as u64 > capacity {
            // Roll back write_pos and return error — caller should call grow() then retry
            self.write_pos.fetch_sub(aligned_size as u64, Ordering::SeqCst);
            self.sequence.fetch_sub(1, Ordering::SeqCst);
            return Err(io::Error::other(
                format!("WAL full ({} bytes), call grow() to expand", capacity),
            ));
        }

        let mmap = self.mmap.as_ref().unwrap();

        // Write header
        unsafe {
            let dst = mmap.as_ptr().add(pos as usize) as *mut WalEntryHeader;
            std::ptr::write_unaligned(dst, header);
        }

        // Write data
        let data_start = pos as usize + WAL_HEADER_SIZE;
        unsafe {
            let dst = mmap.as_ptr().add(data_start) as *mut u8;
            std::ptr::copy_nonoverlapping(data.as_ptr(), dst, data.len());
        }

        Ok(seq)
    }

    /// Grow the WAL file by doubling its capacity and remapping.
    pub fn grow(&mut self) -> io::Result<()> {
        let old_cap = self.capacity.load(Ordering::SeqCst);
        let new_cap = old_cap * 2;

        self.file.set_len(new_cap)?;

        let new_mmap = unsafe {
            MmapOptions::new().len(new_cap as usize).map_mut(&self.file)?
        };
        self.mmap = Some(new_mmap);
        self.capacity.store(new_cap, Ordering::SeqCst);

        Ok(())
    }

    /// Current capacity in bytes.
    pub fn capacity(&self) -> u64 {
        self.capacity.load(Ordering::SeqCst)
    }

    /// Current write position in bytes.
    pub fn write_pos(&self) -> u64 {
        self.write_pos.load(Ordering::SeqCst)
    }

    /// Utilization as a fraction (0.0 - 1.0).
    pub fn utilization(&self) -> f64 {
        self.write_pos() as f64 / self.capacity() as f64
    }

    /// Flush mmap to disk
    pub fn sync(&self) -> io::Result<()> {
        if let Some(ref mmap) = self.mmap {
            mmap.flush()?;
        }
        Ok(())
    }

    /// Iterate all valid entries
    pub fn iter(&self) -> WalIterator<'_> {
        WalIterator {
            mmap: self.mmap.as_ref().unwrap(),
            pos: 0,
            end: self.write_pos.load(Ordering::SeqCst) as usize,
        }
    }
}

pub struct WalIterator<'a> {
    mmap: &'a MmapMut,
    pos: usize,
    end: usize,
}

impl<'a> Iterator for WalIterator<'a> {
    type Item = (WalEntryHeader, &'a [u8]);

    fn next(&mut self) -> Option<Self::Item> {
        if self.pos + WAL_HEADER_SIZE > self.end { return None; }

        let header: WalEntryHeader = unsafe {
            std::ptr::read_unaligned(
                self.mmap[self.pos..].as_ptr() as *const WalEntryHeader
            )
        };

        if header.sequence == 0 { return None; }

        let data_start = self.pos + WAL_HEADER_SIZE;
        let data_end = data_start + header.data_len as usize;
        if data_end > self.end { return None; }

        let data = &self.mmap[data_start..data_end];

        // Verify CRC
        let computed = crc32fast::hash(data);
        if computed != header.crc32 { return None; }

        self.pos = (data_end + 7) & !7; // align

        Some((header, data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_wal() -> (tempfile::TempDir, WriteAheadLog) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.wal");
        let wal = WriteAheadLog::open(path.to_str().unwrap(), 1).unwrap();
        (dir, wal)
    }

    #[test]
    fn test_append_and_iterate() {
        let (_dir, wal) = temp_wal();
        wal.append(EntryType::CompanyInsert, b"company-1").unwrap();
        wal.append(EntryType::ContactInsert, b"contact-1").unwrap();

        let entries: Vec<_> = wal.iter().collect();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].0.entry_type, EntryType::CompanyInsert as u8);
        assert_eq!(entries[0].1, b"company-1");
        assert_eq!(entries[1].0.entry_type, EntryType::ContactInsert as u8);
        assert_eq!(entries[1].1, b"contact-1");
    }

    #[test]
    fn test_sequence_increments() {
        let (_dir, wal) = temp_wal();
        let seq1 = wal.append(EntryType::CompanyInsert, b"a").unwrap();
        let seq2 = wal.append(EntryType::CompanyInsert, b"b").unwrap();
        assert_eq!(seq2, seq1 + 1);
    }

    #[test]
    fn test_utilization() {
        let (_dir, wal) = temp_wal();
        assert_eq!(wal.utilization(), 0.0);
        wal.append(EntryType::CompanyInsert, b"data").unwrap();
        assert!(wal.utilization() > 0.0);
    }

    #[test]
    fn test_sync_no_panic() {
        let (_dir, wal) = temp_wal();
        wal.append(EntryType::CompanyInsert, b"data").unwrap();
        wal.sync().unwrap();
    }
}
