use memmap2::MmapMut;
use std::io;
use std::path::Path;

use crate::storage::btree::{BTreeOps, RecordPtr};

const PAGE_SIZE: usize = 4096;
const KEY_SIZE: usize = 24;

/// B+ tree node header (16 bytes)
#[repr(C)]
#[derive(Clone, Copy)]
struct NodeHeader {
    flags: u16,       // bit 0: is_leaf, bit 1: is_root
    num_keys: u16,
    parent: u32,
    right_sibling: u32,
    _reserved: u32,
}

const NODE_FLAG_LEAF: u16 = 1;
const NODE_FLAG_ROOT: u16 = 2;
const NODE_HEADER_SIZE: usize = std::mem::size_of::<NodeHeader>(); // 16

/// Fixed 24-byte key, zero-padded.
#[repr(C)]
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct BPlusKey {
    pub data: [u8; KEY_SIZE],
}

impl BPlusKey {
    pub fn from_bytes(src: &[u8]) -> Self {
        let mut data = [0u8; KEY_SIZE];
        let len = src.len().min(KEY_SIZE);
        data[..len].copy_from_slice(&src[..len]);
        Self { data }
    }

    pub fn as_str(&self) -> &str {
        let end = self.data.iter().position(|&b| b == 0).unwrap_or(KEY_SIZE);
        std::str::from_utf8(&self.data[..end]).unwrap_or("")
    }

    pub fn to_vec(&self) -> Vec<u8> {
        let end = self.data.iter().position(|&b| b == 0).unwrap_or(KEY_SIZE);
        self.data[..end].to_vec()
    }

    #[inline(always)]
    fn cmp_bytes(&self, other: &Self) -> std::cmp::Ordering {
        self.data.cmp(&other.data)
    }
}

/// Value stored in leaf nodes — maps to RecordPtr.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct BPlusValue {
    pub page_id: u32,
    pub slot_idx: u16,
    pub flags: u16,
}

impl BPlusValue {
    fn from_record_ptr(ptr: RecordPtr) -> Self {
        Self {
            page_id: ptr.page_id,
            slot_idx: ptr.slot_idx,
            flags: 0,
        }
    }

    fn to_record_ptr(self) -> RecordPtr {
        RecordPtr {
            page_id: self.page_id,
            slot_idx: self.slot_idx,
        }
    }
}

const VALUE_SIZE: usize = std::mem::size_of::<BPlusValue>(); // 8
const CHILD_PTR_SIZE: usize = 4; // u32 page ID

// Max keys per leaf: (PAGE_SIZE - HEADER) / (KEY + VALUE)
const LEAF_MAX_KEYS: usize = (PAGE_SIZE - NODE_HEADER_SIZE) / (KEY_SIZE + VALUE_SIZE); // ~127

// Max keys per internal: (PAGE_SIZE - HEADER - one_extra_child) / (KEY + CHILD_PTR)
const INTERNAL_MAX_KEYS: usize =
    (PAGE_SIZE - NODE_HEADER_SIZE - CHILD_PTR_SIZE) / (KEY_SIZE + CHILD_PTR_SIZE); // ~145

/// Disk-resident B+ tree — mmap'd, cache-line-sized nodes,
/// binary search within nodes, leaf-level linked list.
pub struct BPlusTree {
    mmap: MmapMut,
    file: std::fs::File,
    num_pages: u32,
    root_page: u32,
    file_capacity: u64,
    _path: String,
}

impl BPlusTree {
    /// Open an existing B+ tree or create a new one.
    pub fn open(path: &str, initial_pages: u32) -> io::Result<Self> {
        let path_obj = Path::new(path);
        let exists = path_obj.exists() && std::fs::metadata(path)?.len() > 0;

        let file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(path)?;

        let initial_pages = initial_pages.max(16);
        let min_size = initial_pages as u64 * PAGE_SIZE as u64;

        if !exists {
            file.set_len(min_size)?;
        } else {
            let len = file.metadata()?.len();
            if len < min_size {
                file.set_len(min_size)?;
            }
        }

        let file_len = file.metadata()?.len();
        let mmap = unsafe { memmap2::MmapOptions::new().len(file_len as usize).map_mut(&file)? };

        let mut tree = Self {
            mmap,
            file,
            num_pages: 1,
            root_page: 0,
            file_capacity: file_len,
            _path: path.to_string(),
        };

        if !exists {
            // Initialize root as empty leaf
            tree.init_leaf(0);
            let header = tree.node_header_mut(0);
            header.flags |= NODE_FLAG_ROOT | NODE_FLAG_LEAF;
        } else {
            // Scan to find num_pages and root
            tree.recover();
        }

        Ok(tree)
    }

