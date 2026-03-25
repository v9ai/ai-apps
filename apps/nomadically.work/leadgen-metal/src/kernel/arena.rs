use memmap2::MmapMut;
use std::cell::Cell;

/// Arena allocator backed by anonymous mmap'd pages.
/// Allocations are pointer bumps — O(1). Entire arena freed at once via `reset()`.
/// No individual deallocation — perfect for request-scoped/batch-scoped data.
pub struct Arena {
    mmap: MmapMut,
    capacity: usize,
    offset: Cell<usize>,
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

    /// Allocate a typed value, returns a mutable reference.
    #[inline(always)]
    pub fn alloc_t<T>(&self) -> &mut T {
        let ptr = self.alloc(std::mem::size_of::<T>(), std::mem::align_of::<T>());
        unsafe { &mut *(ptr as *mut T) }
    }

    /// Allocate a zeroed slice of `count` items.
    #[inline(always)]
    pub fn alloc_slice<T>(&self, count: usize) -> &mut [T] {
        let size = std::mem::size_of::<T>() * count;
        let ptr = self.alloc_zeroed(size, std::mem::align_of::<T>());
        unsafe { std::slice::from_raw_parts_mut(ptr as *mut T, count) }
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
        let nums = arena.alloc_slice::<u64>(10);
        assert_eq!(nums.len(), 10);
        nums[0] = 42;
        nums[9] = 99;
        assert_eq!(nums[0], 42);
        assert_eq!(nums[9], 99);
    }

    #[test]
    fn test_alloc_t() {
        let arena = Arena::new(4096);
        let val: &mut u64 = arena.alloc_t();
        *val = 123456;
        assert_eq!(*val, 123456);
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
}
