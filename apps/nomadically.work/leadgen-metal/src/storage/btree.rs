use std::collections::BTreeMap;
use parking_lot::RwLock;

/// Record location: (page_id, slot_index)
#[derive(Clone, Copy, Debug)]
pub struct RecordPtr {
    pub page_id: u32,
    pub slot_idx: u16,
}

/// Trait for B-tree index implementations (in-memory or disk-resident).
pub trait BTreeOps: Send + Sync {
    fn insert(&self, key: &[u8], ptr: RecordPtr);
    fn get(&self, key: &[u8]) -> Option<RecordPtr>;
    fn delete(&self, key: &[u8]) -> bool;
    fn prefix_scan(&self, prefix: &[u8]) -> Vec<(Vec<u8>, RecordPtr)>;
    fn len(&self) -> usize;
    fn is_empty(&self) -> bool { self.len() == 0 }
    /// Flush to disk (no-op for in-memory implementations).
    fn sync(&self) -> std::io::Result<()> { Ok(()) }
}

/// In-memory B-tree index mapping string keys to record locations.
/// Rebuilt from WAL on startup.
pub struct MemoryBTreeIndex {
    inner: RwLock<BTreeMap<Vec<u8>, RecordPtr>>,
}

impl Default for MemoryBTreeIndex {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryBTreeIndex {
    pub fn new() -> Self {
        Self { inner: RwLock::new(BTreeMap::new()) }
    }

    /// Rebuild index from WAL — only needed for in-memory implementation.
    pub fn rebuild_from_wal(&self, wal: &super::wal::WriteAheadLog, key_extractor: fn(&[u8]) -> Option<Vec<u8>>) {
        let mut map = self.inner.write();
        map.clear();

        for (header, data) in wal.iter() {
            if let Some(key) = key_extractor(data) {
                map.insert(key, RecordPtr {
                    page_id: (header.sequence >> 16) as u32,
                    slot_idx: (header.sequence & 0xFFFF) as u16,
                });
            }
        }
    }
}

impl BTreeOps for MemoryBTreeIndex {
    fn insert(&self, key: &[u8], ptr: RecordPtr) {
        self.inner.write().insert(key.to_vec(), ptr);
    }

    fn get(&self, key: &[u8]) -> Option<RecordPtr> {
        self.inner.read().get(key).copied()
    }

    fn delete(&self, key: &[u8]) -> bool {
        self.inner.write().remove(key).is_some()
    }

    fn prefix_scan(&self, prefix: &[u8]) -> Vec<(Vec<u8>, RecordPtr)> {
        let map = self.inner.read();
        let start = prefix.to_vec();
        let mut end = prefix.to_vec();

        if let Some(last) = end.last_mut() {
            *last = last.wrapping_add(1);
        }

        map.range(start..end)
            .map(|(k, v)| (k.clone(), *v))
            .collect()
    }

    fn len(&self) -> usize {
        self.inner.read().len()
    }
}

// Backwards compatibility alias
pub type BTreeIndex = MemoryBTreeIndex;