    /// Recover tree state from existing file.
    fn recover(&mut self) {
        let capacity = self.file_capacity as u32 / PAGE_SIZE as u32;
        let mut max_used = 0u32;
        let mut root = 0u32;

        for i in 0..capacity {
            let header = self.node_header(i);
            if header.num_keys > 0 || header.flags != 0 {
                max_used = i + 1;
                if header.flags & NODE_FLAG_ROOT != 0 {
                    root = i;
                }
            }
        }

        self.num_pages = max_used.max(1);
        self.root_page = root;
    }

    fn page_ptr(&self, page_id: u32) -> *const u8 {
        unsafe { self.mmap.as_ptr().add(page_id as usize * PAGE_SIZE) }
    }

    fn page_ptr_mut(&mut self, page_id: u32) -> *mut u8 {
        unsafe { self.mmap.as_ptr().add(page_id as usize * PAGE_SIZE) as *mut u8 }
    }

    fn node_header(&self, page_id: u32) -> &NodeHeader {
        unsafe { &*(self.page_ptr(page_id) as *const NodeHeader) }
    }

    fn node_header_mut(&mut self, page_id: u32) -> &mut NodeHeader {
        unsafe { &mut *(self.page_ptr_mut(page_id) as *mut NodeHeader) }
    }

    fn init_leaf(&mut self, page_id: u32) {
        let ptr = self.page_ptr_mut(page_id);
        unsafe { std::ptr::write_bytes(ptr, 0, PAGE_SIZE); }
        let header = self.node_header_mut(page_id);
        header.flags = NODE_FLAG_LEAF;
        header.num_keys = 0;
        header.right_sibling = 0;
    }

    fn init_internal(&mut self, page_id: u32) {
        let ptr = self.page_ptr_mut(page_id);
        unsafe { std::ptr::write_bytes(ptr, 0, PAGE_SIZE); }
        // flags = 0 (not leaf, not root)
    }

    fn is_leaf(&self, page_id: u32) -> bool {
        self.node_header(page_id).flags & NODE_FLAG_LEAF != 0
    }

    /// Allocate a new page, growing the file if needed.
    fn alloc_page(&mut self) -> io::Result<u32> {
        let page_id = self.num_pages;
        self.num_pages += 1;

        let needed = self.num_pages as u64 * PAGE_SIZE as u64;
        if needed > self.file_capacity {
            let new_cap = (self.file_capacity * 2).max(needed);
            self.file.set_len(new_cap)?;
            self.mmap = unsafe {
                memmap2::MmapOptions::new()
                    .len(new_cap as usize)
                    .map_mut(&self.file)?
            };
            self.file_capacity = new_cap;
        }

        Ok(page_id)
    }

    // ---- Leaf key/value access ----

    fn leaf_keys_ptr(&self, page_id: u32) -> *const BPlusKey {
        unsafe { self.page_ptr(page_id).add(NODE_HEADER_SIZE) as *const BPlusKey }
    }

    fn leaf_values_ptr(&self, page_id: u32) -> *const BPlusValue {
        unsafe {
            self.page_ptr(page_id)
                .add(NODE_HEADER_SIZE + LEAF_MAX_KEYS * KEY_SIZE) as *const BPlusValue
        }
    }

    fn leaf_key(&self, page_id: u32, idx: usize) -> BPlusKey {
        unsafe { *self.leaf_keys_ptr(page_id).add(idx) }
    }

    fn leaf_value(&self, page_id: u32, idx: usize) -> BPlusValue {
        unsafe { *self.leaf_values_ptr(page_id).add(idx) }
    }

    fn set_leaf_key(&mut self, page_id: u32, idx: usize, key: BPlusKey) {
        unsafe {
            let ptr = self.page_ptr_mut(page_id).add(NODE_HEADER_SIZE) as *mut BPlusKey;
            std::ptr::write(ptr.add(idx), key);
        }
    }

