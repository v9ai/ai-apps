/// Memory-mapped embedding index — custom binary format.
///
/// On-disk format `EMBIDX01`:
///   Header (64 bytes): magic, version, dim, count, quantization
///   Vectors section: for each vector, QuantParams (8 bytes) + INT8 data (dim bytes)
///   Metadata section: for each vector, VectorMeta (32 bytes)
///
/// INT8 quantization: 384-dim vector = 392 bytes (vs 1,536 FP32).
/// 10K jobs = 4.1 MB — fits entirely in M1's 8MB SLC.

use memmap2::MmapMut;
use std::sync::atomic::{AtomicU32, Ordering};

use super::filter::{SearchFilter, VectorMeta, VECTOR_META_SIZE};
use super::simd;

const EMBED_MAGIC: &[u8; 8] = b"EMBIDX01";
const EMBED_HEADER_SIZE: usize = 64;

#[repr(C)]
#[derive(Clone, Copy)]
struct EmbedHeader {
    magic: [u8; 8],
    version: u32,
    dim: u32,
    count: u32,
    quantization: u32, // 0=FP32, 1=INT8
    _reserved: [u8; 40],
}

pub struct EmbeddingIndex {
    mmap: MmapMut,
    dim: usize,
    capacity: usize,
    count: AtomicU32,
    vector_stride: usize, // 8 + dim (QuantParams + INT8 data)
    meta_offset: usize,   // byte offset where metadata section starts
}

impl EmbeddingIndex {
    /// Create a new embedding index file at `path`.
    pub fn create(path: &str, dim: usize, capacity: usize) -> std::io::Result<Self> {
        let vector_stride = 8 + dim; // scale(4) + bias(4) + int8_data(dim)
        let vectors_size = vector_stride * capacity;
        let meta_size = VECTOR_META_SIZE * capacity;
        let total_size = EMBED_HEADER_SIZE + vectors_size + meta_size;

        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(true)
            .open(path)?;
        file.set_len(total_size as u64)?;

        let mut mmap = unsafe { MmapMut::map_mut(&file)? };

        let header = EmbedHeader {
            magic: *EMBED_MAGIC,
            version: 1,
            dim: dim as u32,
            count: 0,
            quantization: 1, // INT8
            _reserved: [0; 40],
        };
        unsafe {
            std::ptr::copy_nonoverlapping(
                &header as *const _ as *const u8,
                mmap.as_mut_ptr(),
                EMBED_HEADER_SIZE,
            );
        }

        let meta_offset = EMBED_HEADER_SIZE + vectors_size;

        Ok(Self {
            mmap,
            dim,
            capacity,
            count: AtomicU32::new(0),
            vector_stride,
            meta_offset,
        })
    }

    /// Open an existing embedding index file.
    pub fn open(path: &str) -> std::io::Result<Self> {
        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(path)?;
        let mmap = unsafe { MmapMut::map_mut(&file)? };

        let header = unsafe { &*(mmap.as_ptr() as *const EmbedHeader) };
        assert_eq!(&header.magic, EMBED_MAGIC, "invalid magic");
        assert_eq!(header.version, 1, "unsupported version");
        assert_eq!(header.quantization, 1, "only INT8 supported");

        let dim = header.dim as usize;
        let count = header.count;
        let vector_stride = 8 + dim;
        let capacity =
            (mmap.len() - EMBED_HEADER_SIZE) / (vector_stride + VECTOR_META_SIZE);
        let meta_offset = EMBED_HEADER_SIZE + vector_stride * capacity;

        Ok(Self {
            mmap,
            dim,
            capacity,
            count: AtomicU32::new(count),
            vector_stride,
            meta_offset,
        })
    }

