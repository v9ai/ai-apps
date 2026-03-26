/// Lock-free SPSC (Single Producer, Single Consumer) ring buffer.
///
/// Scraper thread pushes HTML/text → embedder thread consumes.
/// Cache-line padded to eliminate false sharing on M1 (128-byte coherency unit).
/// Backed by anonymous mmap for zero-init and page-aligned memory.

use memmap2::MmapMut;
use std::sync::atomic::{AtomicUsize, Ordering};

const RING_CAPACITY: usize = 1024; // must be power of 2

/// One slot in the ring buffer — page-sized for DMA-friendly access.
#[repr(C)]
pub struct RingSlot {
    pub data: [u8; 4096],
    pub len: u32,
    pub source_board: u8,
    pub _pad: [u8; 3],
}

/// Wrapper to place a value on its own 128-byte boundary.
/// M1 DMA coherency unit is 128 bytes — prevents false sharing.
#[repr(C, align(128))]
struct CacheAligned<T>(T);

/// Lock-free SPSC ring buffer.
///
/// Safety contract: exactly ONE thread calls `try_push`/`commit_push` (producer),
/// exactly ONE thread calls `try_pop`/`commit_pop` (consumer).
pub struct SpscRing {
    write_idx: CacheAligned<AtomicUsize>,
    read_idx: CacheAligned<AtomicUsize>,
    base: *mut u8,
    _mmap: MmapMut, // keeps the mapping alive
    capacity: usize,
    mask: usize,
}

impl SpscRing {
    pub fn new() -> Self {
        let slot_size = std::mem::size_of::<RingSlot>();
        let total = slot_size * RING_CAPACITY;
        let mut mmap = MmapMut::map_anon(total).expect("ring mmap failed");
        let base = mmap.as_mut_ptr();

        Self {
            write_idx: CacheAligned(AtomicUsize::new(0)),
            read_idx: CacheAligned(AtomicUsize::new(0)),
            base,
            _mmap: mmap,
            capacity: RING_CAPACITY,
            mask: RING_CAPACITY - 1,
        }
    }

    /// Producer: get a mutable reference to the next write slot.
    /// Returns `None` if the ring is full.
    pub fn try_push(&self) -> Option<&mut RingSlot> {
        let w = self.write_idx.0.load(Ordering::Relaxed);
        let r = self.read_idx.0.load(Ordering::Acquire);

        if w.wrapping_sub(r) >= self.capacity {
            return None;
        }

        let slot_size = std::mem::size_of::<RingSlot>();
        let offset = (w & self.mask) * slot_size;
        // Safety: SPSC guarantees exclusive write access to this slot.
        // The underlying mmap is writable (MAP_PRIVATE + PROT_WRITE).
        let slot = unsafe { &mut *(self.base.add(offset) as *mut RingSlot) };
        Some(slot)
    }

    /// Producer: commit the write (call after filling the slot from `try_push`).
    pub fn commit_push(&self) {
        let w = self.write_idx.0.load(Ordering::Relaxed);
        self.write_idx.0.store(w.wrapping_add(1), Ordering::Release);
    }

    /// Consumer: get a reference to the next read slot.
    /// Returns `None` if the ring is empty.
    pub fn try_pop(&self) -> Option<&RingSlot> {
        let r = self.read_idx.0.load(Ordering::Relaxed);
        let w = self.write_idx.0.load(Ordering::Acquire);

        if r == w {
            return None; // empty
        }

        let slot_size = std::mem::size_of::<RingSlot>();
        let offset = (r & self.mask) * slot_size;
        let slot = unsafe { &*(self.base.add(offset) as *const RingSlot) };
        Some(slot)
    }

    /// Consumer: commit the read (call after processing the slot from `try_pop`).
    pub fn commit_pop(&self) {
        let r = self.read_idx.0.load(Ordering::Relaxed);
        self.read_idx.0.store(r.wrapping_add(1), Ordering::Release);
    }

    /// Number of items currently in the ring (approximate — racy between threads).
    pub fn len(&self) -> usize {
        let w = self.write_idx.0.load(Ordering::Relaxed);
        let r = self.read_idx.0.load(Ordering::Relaxed);
        w.wrapping_sub(r)
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    pub fn is_full(&self) -> bool {
        self.len() >= self.capacity
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

impl Default for SpscRing {
    fn default() -> Self {
        Self::new()
    }
}

// Safety: SPSC ring is safe to share between exactly 2 threads
// (one producer, one consumer). The atomic indices + Acquire/Release
// ordering provide the necessary synchronization.
unsafe impl Send for SpscRing {}
unsafe impl Sync for SpscRing {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_push_pop_single() {
        let ring = SpscRing::new();
        assert!(ring.is_empty());

        let slot = ring.try_push().unwrap();
        let msg = b"hello world";
        slot.data[..msg.len()].copy_from_slice(msg);
        slot.len = msg.len() as u32;
        slot.source_board = 1;
        ring.commit_push();

        assert_eq!(ring.len(), 1);

        let slot = ring.try_pop().unwrap();
        let text = &slot.data[..slot.len as usize];
        assert_eq!(text, b"hello world");
        assert_eq!(slot.source_board, 1);
        ring.commit_pop();

        assert!(ring.is_empty());
    }

    #[test]
    fn test_push_pop_multiple() {
        let ring = SpscRing::new();

        for i in 0..100 {
            let slot = ring.try_push().unwrap();
            let msg = format!("message-{}", i);
            slot.data[..msg.len()].copy_from_slice(msg.as_bytes());
            slot.len = msg.len() as u32;
            ring.commit_push();
        }

        assert_eq!(ring.len(), 100);

        for i in 0..100 {
            let slot = ring.try_pop().unwrap();
            let text = std::str::from_utf8(&slot.data[..slot.len as usize]).unwrap();
            assert_eq!(text, format!("message-{}", i));
            ring.commit_pop();
        }

        assert!(ring.is_empty());
    }

    #[test]
    fn test_empty_pop() {
        let ring = SpscRing::new();
        assert!(ring.try_pop().is_none());
    }

    #[test]
    fn test_interleaved() {
        let ring = SpscRing::new();

        // Push 3, pop 2, push 2, pop 3
        for i in 0..3 {
            let slot = ring.try_push().unwrap();
            slot.len = i as u32;
            ring.commit_push();
        }
        assert_eq!(ring.len(), 3);

        for _ in 0..2 {
            let _ = ring.try_pop().unwrap();
            ring.commit_pop();
        }
        assert_eq!(ring.len(), 1);

        for _ in 0..2 {
            let slot = ring.try_push().unwrap();
            slot.len = 99;
            ring.commit_push();
        }
        assert_eq!(ring.len(), 3);

        for _ in 0..3 {
            let _ = ring.try_pop().unwrap();
            ring.commit_pop();
        }
        assert!(ring.is_empty());
    }

    #[test]
    fn test_capacity() {
        let ring = SpscRing::new();
        assert_eq!(ring.capacity(), RING_CAPACITY);
    }
}
