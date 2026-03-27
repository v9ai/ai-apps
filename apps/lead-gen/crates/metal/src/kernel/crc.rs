/// Hardware-accelerated CRC32C (Castagnoli polynomial).
///
/// aarch64 (M1): uses `__crc32cd`/`__crc32cw`/`__crc32cb` intrinsics — 8 bytes/cycle.
/// x86_64: uses `_mm_crc32_u64`/`_mm_crc32_u8` with SSE4.2 runtime detection.
/// Fallback: bit-by-bit software implementation.

/// Compute CRC32C of a byte slice. Dispatches to hardware implementation
/// on aarch64 and x86_64, falls back to software otherwise.
#[inline]
pub fn crc32c(data: &[u8]) -> u32 {
    #[cfg(target_arch = "aarch64")]
    {
        // Apple Silicon always has CRC32 extension (Armv8.1+)
        return unsafe { crc32c_aarch64(data) };
    }
    #[cfg(target_arch = "x86_64")]
    {
        if is_x86_feature_detected!("sse4.2") {
            return unsafe { crc32c_x86(data) };
        }
    }
    #[allow(unreachable_code)]
    crc32c_sw(data)
}

#[cfg(target_arch = "aarch64")]
#[target_feature(enable = "crc")]
unsafe fn crc32c_aarch64(data: &[u8]) -> u32 {
    use core::arch::aarch64::*;
    let mut crc = 0xFFFF_FFFFu32;
    let mut i = 0;

    // Process 8 bytes at a time (CRC32CX — 64-bit word)
    while i + 8 <= data.len() {
        let val = core::ptr::read_unaligned(data.as_ptr().add(i) as *const u64);
        crc = __crc32cd(crc, val);
        i += 8;
    }
    // Process 4 bytes
    if i + 4 <= data.len() {
        let val = core::ptr::read_unaligned(data.as_ptr().add(i) as *const u32);
        crc = __crc32cw(crc, val);
        i += 4;
    }
    // Process remaining bytes one at a time
    while i < data.len() {
        crc = __crc32cb(crc, data[i]);
        i += 1;
    }
    crc ^ 0xFFFF_FFFF
}

#[cfg(target_arch = "x86_64")]
#[target_feature(enable = "sse4.2")]
unsafe fn crc32c_x86(data: &[u8]) -> u32 {
    let mut crc = 0xFFFF_FFFFu64;
    let mut i = 0;
    while i + 8 <= data.len() {
        let chunk = core::ptr::read_unaligned(data.as_ptr().add(i) as *const u64);
        crc = core::arch::x86_64::_mm_crc32_u64(crc, chunk);
        i += 8;
    }
    let mut crc32 = crc as u32;
    while i < data.len() {
        crc32 = core::arch::x86_64::_mm_crc32_u8(crc32, data[i]);
        i += 1;
    }
    crc32 ^ 0xFFFF_FFFF
}

/// Software CRC32C (Castagnoli polynomial 0x82F63B78).
fn crc32c_sw(data: &[u8]) -> u32 {
    const POLY: u32 = 0x82F6_3B78;
    let mut crc = 0xFFFF_FFFFu32;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            crc = if crc & 1 != 0 { (crc >> 1) ^ POLY } else { crc >> 1 };
        }
    }
    crc ^ 0xFFFF_FFFF
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_vector() {
        // CRC32C of empty string
        let crc = crc32c(b"");
        assert_eq!(crc, 0x0000_0000);
    }

    #[test]
    fn test_consistency() {
        let data = b"Senior Rust Engineer, Fully Remote, $160-200k";
        let c1 = crc32c(data);
        let c2 = crc32c(data);
        assert_eq!(c1, c2);
    }

    #[test]
    fn test_different_inputs() {
        let c1 = crc32c(b"hello");
        let c2 = crc32c(b"world");
        assert_ne!(c1, c2);
    }

    #[test]
    fn test_sw_matches_hw() {
        let data = b"test data for crc32c verification";
        let sw = crc32c_sw(data);
        let hw = crc32c(data);
        assert_eq!(sw, hw, "sw=0x{:08x} hw=0x{:08x}", sw, hw);
    }

    #[test]
    fn test_short_inputs() {
        // 1 byte
        let _ = crc32c(b"x");
        // 3 bytes (tests the byte-by-byte tail)
        let _ = crc32c(b"abc");
        // 7 bytes (tests 4-byte + 3-byte tail)
        let _ = crc32c(b"abcdefg");
        // 8 bytes (exact u64 boundary)
        let _ = crc32c(b"abcdefgh");
        // 9 bytes (u64 + 1 byte tail)
        let _ = crc32c(b"abcdefghi");
    }
}
