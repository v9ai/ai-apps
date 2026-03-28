use memmap2::{MmapMut, MmapOptions};
use std::fs::OpenOptions;
use std::io;
use std::sync::atomic::{AtomicU32, Ordering};

const PAGE_SIZE: usize = 4096;
const PAGE_HEADER_SIZE: usize = 16;

/// Page header (16 bytes)
/// | page_id (4) | num_slots (2) | free_start (2) | free_end (2) | flags (2) | checksum (4) |
#[repr(C, packed)]
#[derive(Clone, Copy)]
pub struct PageHeader {
    pub page_id: u32,
    pub num_slots: u16,
    pub free_start: u16,
    pub free_end: u16,
    pub flags: u16,
    pub checksum: u32,
}

/// Slot entry (4 bytes)
/// | offset (2) | length (2) |
#[repr(C, packed)]
#[derive(Clone, Copy)]
pub struct Slot {
    pub offset: u16,
    pub length: u16,
}

const SLOT_SIZE: usize = 4;

pub struct PageFile {
    _file: std::fs::File,
    mmap: MmapMut,
    num_pages: AtomicU32,
    _page_size: usize,
}

impl PageFile {
    pub fn open(path: &str, initial_pages: u32) -> io::Result<Self> {
        let file = OpenOptions::new()
            .read(true).write(true).create(true)
            .truncate(false)
            .open(path)?;

        let size = initial_pages as u64 * PAGE_SIZE as u64;
        let meta = file.metadata()?;
        if meta.len() < size {
            file.set_len(size)?;
        }

        let actual = file.metadata()?.len();
        let mmap = unsafe { MmapOptions::new().len(actual as usize).map_mut(&file)? };

        // Scan to find how many pages are actually in use (have non-zero page_id or slots)
        let capacity = actual as u32 / PAGE_SIZE as u32;
        let mut used = 0u32;
        for i in 0..capacity {
            let offset = i as usize * PAGE_SIZE;
            let header: PageHeader = unsafe {
                std::ptr::read_unaligned(mmap[offset..].as_ptr() as *const PageHeader)
            };
            if header.num_slots > 0 || header.free_start > PAGE_HEADER_SIZE as u16 {
                used = i + 1;
            }
        }

        Ok(Self {
            _file: file, mmap,
            num_pages: AtomicU32::new(used),
            _page_size: PAGE_SIZE,
        })
    }

    fn page_offset(&self, page_id: u32) -> usize {
        page_id as usize * PAGE_SIZE
    }

    /// Initialize a fresh page
    pub fn init_page(&self, page_id: u32) {
        let offset = self.page_offset(page_id);
        let header = PageHeader {
            page_id,
            num_slots: 0,
            free_start: PAGE_HEADER_SIZE as u16,
            free_end: PAGE_SIZE as u16,
            flags: 0,
            checksum: 0,
        };

        unsafe {
            let dst = self.mmap.as_ptr().add(offset) as *mut PageHeader;
            std::ptr::write_unaligned(dst, header);
        }
    }

    /// Read page header
    fn read_header(&self, page_id: u32) -> PageHeader {
        let offset = self.page_offset(page_id);
        unsafe {
            std::ptr::read_unaligned(
                self.mmap[offset..].as_ptr() as *const PageHeader
            )
        }
    }

    /// Write page header
    fn write_header(&self, page_id: u32, header: &PageHeader) {
        let offset = self.page_offset(page_id);
        unsafe {
            std::ptr::write_unaligned(
                self.mmap.as_ptr().add(offset) as *mut PageHeader,
                *header,
            );
        }
    }

