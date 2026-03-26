use memmap2::MmapMut;
use std::cell::Cell;

/// Arena allocator backed by anonymous mmap'd pages.
/// Allocations are pointer bumps — O(1). Entire arena freed at once via `reset()`.
/// No individual deallocation — perfect for request-scoped/batch-scoped data.
///
/// Enhanced with savepoint/restore for sub-arena semantics and peak usage tracking.
pub struct Arena {
    mmap: MmapMut,
    capacity: usize,
    offset: Cell<usize>,
    peak: Cell<usize>,
    alloc_count: Cell<u64>,
}

impl Arena {
    /// Allocate a new arena of at least `size` bytes via anonymous mmap.
    pub fn new(size: usize) -> Self {
        let size = (size + 4095) & !4095; // page-align
        let mmap = MmapMut::map_anon(size).expect("arena mmap failed");
        Self {
            mmap,
            capacity: size,
            offset: Cell::new(0),
            peak: Cell::new(0),
            alloc_count: Cell::new(0),
        }
    }

    /// Allocate `size` bytes aligned to `align`.
    #[inline(always)]
    pub fn alloc(&self, size: usize, align: usize) -> *mut u8 {
        let current = self.offset.get();
        let aligned = (current + align - 1) & !(align - 1);
        let new_offset = aligned + size;

        if new_offset > self.capacity {
            panic!(
                "arena OOM: requested {} at offset {}, capacity {}",
                size, current, self.capacity
            );
        }

        self.offset.set(new_offset);
        if new_offset > self.peak.get() {
            self.peak.set(new_offset);
        }
        self.alloc_count.set(self.alloc_count.get() + 1);
        unsafe { self.mmap.as_ptr().add(aligned) as *mut u8 }
    }

    /// Allocate and zero-initialize `size` bytes.
    #[inline(always)]
    pub fn alloc_zeroed(&self, size: usize, align: usize) -> *mut u8 {
        let ptr = self.alloc(size, align);
        unsafe {
            std::ptr::write_bytes(ptr, 0, size);
        }
        ptr
    }

    /// Allocate a typed value, returns a mutable pointer.
    /// # Safety
    /// The returned pointer is valid until `reset()` is called.
    #[inline(always)]
    pub fn alloc_t<T>(&self) -> *mut T {
        self.alloc(std::mem::size_of::<T>(), std::mem::align_of::<T>()) as *mut T
    }

    /// Allocate a zeroed slice of `count` items, returns a raw pointer + len.
    /// # Safety
    /// The returned pointer is valid until `reset()` is called.
    #[inline(always)]
    pub fn alloc_slice_ptr<T>(&self, count: usize) -> *mut T {
        let size = std::mem::size_of::<T>() * count;
        self.alloc_zeroed(size, std::mem::align_of::<T>()) as *mut T
    }

    /// Copy a byte slice into the arena, returns a reference to the copy.
    #[inline(always)]
    pub fn copy_bytes(&self, src: &[u8]) -> &[u8] {
        if src.is_empty() {
            return &[];
        }
        let dst = self.alloc(src.len(), 1);
        unsafe {
            std::ptr::copy_nonoverlapping(src.as_ptr(), dst, src.len());
            std::slice::from_raw_parts(dst, src.len())
        }
    }

    /// Copy a string into the arena, returns a reference to the copy.
    #[inline(always)]
    pub fn copy_str(&self, s: &str) -> &str {
        let bytes = self.copy_bytes(s.as_bytes());
        unsafe { std::str::from_utf8_unchecked(bytes) }
    }

    /// Create a savepoint — can be rolled back with `restore()`.
    /// Enables sub-arena semantics: temporary allocations freed without
    /// affecting earlier allocations.
    #[inline(always)]
    pub fn savepoint(&self) -> usize {
        self.offset.get()
    }

    /// Restore to a previous savepoint — frees all allocations made after it.
    #[inline(always)]
    pub fn restore(&self, savepoint: usize) {
        debug_assert!(savepoint <= self.offset.get(), "restore beyond current offset");
        self.offset.set(savepoint);
    }

    /// Reset arena — all prior allocations become invalid.
    /// The underlying memory is retained for reuse.
    #[inline(always)]
    pub fn reset(&self) {
        self.offset.set(0);
    }