    fn set_leaf_value(&mut self, page_id: u32, idx: usize, val: BPlusValue) {
        unsafe {
            let ptr = self.page_ptr_mut(page_id)
                .add(NODE_HEADER_SIZE + LEAF_MAX_KEYS * KEY_SIZE) as *mut BPlusValue;
            std::ptr::write(ptr.add(idx), val);
        }
    }

    // ---- Internal key/child access ----

    fn internal_keys_ptr(&self, page_id: u32) -> *const BPlusKey {
        unsafe { self.page_ptr(page_id).add(NODE_HEADER_SIZE) as *const BPlusKey }
    }

    fn internal_children_ptr(&self, page_id: u32) -> *const u32 {
        unsafe {
            self.page_ptr(page_id)
                .add(NODE_HEADER_SIZE + INTERNAL_MAX_KEYS * KEY_SIZE) as *const u32
        }
    }

    fn internal_key(&self, page_id: u32, idx: usize) -> BPlusKey {
        unsafe { *self.internal_keys_ptr(page_id).add(idx) }
    }

    fn internal_child(&self, page_id: u32, idx: usize) -> u32 {
        unsafe { std::ptr::read_unaligned(self.internal_children_ptr(page_id).add(idx)) }
    }

    fn set_internal_key(&mut self, page_id: u32, idx: usize, key: BPlusKey) {
        unsafe {
            let ptr = self.page_ptr_mut(page_id).add(NODE_HEADER_SIZE) as *mut BPlusKey;
            std::ptr::write(ptr.add(idx), key);
        }
    }

    fn set_internal_child(&mut self, page_id: u32, idx: usize, child: u32) {
        unsafe {
            let ptr = self.page_ptr_mut(page_id)
                .add(NODE_HEADER_SIZE + INTERNAL_MAX_KEYS * KEY_SIZE) as *mut u32;
            std::ptr::write_unaligned(ptr.add(idx), child);
        }
    }

    // ---- Search ----

    fn leaf_search(&self, page_id: u32, key: &BPlusKey) -> Result<usize, usize> {
        let n = self.node_header(page_id).num_keys as usize;
        let mut lo = 0;
        let mut hi = n;
        while lo < hi {
            let mid = lo + (hi - lo) / 2;
            let mid_key = self.leaf_key(page_id, mid);
            match mid_key.cmp_bytes(key) {
                std::cmp::Ordering::Less => lo = mid + 1,
                std::cmp::Ordering::Equal => return Ok(mid),
                std::cmp::Ordering::Greater => hi = mid,
            }
        }
        Err(lo)
    }

    fn find_leaf(&self, key: &BPlusKey) -> u32 {
        let mut page_id = self.root_page;
        loop {
            if self.is_leaf(page_id) {
                return page_id;
            }

            let n = self.node_header(page_id).num_keys as usize;
            let mut lo = 0;
            let mut hi = n;
            while lo < hi {
                let mid = lo + (hi - lo) / 2;
                let mid_key = self.internal_key(page_id, mid);
                if key.cmp_bytes(&mid_key) != std::cmp::Ordering::Less {
                    lo = mid + 1;
                } else {
                    hi = mid;
                }
            }

            page_id = self.internal_child(page_id, lo);
        }
    }

    /// Search for a key, returns the value or None.
    pub fn search(&self, key: &[u8]) -> Option<BPlusValue> {
        let bkey = BPlusKey::from_bytes(key);
        let leaf = self.find_leaf(&bkey);
        match self.leaf_search(leaf, &bkey) {
            Ok(idx) => Some(self.leaf_value(leaf, idx)),
            Err(_) => None,
        }
    }

    /// Insert a key-value pair.
    pub fn insert_kv(&mut self, key: &[u8], value: BPlusValue) {
        let bkey = BPlusKey::from_bytes(key);
        let leaf = self.find_leaf(&bkey);

        // Check if key exists — update in place
        if let Ok(idx) = self.leaf_search(leaf, &bkey) {
            self.set_leaf_value(leaf, idx, value);
            return;
        }

        let n = self.node_header(leaf).num_keys as usize;

        if n < LEAF_MAX_KEYS {
            // Room in leaf — insert directly
            self.leaf_insert_at(leaf, bkey, value);
        } else {
            // Leaf is full — split
            self.leaf_split_and_insert(leaf, bkey, value);
        }
    }

