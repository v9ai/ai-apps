/// WAV header size in bytes (standard PCM WAV).
pub const HEADER_SIZE: usize = 44;

/// Bytes per second for 24kHz, 16-bit, mono PCM audio.
pub const BYTES_PER_SECOND: usize = 24_000 * 2;

/// Fix the RIFF and data chunk sizes in a WAV header.
///
/// - bytes 4..8  = total file size - 8  (RIFF chunk size)
/// - bytes 40..44 = PCM data size       (data chunk size)
pub fn fix_header_sizes(buf: &mut [u8]) {
    if buf.len() > HEADER_SIZE {
        let file_size = (buf.len() - 8) as u32;
        let data_size = (buf.len() - HEADER_SIZE) as u32;
        buf[4..8].copy_from_slice(&file_size.to_le_bytes());
        buf[40..44].copy_from_slice(&data_size.to_le_bytes());
    }
}

/// Estimate playback duration in seconds from WAV byte length.
pub fn estimate_duration_secs(wav_len: usize) -> f64 {
    if wav_len > HEADER_SIZE {
        (wav_len - HEADER_SIZE) as f64 / BYTES_PER_SECOND as f64
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn estimate_duration() {
        // 1 second of 24kHz 16-bit mono = 48000 bytes of PCM
        let len = HEADER_SIZE + BYTES_PER_SECOND;
        let dur = estimate_duration_secs(len);
        assert!((dur - 1.0).abs() < 0.001);
    }

    #[test]
    fn fix_header() {
        let mut buf = vec![0u8; HEADER_SIZE + 100];
        fix_header_sizes(&mut buf);
        let file_size = u32::from_le_bytes(buf[4..8].try_into().unwrap());
        let data_size = u32::from_le_bytes(buf[40..44].try_into().unwrap());
        assert_eq!(file_size as usize, buf.len() - 8);
        assert_eq!(data_size, 100);
    }

    #[test]
    fn empty_wav() {
        assert_eq!(estimate_duration_secs(0), 0.0);
        assert_eq!(estimate_duration_secs(44), 0.0);
    }
}
