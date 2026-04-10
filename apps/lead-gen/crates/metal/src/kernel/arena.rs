use memmap2::MmapMut;
use std::cell::Cell;

/// Memory statistics for arena allocators.
#[derive(Debug, Clone, Copy)]
pub struct ArenaStats {
    pub bytes_used: usize,
    pub bytes_available: usize,
    pub bytes_capacity: usize,
    pub allocation_count: u64,
    pub peak_bytes_used: usize,
}

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

    /// Return a snapshot of memory usage statistics.
    pub fn stats(&self) -> ArenaStats {
        ArenaStats {
            bytes_used: self.offset.get(),
            bytes_available: self.capacity - self.offset.get(),
            bytes_capacity: self.capacity,
            allocation_count: self.alloc_count.get(),
            peak_bytes_used: self.peak.get(),
        }
    }
}

// Safety: Arena uses Cell (not thread-safe by design).
// For multi-threaded use, wrap in per-thread instances.

// ── ScoringArena: cache-line-aligned arena for batch scoring ────────────────

/// Bytes per feature vector: one cache line (64 bytes) per contact.
/// Accommodates 9 f32s (7 base features + 1 semantic + 1 score = 36 bytes)
/// with 28 bytes of padding for cache-line alignment.
const FEATURE_VECTOR_BYTES: usize = 64;

/// Cache-line-aligned block header for the scoring arena's backing memory.
/// Forces the mmap region to start on a 64-byte boundary when embedded in a struct.
#[repr(C, align(64))]
struct AlignedBlock {
    _align: [u8; 0],
}

/// Specialized arena allocator for batch contact scoring.
///
/// Pre-allocates a contiguous, cache-line-aligned memory region sized for
/// `batch_size` feature vectors. All allocations are bump-pointer — O(1).
/// `reset()` recycles the memory without deallocation (zero-cost reuse between batches).
///
/// Layout guarantees:
/// - Backing memory is 64-byte aligned (cache-line boundary on Apple M1/M2).
/// - Each `alloc_f32_slice` / `alloc_aligned` returns pointers aligned to the
///   requested type's natural alignment (or 64 bytes for f32 slices).
pub struct ScoringArena {
    mmap: MmapMut,
    capacity: usize,
    offset: usize,
    peak: usize,
    alloc_count: u64,
    batch_size: usize,
}

impl ScoringArena {
    /// Create a new scoring arena pre-sized for `batch_size` feature vectors.
    /// Each vector occupies `FEATURE_VECTOR_BYTES` (64) bytes — one cache line.
    /// An additional 10% headroom is allocated for auxiliary scratch space.
    pub fn new(batch_size: usize) -> Self {
        let vectors_bytes = batch_size * FEATURE_VECTOR_BYTES;
        // 10% headroom for auxiliary allocations (indices, temp buffers)
        let headroom = vectors_bytes / 10;
        let total = vectors_bytes + headroom;
        let total_aligned = (total + 4095) & !4095; // page-align

        let mmap = MmapMut::map_anon(total_aligned).expect("scoring arena mmap failed");

        Self {
            mmap,
            capacity: total_aligned,
            offset: 0,
            peak: 0,
            alloc_count: 0,
            batch_size,
        }
    }

    /// Allocate a mutable `&mut [f32]` slice of `len` elements from the arena.
    /// The returned slice is 64-byte (cache-line) aligned and zero-initialized.
    ///
    /// # Panics
    /// Panics if the arena cannot satisfy the allocation.
    #[inline(always)]
    pub fn alloc_f32_slice(&mut self, len: usize) -> &mut [f32] {
        let size = len * std::mem::size_of::<f32>();
        let align = 64; // cache-line align for NEON auto-vectorization

        let aligned = (self.offset + align - 1) & !(align - 1);
        let new_offset = aligned + size;

        if new_offset > self.capacity {
            panic!(
                "ScoringArena OOM: requested {} f32s ({} bytes) at offset {}, capacity {}",
                len, size, self.offset, self.capacity
            );
        }

        let ptr = unsafe { self.mmap.as_ptr().add(aligned) as *mut f32 };

        // Zero-initialize
        unsafe {
            std::ptr::write_bytes(ptr, 0, len);
        }

        self.offset = new_offset;
        if new_offset > self.peak {
            self.peak = new_offset;
        }
        self.alloc_count += 1;

        unsafe { std::slice::from_raw_parts_mut(ptr, len) }
    }