    /// Insert into a leaf that has room.
    fn leaf_insert_at(&mut self, page_id: u32, key: BPlusKey, value: BPlusValue) {
        let n = self.node_header(page_id).num_keys as usize;
        let pos = match self.leaf_search(page_id, &key) {
            Ok(idx) => {
                self.set_leaf_value(page_id, idx, value);
                return;
            }
            Err(idx) => idx,
        };

        // Shift keys and values right
        for i in (pos..n).rev() {
            let k = self.leaf_key(page_id, i);
            let v = self.leaf_value(page_id, i);
            self.set_leaf_key(page_id, i + 1, k);
            self.set_leaf_value(page_id, i + 1, v);
        }

        self.set_leaf_key(page_id, pos, key);
        self.set_leaf_value(page_id, pos, value);
        self.node_header_mut(page_id).num_keys += 1;
    }

    /// Split a full leaf and insert the new key.
    fn leaf_split_and_insert(&mut self, old_leaf: u32, key: BPlusKey, value: BPlusValue) {
        let new_leaf = self.alloc_page().expect("cannot grow B+ tree file");
        self.init_leaf(new_leaf);

        let old_n = self.node_header(old_leaf).num_keys as usize;

        // Collect all keys+values + the new one, sorted
        let mut all_keys = Vec::with_capacity(old_n + 1);
        let mut all_vals = Vec::with_capacity(old_n + 1);

        let mut inserted = false;
        for i in 0..old_n {
            let k = self.leaf_key(old_leaf, i);
            if !inserted && key.cmp_bytes(&k) == std::cmp::Ordering::Less {
                all_keys.push(key);
                all_vals.push(value);
                inserted = true;
            }
            all_keys.push(k);
            all_vals.push(self.leaf_value(old_leaf, i));
        }
        if !inserted {
            all_keys.push(key);
            all_vals.push(value);
        }

        let total = all_keys.len();
        let split = total / 2;

        // Left leaf: keys[0..split]
        self.node_header_mut(old_leaf).num_keys = 0;
        for i in 0..split {
            self.set_leaf_key(old_leaf, i, all_keys[i]);
            self.set_leaf_value(old_leaf, i, all_vals[i]);
        }
        self.node_header_mut(old_leaf).num_keys = split as u16;

        // Right leaf: keys[split..total]
        for i in split..total {
            self.set_leaf_key(new_leaf, i - split, all_keys[i]);
            self.set_leaf_value(new_leaf, i - split, all_vals[i]);
        }
        self.node_header_mut(new_leaf).num_keys = (total - split) as u16;

        // Link leaves
        let old_sibling = self.node_header(old_leaf).right_sibling;
        self.node_header_mut(new_leaf).right_sibling = old_sibling;
        self.node_header_mut(old_leaf).right_sibling = new_leaf;

        // Set parent
        let parent = self.node_header(old_leaf).parent;
        self.node_header_mut(new_leaf).parent = parent;

        // Promote the first key of new_leaf to parent
        let promoted_key = self.leaf_key(new_leaf, 0);
        self.insert_into_parent(old_leaf, promoted_key, new_leaf);
    }

    /// Insert a new key+child into a parent internal node after a split.
    fn insert_into_parent(&mut self, left_child: u32, key: BPlusKey, right_child: u32) {
        let left_header = self.node_header(left_child);
        let is_root = left_header.flags & NODE_FLAG_ROOT != 0;

        if is_root {
            // Create new root
            let new_root = self.alloc_page().expect("cannot grow B+ tree file");
            self.init_internal(new_root);

            self.node_header_mut(new_root).flags = NODE_FLAG_ROOT;
            self.node_header_mut(new_root).num_keys = 1;
            self.set_internal_key(new_root, 0, key);
            self.set_internal_child(new_root, 0, left_child);
            self.set_internal_child(new_root, 1, right_child);

            // Clear root flag from old root, set parent pointers
            self.node_header_mut(left_child).flags &= !NODE_FLAG_ROOT;
            self.node_header_mut(left_child).parent = new_root;
            self.node_header_mut(right_child).parent = new_root;

            self.root_page = new_root;
            return;
        }

        let parent = left_header.parent;
        let parent_n = self.node_header(parent).num_keys as usize;

        if parent_n < INTERNAL_MAX_KEYS {
            // Room in parent
            self.internal_insert_at(parent, key, right_child);
            self.node_header_mut(right_child).parent = parent;
        } else {
            // Split parent
            self.internal_split_and_insert(parent, key, right_child);
        }
    }