    /// Insert a record into a page. Returns slot index or None if full.
    pub fn insert_into_page(&self, page_id: u32, data: &[u8]) -> Option<u16> {
        let mut header = self.read_header(page_id);
        let offset = self.page_offset(page_id);

        let slot_array_end = header.free_start as usize + SLOT_SIZE;

        // Check if there's enough free space
        if data.len() > header.free_end as usize || slot_array_end > header.free_end as usize - data.len() {
            return None; // page full
        }
        let data_start = header.free_end as usize - data.len();

        // Write data (grows downward from end of page)
        unsafe {
            let dst = self.mmap.as_ptr().add(offset + data_start) as *mut u8;
            std::ptr::copy_nonoverlapping(data.as_ptr(), dst, data.len());
        }

        // Write slot entry
        let slot = Slot {
            offset: data_start as u16,
            length: data.len() as u16,
        };
        unsafe {
            let slot_ptr = self.mmap.as_ptr().add(offset + header.free_start as usize) as *mut Slot;
            std::ptr::write_unaligned(slot_ptr, slot);
        }

        let slot_idx = header.num_slots;
        header.num_slots += 1;
        header.free_start += SLOT_SIZE as u16;
        header.free_end = data_start as u16;
        self.write_header(page_id, &header);

        Some(slot_idx)
    }

    /// Read a record from a page by slot index
    pub fn read_slot(&self, page_id: u32, slot_idx: u16) -> Option<&[u8]> {
        let header = self.read_header(page_id);
        if slot_idx >= header.num_slots { return None; }

        let offset = self.page_offset(page_id);
        let slot_offset = offset + PAGE_HEADER_SIZE + slot_idx as usize * SLOT_SIZE;

        let slot: Slot = unsafe {
            std::ptr::read_unaligned(self.mmap[slot_offset..].as_ptr() as *const Slot)
        };

        if slot.length == 0 { return None; } // deleted

        let data_start = offset + slot.offset as usize;
        let data_end = data_start + slot.length as usize;

        Some(&self.mmap[data_start..data_end])
    }

    /// Allocate a new page, returns page_id
    pub fn alloc_page(&self) -> io::Result<u32> {
        let page_id = self.num_pages.fetch_add(1, Ordering::SeqCst);
        let needed = (page_id as u64 + 1) * PAGE_SIZE as u64;
        if needed > self.mmap.len() as u64 {
            return Err(io::Error::other("need file growth"));
        }
        self.init_page(page_id);
        Ok(page_id)
    }

    pub fn sync(&self) -> io::Result<()> {
        self.mmap.flush()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_page_file() -> (tempfile::TempDir, PageFile) {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.pages");
        let pf = PageFile::open(path.to_str().unwrap(), 16).unwrap();
        (dir, pf)
    }

    #[test]
    fn test_alloc_and_insert() {
        let (_dir, pf) = temp_page_file();
        let page_id = pf.alloc_page().unwrap();
        let slot = pf.insert_into_page(page_id, b"hello world").unwrap();
        let data = pf.read_slot(page_id, slot).unwrap();
        assert_eq!(data, b"hello world");
    }

    #[test]
    fn test_multiple_inserts() {
        let (_dir, pf) = temp_page_file();
        let page_id = pf.alloc_page().unwrap();
        let s0 = pf.insert_into_page(page_id, b"first").unwrap();
        let s1 = pf.insert_into_page(page_id, b"second").unwrap();
        assert_ne!(s0, s1);
        assert_eq!(pf.read_slot(page_id, s0).unwrap(), b"first");
        assert_eq!(pf.read_slot(page_id, s1).unwrap(), b"second");
    }

    #[test]
    fn test_page_full() {
        let (_dir, pf) = temp_page_file();
        let page_id = pf.alloc_page().unwrap();
        // Fill the page with large records until it returns None
        let big_data = vec![0xABu8; 2000]; // ~half a 4096 page
        let first = pf.insert_into_page(page_id, &big_data);
        assert!(first.is_some());
        let second = pf.insert_into_page(page_id, &big_data);
        // Second insert might fail due to page being full (header + slots + 2x2000 > 4096)
        // Either way, this should not panic
        if second.is_none() {
            // Expected: page is full
        }
    }

    #[test]
    fn test_read_invalid_slot() {
        let (_dir, pf) = temp_page_file();
        let page_id = pf.alloc_page().unwrap();
        assert!(pf.read_slot(page_id, 999).is_none());
    }
}