    /// Quantize an FP32 embedding to INT8 and append to the index.
    /// Returns the vector's index.
    pub fn append(&self, embedding: &[f32], meta: &VectorMeta) -> u32 {
        assert_eq!(embedding.len(), self.dim);
        let idx = self.count.fetch_add(1, Ordering::SeqCst);
        assert!(
            (idx as usize) < self.capacity,
            "index full: {} >= {}",
            idx,
            self.capacity
        );

        // Find min/max for quantization
        let mut min_val = f32::MAX;
        let mut max_val = f32::MIN;
        for &v in embedding {
            if v < min_val {
                min_val = v;
            }
            if v > max_val {
                max_val = v;
            }
        }
        let range = max_val - min_val;
        let scale = if range > 1e-10 { range / 255.0 } else { 1.0 };
        let bias = min_val;

        // Write quantization params + quantized data.
        // Safety: mmap is writable, atomic counter ensures no concurrent writes to same slot.
        let vec_offset = EMBED_HEADER_SIZE + idx as usize * self.vector_stride;
        let base = self.mmap.as_ptr() as *mut u8;

        unsafe {
            let vec_ptr = base.add(vec_offset);
            // Write scale and bias
            std::ptr::write_unaligned(vec_ptr as *mut f32, scale);
            std::ptr::write_unaligned(vec_ptr.add(4) as *mut f32, bias);

            // Quantize and write INT8 values
            let data_ptr = vec_ptr.add(8);
            for (i, &v) in embedding.iter().enumerate() {
                let quantized = ((v - bias) / scale).round().clamp(0.0, 255.0) as u8;
                *data_ptr.add(i) = quantized;
            }

            // Write metadata
            let meta_ptr = base.add(self.meta_offset + idx as usize * VECTOR_META_SIZE);
            std::ptr::copy_nonoverlapping(
                meta as *const VectorMeta as *const u8,
                meta_ptr,
                VECTOR_META_SIZE,
            );

            // Update header count (offset 16: after magic[8] + version[4] + dim[4])
            let count_ptr = base.add(16) as *mut u32;
            std::ptr::write(count_ptr, idx + 1);
        }

        idx
    }

    /// Get metadata for a vector by index.
    #[inline(always)]
    pub fn get_meta(&self, idx: u32) -> &VectorMeta {
        let offset = self.meta_offset + idx as usize * VECTOR_META_SIZE;
        unsafe { &*(self.mmap.as_ptr().add(offset) as *const VectorMeta) }
    }

    /// Get mutable metadata for a vector.
    #[inline(always)]
    pub fn get_meta_mut(&self, idx: u32) -> &mut VectorMeta {
        let offset = self.meta_offset + idx as usize * VECTOR_META_SIZE;
        unsafe { &mut *(self.mmap.as_ptr().add(offset) as *mut VectorMeta) }
    }

    /// Get raw quantized vector: (scale, bias, int8_data).
    #[inline(always)]
    fn get_quant_vector(&self, idx: u32) -> (f32, f32, &[u8]) {
        let offset = EMBED_HEADER_SIZE + idx as usize * self.vector_stride;
        let ptr = unsafe { self.mmap.as_ptr().add(offset) };
        let scale = unsafe { std::ptr::read_unaligned(ptr as *const f32) };
        let bias = unsafe { std::ptr::read_unaligned(ptr.add(4) as *const f32) };
        let data = unsafe { std::slice::from_raw_parts(ptr.add(8), self.dim) };
        (scale, bias, data)
    }

    /// Brute-force similarity search with pre-similarity filtering.
    /// Returns top-K `(index, score)` pairs sorted by score descending.
    pub fn search(
        &self,
        query: &[f32],
        top_k: usize,
        filter: &SearchFilter,
    ) -> Vec<(u32, f32)> {
        assert_eq!(query.len(), self.dim);
        let n = self.count.load(Ordering::Relaxed);
        if n == 0 {
            return Vec::new();
        }

        let query_norm = {
            let mut sum = 0.0f32;
            for &v in query {
                sum += v * v;
            }
            sum.sqrt()
        };
        if query_norm == 0.0 {
            return Vec::new();
        }

        let mut heap: Vec<(u32, f32)> = Vec::with_capacity(top_k + 1);

        for idx in 0..n {
            let meta = self.get_meta(idx);

            // Filter BEFORE computing similarity (skip early)
            if !filter.matches(meta) {
                continue;
            }

            let (scale, bias, quant_data) = self.get_quant_vector(idx);
            let score = simd::cosine_sim_int8(query, quant_data, scale, bias, query_norm, self.dim);

            if heap.len() < top_k {
                heap.push((idx, score));
                if heap.len() == top_k {
                    heap.sort_unstable_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
                }
            } else if score > heap[0].1 {
                heap[0] = (idx, score);
                heap.sort_unstable_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
            }
        }

        // Sort descending by score
        heap.sort_unstable_by(|a, b| {
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        });
        heap
    }