    /// Insert key+child into an internal node with room.
    fn internal_insert_at(&mut self, page_id: u32, key: BPlusKey, right_child: u32) {
        let n = self.node_header(page_id).num_keys as usize;

        // Find position
        let mut pos = 0;
        while pos < n {
            let k = self.internal_key(page_id, pos);
            if key.cmp_bytes(&k) == std::cmp::Ordering::Less {
                break;
            }
            pos += 1;
        }

        // Shift keys and children right
        for i in (pos..n).rev() {
            let k = self.internal_key(page_id, i);
            self.set_internal_key(page_id, i + 1, k);
            let c = self.internal_child(page_id, i + 1);
            self.set_internal_child(page_id, i + 2, c);
        }

        self.set_internal_key(page_id, pos, key);
        self.set_internal_child(page_id, pos + 1, right_child);
        self.node_header_mut(page_id).num_keys += 1;
    }

    /// Split a full internal node and insert.
    fn internal_split_and_insert(&mut self, old_internal: u32, key: BPlusKey, right_child: u32) {
        let new_internal = self.alloc_page().expect("cannot grow B+ tree file");
        self.init_internal(new_internal);

        let old_n = self.node_header(old_internal).num_keys as usize;

        // Collect all keys + children + the new one
        let mut all_keys = Vec::with_capacity(old_n + 1);
        let mut all_children = Vec::with_capacity(old_n + 2);

        let mut inserted = false;
        for i in 0..old_n {
            if !inserted && key.cmp_bytes(&self.internal_key(old_internal, i)) == std::cmp::Ordering::Less {
                all_keys.push(key);
                all_children.push(right_child);
                inserted = true;
            }
            all_keys.push(self.internal_key(old_internal, i));
            all_children.push(self.internal_child(old_internal, i));
        }
        // Last child of old node
        all_children.push(self.internal_child(old_internal, old_n));
        if !inserted {
            all_keys.push(key);
            all_children.push(right_child);
        }

        let total_keys = all_keys.len();
        let split = total_keys / 2;

        // Left: keys[0..split], children[0..=split]
        self.node_header_mut(old_internal).num_keys = 0;
        for i in 0..split {
            self.set_internal_key(old_internal, i, all_keys[i]);
            self.set_internal_child(old_internal, i, all_children[i]);
        }
        self.set_internal_child(old_internal, split, all_children[split]);
        self.node_header_mut(old_internal).num_keys = split as u16;

        // Promoted key
        let promoted_key = all_keys[split];

        // Right: keys[split+1..total], children[split+1..total+1]
        let right_keys = &all_keys[split + 1..];
        let right_children = &all_children[split + 1..];
        for (i, k) in right_keys.iter().enumerate() {
            self.set_internal_key(new_internal, i, *k);
            self.set_internal_child(new_internal, i, right_children[i]);
        }
        self.set_internal_child(new_internal, right_keys.len(), *right_children.last().unwrap());
        self.node_header_mut(new_internal).num_keys = right_keys.len() as u16;

        // Update parent pointers for children that moved to new_internal
        let new_n = right_keys.len();
        for i in 0..=new_n {
            let child = self.internal_child(new_internal, i);
            self.node_header_mut(child).parent = new_internal;
        }

        // Set parent for new internal
        let parent = self.node_header(old_internal).parent;
        self.node_header_mut(new_internal).parent = parent;

        // Promote to parent
        self.insert_into_parent(old_internal, promoted_key, new_internal);
    }

    /// Delete a key. Returns true if found and deleted.
    pub fn delete_key(&mut self, key: &[u8]) -> bool {
        let bkey = BPlusKey::from_bytes(key);
        let leaf = self.find_leaf(&bkey);

        let idx = match self.leaf_search(leaf, &bkey) {
            Ok(idx) => idx,
            Err(_) => return false,
        };

        let n = self.node_header(leaf).num_keys as usize;

        // Shift keys and values left
        for i in idx..n - 1 {
            let k = self.leaf_key(leaf, i + 1);
            let v = self.leaf_value(leaf, i + 1);
            self.set_leaf_key(leaf, i, k);
            self.set_leaf_value(leaf, i, v);
        }
        self.node_header_mut(leaf).num_keys -= 1;

        true
    }