    /// Allocate a mutable slice of `count` elements of type `T`, aligned to
    /// `max(align_of::<T>(), 64)` bytes (cache-line minimum).
    ///
    /// Compile-time alignment check: `T` must not require alignment greater than
    /// 64 bytes (a reasonable upper bound for scoring data types).
    ///
    /// # Panics
    /// Panics if the arena cannot satisfy the allocation.
    #[inline(always)]
    pub fn alloc_aligned<T>(&mut self, count: usize) -> &mut [T] {
        // Compile-time alignment assertion (monomorphized per T).
        const { assert!(std::mem::align_of::<AlignedBlock>() == 64) };

        let t_align = std::mem::align_of::<T>();
        let align = t_align.max(64); // at least cache-line aligned
        let size = std::mem::size_of::<T>() * count;

        let aligned = (self.offset + align - 1) & !(align - 1);
        let new_offset = aligned + size;

        if new_offset > self.capacity {
            panic!(
                "ScoringArena OOM: requested {} x {} ({} bytes) at offset {}, capacity {}",
                count,
                std::any::type_name::<T>(),
                size,
                self.offset,
                self.capacity
            );
        }

        let ptr = unsafe { self.mmap.as_ptr().add(aligned) as *mut T };

        // Zero-initialize the allocation
        unsafe {
            std::ptr::write_bytes(ptr as *mut u8, 0, size);
        }

        self.offset = new_offset;
        if new_offset > self.peak {
            self.peak = new_offset;
        }
        self.alloc_count += 1;

        unsafe { std::slice::from_raw_parts_mut(ptr, count) }
    }

    /// Reset the bump pointer to zero — all prior allocations become invalid.
    /// The underlying mmap is retained, so the next batch reuses the same
    /// physical pages (zero-cost reuse, no syscall overhead).
    #[inline(always)]
    pub fn reset(&mut self) {
        self.offset = 0;
    }

    /// Return a snapshot of memory usage statistics.
    pub fn stats(&self) -> ArenaStats {
        ArenaStats {
            bytes_used: self.offset,
            bytes_available: self.capacity - self.offset,
            bytes_capacity: self.capacity,
            allocation_count: self.alloc_count,
            peak_bytes_used: self.peak,
        }
    }

    /// The batch size this arena was sized for.
    pub fn batch_size(&self) -> usize {
        self.batch_size
    }

    /// Bytes currently allocated.
    pub fn used(&self) -> usize {
        self.offset
    }

    /// Bytes remaining.
    pub fn remaining(&self) -> usize {
        self.capacity - self.offset
    }