    /// Bytes currently allocated.
    pub fn used(&self) -> usize {
        self.offset.get()
    }

    /// Bytes remaining.
    pub fn remaining(&self) -> usize {
        self.capacity - self.offset.get()
    }

    /// Total capacity.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// High-water mark — maximum bytes ever allocated before any reset/restore.
    pub fn peak_usage(&self) -> usize {
        self.peak.get()
    }

    /// Total number of allocations performed.
    pub fn alloc_count(&self) -> u64 {
        self.alloc_count.get()
    }

    /// Base pointer of the arena (for offset calculations).
    pub fn base_ptr(&self) -> *const u8 {
        self.mmap.as_ptr()
    }
}

// Safety: Arena uses Cell (not thread-safe by design).
// For multi-threaded use, wrap in per-thread instances.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_alloc() {
        let arena = Arena::new(4096);
        let s1 = arena.copy_str("hello");
        let s2 = arena.copy_str("world");
        assert_eq!(s1, "hello");
        assert_eq!(s2, "world");
        assert!(arena.used() >= 10);
    }

    #[test]
    fn test_alloc_slice() {
        let arena = Arena::new(4096);
        let ptr = arena.alloc_slice_ptr::<u64>(10);
        unsafe {
            let nums = std::slice::from_raw_parts_mut(ptr, 10);
            nums[0] = 42;
            nums[9] = 99;
            assert_eq!(nums[0], 42);
            assert_eq!(nums[9], 99);
        }
    }

    #[test]
    fn test_alloc_t() {
        let arena = Arena::new(4096);
        let ptr = arena.alloc_t::<u64>();
        unsafe {
            *ptr = 123456;
            assert_eq!(*ptr, 123456);
        }
    }

    #[test]
    fn test_reset() {
        let arena = Arena::new(4096);
        arena.copy_str("some data");
        assert!(arena.used() > 0);
        arena.reset();
        assert_eq!(arena.used(), 0);
        assert_eq!(arena.remaining(), arena.capacity());
    }

    #[test]
    fn test_alignment() {
        let arena = Arena::new(4096);
        arena.alloc(1, 1); // 1-byte alloc, 1-byte align
        let ptr = arena.alloc(8, 8); // 8-byte alloc, 8-byte align
        assert_eq!(ptr as usize % 8, 0);
    }

    #[test]
    #[should_panic(expected = "arena OOM")]
    fn test_oom() {
        let arena = Arena::new(4096);
        arena.alloc(8192, 1);
    }

    #[test]
    fn test_copy_empty() {
        let arena = Arena::new(4096);
        let empty = arena.copy_bytes(&[]);
        assert!(empty.is_empty());
        let empty_str = arena.copy_str("");
        assert!(empty_str.is_empty());
    }

    #[test]
    fn test_savepoint_restore() {
        let arena = Arena::new(4096);
        let s1 = arena.copy_str("keep this");
        let before = arena.used();
        let sp = arena.savepoint();

        // Temporary allocations
        let _ = arena.copy_str("temporary data that will be freed");
        let _ = arena.alloc_slice_ptr::<u64>(100);
        assert!(arena.used() > before);

        arena.restore(sp);
        assert_eq!(arena.used(), before);

        // Can allocate again in the freed space
        let s2 = arena.copy_str("new data");
        assert_eq!(s1, "keep this");
        assert_eq!(s2, "new data");
    }

    #[test]
    fn test_peak_usage() {
        let arena = Arena::new(4096);
        let _ = arena.copy_str("hello");
        let peak1 = arena.peak_usage();

        let _ = arena.alloc_slice_ptr::<u8>(1000);
        let peak2 = arena.peak_usage();
        assert!(peak2 > peak1);

        arena.reset();
        // Peak should not decrease after reset
        assert_eq!(arena.peak_usage(), peak2);
    }

    #[test]
    fn test_alloc_count() {
        let arena = Arena::new(4096);
        assert_eq!(arena.alloc_count(), 0);
        arena.copy_str("one");
        assert_eq!(arena.alloc_count(), 1);
        arena.copy_str("two");
        assert_eq!(arena.alloc_count(), 2);
        arena.reset();
        // Count persists after reset
        arena.copy_str("three");
        assert_eq!(arena.alloc_count(), 3);
    }
}