    /// Range scan: return all entries where start <= key < end.
    pub fn range_scan(&self, start: &[u8], end: &[u8]) -> Vec<(BPlusKey, BPlusValue)> {
        let start_key = BPlusKey::from_bytes(start);
        let end_key = BPlusKey::from_bytes(end);
        let mut results = Vec::new();

        let mut leaf = self.find_leaf(&start_key);

        'outer: loop {
            let n = self.node_header(leaf).num_keys as usize;

            for i in 0..n {
                let k = self.leaf_key(leaf, i);
                if k.cmp_bytes(&start_key) == std::cmp::Ordering::Less {
                    continue;
                }
                if k.cmp_bytes(&end_key) != std::cmp::Ordering::Less {
                    break 'outer;
                }
                results.push((k, self.leaf_value(leaf, i)));
            }

            let sibling = self.node_header(leaf).right_sibling;
            if sibling == 0 {
                break;
            }
            leaf = sibling;
        }

        results
    }

    /// Count all entries by walking leaves.
    pub fn count(&self) -> usize {
        let mut count = 0;
        let mut page = self.find_leftmost_leaf();
        loop {
            count += self.node_header(page).num_keys as usize;
            let sibling = self.node_header(page).right_sibling;
            if sibling == 0 {
                break;
            }
            page = sibling;
        }
        count
    }

    fn find_leftmost_leaf(&self) -> u32 {
        let mut page = self.root_page;
        while !self.is_leaf(page) {
            page = self.internal_child(page, 0);
        }
        page
    }

    /// Flush mmap to disk.
    pub fn sync(&self) -> io::Result<()> {
        self.mmap.flush()
    }
}

// Implement BTreeOps for integration with Pipeline.
// BPlusTree requires &mut self for insert/delete, but BTreeOps uses &self.
// We use interior mutability via UnsafeCell for the mmap operations,
// which are already single-writer safe via the Pipeline's usage patterns.
// For truly concurrent access, wrap BPlusTree in a Mutex/RwLock.
use std::cell::UnsafeCell;

pub struct BPlusTreeIndex {
    inner: UnsafeCell<BPlusTree>,
}

// Safety: Pipeline ensures single-writer access patterns.
unsafe impl Send for BPlusTreeIndex {}
unsafe impl Sync for BPlusTreeIndex {}

impl BPlusTreeIndex {
    pub fn open(path: &str, initial_pages: u32) -> io::Result<Self> {
        let tree = BPlusTree::open(path, initial_pages)?;
        Ok(Self {
            inner: UnsafeCell::new(tree),
        })
    }

    pub fn sync(&self) -> io::Result<()> {
        unsafe { &*self.inner.get() }.sync()
    }
}

impl BTreeOps for BPlusTreeIndex {
    fn insert(&self, key: &[u8], ptr: RecordPtr) {
        let tree = unsafe { &mut *self.inner.get() };
        tree.insert_kv(key, BPlusValue::from_record_ptr(ptr));
    }

    fn get(&self, key: &[u8]) -> Option<RecordPtr> {
        let tree = unsafe { &*self.inner.get() };
        tree.search(key).map(|v| v.to_record_ptr())
    }

    fn delete(&self, key: &[u8]) -> bool {
        let tree = unsafe { &mut *self.inner.get() };
        tree.delete_key(key)
    }

    fn prefix_scan(&self, prefix: &[u8]) -> Vec<(Vec<u8>, RecordPtr)> {
        let tree = unsafe { &*self.inner.get() };

        // Build end bound: increment last byte of prefix
        let mut end = prefix.to_vec();
        if let Some(last) = end.last_mut() {
            *last = last.wrapping_add(1);
        }

        tree.range_scan(prefix, &end)
            .into_iter()
            .map(|(k, v)| (k.to_vec(), v.to_record_ptr()))
            .collect()
    }