    /// Total capacity in bytes.
    pub fn capacity(&self) -> usize {
        self.capacity
    }
}

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

    #[test]
    fn test_arena_stats() {
        let arena = Arena::new(4096);
        let s = arena.stats();
        assert_eq!(s.bytes_used, 0);
        assert_eq!(s.bytes_capacity, 4096);
        assert_eq!(s.bytes_available, 4096);
        assert_eq!(s.allocation_count, 0);
        assert_eq!(s.peak_bytes_used, 0);

        arena.copy_str("hello");
        let s = arena.stats();
        assert!(s.bytes_used > 0);
        assert_eq!(s.allocation_count, 1);
        assert_eq!(s.peak_bytes_used, s.bytes_used);
    }

    // ── ScoringArena tests ──────────────────────────────────────────────

    #[test]
    fn test_scoring_arena_new() {
        let arena = ScoringArena::new(256);
        assert_eq!(arena.batch_size(), 256);
        assert_eq!(arena.used(), 0);
        assert!(arena.capacity() > 0);
        // Capacity should be at least 256 * 64 bytes (feature vectors)
        assert!(arena.capacity() >= 256 * FEATURE_VECTOR_BYTES);
    }

    #[test]
    fn test_scoring_arena_alloc_f32_slice() {
        let mut arena = ScoringArena::new(64);
        let slice = arena.alloc_f32_slice(128);
        assert_eq!(slice.len(), 128);

        // Should be zero-initialized
        for &v in slice.iter() {
            assert_eq!(v, 0.0);
        }

        // Write and read back
        slice[0] = 1.0;
        slice[127] = 42.0;
        assert_eq!(slice[0], 1.0);
        assert_eq!(slice[127], 42.0);

        // Pointer should be 64-byte aligned
        let ptr = slice.as_ptr() as usize;
        assert_eq!(ptr % 64, 0, "f32 slice not 64-byte aligned: ptr=0x{:x}", ptr);
    }

    #[test]
    fn test_scoring_arena_alloc_aligned() {
        let mut arena = ScoringArena::new(64);

        let u32s: &mut [u32] = arena.alloc_aligned(64);
        assert_eq!(u32s.len(), 64);
        // Zero-initialized
        assert!(u32s.iter().all(|&v| v == 0));
        // 64-byte aligned
        let ptr = u32s.as_ptr() as usize;
        assert_eq!(ptr % 64, 0, "u32 slice not cache-line aligned");

        let f64s: &mut [f64] = arena.alloc_aligned(16);
        assert_eq!(f64s.len(), 16);
        let ptr = f64s.as_ptr() as usize;
        assert_eq!(ptr % 64, 0, "f64 slice not cache-line aligned");
    }

    #[test]
    fn test_scoring_arena_reset() {
        let mut arena = ScoringArena::new(64);

        let _ = arena.alloc_f32_slice(128);
        assert!(arena.used() > 0);
        let used_before = arena.used();

        arena.reset();
        assert_eq!(arena.used(), 0);
        assert_eq!(arena.remaining(), arena.capacity());

        // Can allocate again in the same space
        let _ = arena.alloc_f32_slice(128);
        assert!(arena.used() > 0);
        // Same amount of memory used
        assert_eq!(arena.used(), used_before);
    }

    #[test]
    fn test_scoring_arena_stats() {
        let mut arena = ScoringArena::new(64);
        let s0 = arena.stats();
        assert_eq!(s0.bytes_used, 0);
        assert_eq!(s0.allocation_count, 0);

        let _ = arena.alloc_f32_slice(64);
        let s1 = arena.stats();
        assert!(s1.bytes_used > 0);
        assert_eq!(s1.allocation_count, 1);
        assert_eq!(s1.peak_bytes_used, s1.bytes_used);

        let _ = arena.alloc_f32_slice(32);
        let s2 = arena.stats();
        assert_eq!(s2.allocation_count, 2);
        assert!(s2.bytes_used > s1.bytes_used);

        arena.reset();
        let s3 = arena.stats();
        assert_eq!(s3.bytes_used, 0);
        // Peak should NOT decrease after reset
        assert_eq!(s3.peak_bytes_used, s2.peak_bytes_used);
        // Alloc count persists
        assert_eq!(s3.allocation_count, 2);
    }

    #[test]
    fn test_scoring_arena_multiple_batches() {
        let mut arena = ScoringArena::new(32);

        for batch in 0..5 {
            // Allocate features, populate, then drop the borrow before the next alloc.
            let features_ptr: *mut f32;
            {
                let features = arena.alloc_f32_slice(32 * 7); // 7 features per contact
                for i in 0..32 {
                    let base = i * 7;
                    features[base] = (batch * 32 + i) as f32;
                }
                features_ptr = features.as_mut_ptr();
            }

            let scores = arena.alloc_f32_slice(32); // output scores

            // Simulate scoring: read features through raw pointer (borrow released).
            for i in 0..32 {
                let base = i * 7;
                scores[i] = unsafe { *features_ptr.add(base) } * 0.5;
            }

            // Verify last batch's data is correct
            assert_eq!(scores[0], (batch * 32) as f32 * 0.5);
            assert_eq!(scores[31], (batch * 32 + 31) as f32 * 0.5);

            arena.reset();
        }

        let stats = arena.stats();
        assert_eq!(stats.bytes_used, 0);
        assert_eq!(stats.allocation_count, 10); // 2 allocs per batch * 5 batches
    }

    #[test]
    #[should_panic(expected = "ScoringArena OOM")]
    fn test_scoring_arena_oom() {
        let mut arena = ScoringArena::new(4); // tiny arena
        // Try to allocate way more than capacity
        let _ = arena.alloc_f32_slice(1_000_000);
    }

    #[test]
    fn test_scoring_arena_alignment_guarantee() {
        let mut arena = ScoringArena::new(64);

        // Allocate a small odd-sized chunk first to misalign the offset
        let _ = arena.alloc_aligned::<u8>(3);

        // Next allocation should still be 64-byte aligned
        let slice = arena.alloc_f32_slice(16);
        let ptr = slice.as_ptr() as usize;
        assert_eq!(ptr % 64, 0, "alignment broken after odd-sized alloc");
    }
}