    pub fn count(&self) -> u32 {
        self.count.load(Ordering::Relaxed)
    }
    pub fn dim(&self) -> usize {
        self.dim
    }
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Flush mmap to disk.
    pub fn sync(&self) -> std::io::Result<()> {
        self.mmap.flush()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_path(name: &str) -> String {
        format!("/tmp/leadgen-test-{}-{}", name, std::process::id())
    }

    #[test]
    fn test_create_and_append() {
        let path = temp_path("embed-create");
        let idx = EmbeddingIndex::create(&path, 4, 100).unwrap();

        let embedding = vec![0.1, 0.2, 0.3, 0.4];
        let mut meta = VectorMeta::new();
        meta.set_job_id("job-001");
        meta.remote_policy = 1;
        meta.salary_min_k = 150;
        meta.salary_max_k = 200;

        let vec_idx = idx.append(&embedding, &meta);
        assert_eq!(vec_idx, 0);
        assert_eq!(idx.count(), 1);

        let stored_meta = idx.get_meta(0);
        assert_eq!(stored_meta.job_id_str(), "job-001");
        assert_eq!(stored_meta.remote_policy, 1);

        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn test_search() {
        let path = temp_path("embed-search");
        let idx = EmbeddingIndex::create(&path, 4, 100).unwrap();

        // Insert 3 vectors
        let embeddings = [
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.9, 0.1, 0.0, 0.0],
            vec![0.0, 0.0, 1.0, 0.0],
        ];
        for (i, emb) in embeddings.iter().enumerate() {
            let mut meta = VectorMeta::new();
            meta.set_job_id(&format!("job-{}", i));
            meta.remote_policy = 1;
            idx.append(emb, &meta);
        }

        let results = idx.search(&[1.0, 0.0, 0.0, 0.0], 2, &SearchFilter::all());
        assert_eq!(results.len(), 2);
        // First result should be the exact match (index 0)
        assert_eq!(results[0].0, 0);
        assert!(results[0].1 > 0.95);

        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn test_search_with_filter() {
        let path = temp_path("embed-filter");
        let idx = EmbeddingIndex::create(&path, 4, 100).unwrap();

        // Insert 2 vectors: one remote, one onsite
        let emb = vec![1.0, 0.0, 0.0, 0.0];
        let mut meta_remote = VectorMeta::new();
        meta_remote.remote_policy = 1;
        idx.append(&emb, &meta_remote);

        let mut meta_onsite = VectorMeta::new();
        meta_onsite.remote_policy = 3;
        idx.append(&[0.9, 0.1, 0.0, 0.0], &meta_onsite);

        // Search remote only
        let results = idx.search(&[1.0, 0.0, 0.0, 0.0], 10, &SearchFilter::remote());
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, 0); // only the remote one

        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn test_open_existing() {
        let path = temp_path("embed-reopen");
        {
            let idx = EmbeddingIndex::create(&path, 4, 100).unwrap();
            let emb = vec![0.5, 0.5, 0.5, 0.5];
            let mut meta = VectorMeta::new();
            meta.set_job_id("persist");
            idx.append(&emb, &meta);
            idx.sync().unwrap();
        }

        // Reopen
        let idx = EmbeddingIndex::open(&path).unwrap();
        assert_eq!(idx.count(), 1);
        assert_eq!(idx.dim(), 4);
        assert_eq!(idx.get_meta(0).job_id_str(), "persist");

        std::fs::remove_file(&path).ok();
    }
}