    fn len(&self) -> usize {
        let tree = unsafe { &*self.inner.get() };
        tree.count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_path(name: &str) -> String {
        let dir = std::env::temp_dir().join("leadgen_bplus_test");
        fs::create_dir_all(&dir).ok();
        dir.join(name).to_str().unwrap().to_string()
    }

    #[test]
    fn test_insert_and_search() {
        let path = temp_path("test_basic.bpt");
        let _ = fs::remove_file(&path);

        let idx = BPlusTreeIndex::open(&path, 64).unwrap();
        let ptr = RecordPtr { page_id: 1, slot_idx: 5 };
        idx.insert(b"acme.com", ptr);

        let found = idx.get(b"acme.com");
        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.page_id, 1);
        assert_eq!(found.slot_idx, 5);

        assert!(idx.get(b"missing.com").is_none());
        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_multiple_inserts() {
        let path = temp_path("test_multi.bpt");
        let _ = fs::remove_file(&path);

        let idx = BPlusTreeIndex::open(&path, 64).unwrap();

        for i in 0..200u32 {
            let key = format!("domain{:04}.com", i);
            idx.insert(key.as_bytes(), RecordPtr { page_id: i, slot_idx: 0 });
        }

        assert_eq!(idx.len(), 200);

        for i in 0..200u32 {
            let key = format!("domain{:04}.com", i);
            let found = idx.get(key.as_bytes()).unwrap();
            assert_eq!(found.page_id, i);
        }

        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_delete() {
        let path = temp_path("test_delete.bpt");
        let _ = fs::remove_file(&path);

        let idx = BPlusTreeIndex::open(&path, 64).unwrap();
        idx.insert(b"a.com", RecordPtr { page_id: 1, slot_idx: 0 });
        idx.insert(b"b.com", RecordPtr { page_id: 2, slot_idx: 0 });
        idx.insert(b"c.com", RecordPtr { page_id: 3, slot_idx: 0 });

        assert!(idx.delete(b"b.com"));
        assert!(idx.get(b"b.com").is_none());
        assert!(idx.get(b"a.com").is_some());
        assert!(idx.get(b"c.com").is_some());
        assert_eq!(idx.len(), 2);

        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_prefix_scan() {
        let path = temp_path("test_prefix.bpt");
        let _ = fs::remove_file(&path);

        let idx = BPlusTreeIndex::open(&path, 64).unwrap();
        idx.insert(b"app.acme.com", RecordPtr { page_id: 1, slot_idx: 0 });
        idx.insert(b"api.acme.com", RecordPtr { page_id: 2, slot_idx: 0 });
        idx.insert(b"beta.io", RecordPtr { page_id: 3, slot_idx: 0 });
        idx.insert(b"app.beta.io", RecordPtr { page_id: 4, slot_idx: 0 });

        let results = idx.prefix_scan(b"ap");
        assert_eq!(results.len(), 3); // api.acme.com, app.acme.com, app.beta.io

        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_persistence() {
        let path = temp_path("test_persist.bpt");
        let _ = fs::remove_file(&path);

        // Write data
        {
            let idx = BPlusTreeIndex::open(&path, 64).unwrap();
            idx.insert(b"persist.com", RecordPtr { page_id: 42, slot_idx: 7 });
            idx.sync().unwrap();
        }

        // Reopen and verify
        {
            let idx = BPlusTreeIndex::open(&path, 64).unwrap();
            let found = idx.get(b"persist.com").unwrap();
            assert_eq!(found.page_id, 42);
            assert_eq!(found.slot_idx, 7);
        }

        fs::remove_file(&path).ok();
    }

    #[test]
    fn test_leaf_split() {
        let path = temp_path("test_split.bpt");
        let _ = fs::remove_file(&path);

        let idx = BPlusTreeIndex::open(&path, 256).unwrap();

        // Insert enough keys to force leaf splits
        for i in 0..500u32 {
            let key = format!("k{:06}", i);
            idx.insert(key.as_bytes(), RecordPtr { page_id: i, slot_idx: 0 });
        }

        assert_eq!(idx.len(), 500);

        // Verify all keys
        for i in 0..500u32 {
            let key = format!("k{:06}", i);
            let found = idx.get(key.as_bytes());
            assert!(found.is_some(), "missing key: {}", key);
            assert_eq!(found.unwrap().page_id, i);
        }

        fs::remove_file(&path).ok();
    }
}
