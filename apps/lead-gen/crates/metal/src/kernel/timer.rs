/// High-resolution timer using platform-specific hardware counters.
///
/// aarch64 (M1): reads `cntvct_el0` (virtual counter) at 24MHz — single `mrs` instruction.
/// x86_64: reads TSC via `rdtsc`.
/// Fallback: `SystemTime` (syscall overhead).

#[inline(always)]
pub fn read_tsc() -> u64 {
    #[cfg(target_arch = "aarch64")]
    {
        let val: u64;
        unsafe { core::arch::asm!("mrs {}, cntvct_el0", out(reg) val, options(nostack, nomem)); }
        return val;
    }
    #[cfg(target_arch = "x86_64")]
    {
        return unsafe { core::arch::x86_64::_rdtsc() };
    }
    #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
    {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64
    }
}

/// Timer frequency in Hz. Used to convert TSC ticks to wall-clock time.
/// M1: 24 MHz (24,000,000). x86: assume 1 GHz (TSC ≈ ns on modern CPUs).
#[inline]
pub fn tsc_frequency_hz() -> u64 {
    #[cfg(target_arch = "aarch64")]
    {
        let freq: u64;
        unsafe { core::arch::asm!("mrs {}, cntfrq_el0", out(reg) freq, options(nostack, nomem)); }
        return freq; // 24 MHz on M1
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        1_000_000_000 // assume ns resolution
    }
}

pub struct Timer {
    start: u64,
    freq: u64,
}

impl Timer {
    #[inline]
    pub fn start() -> Self {
        Self {
            start: read_tsc(),
            freq: tsc_frequency_hz(),
        }
    }

    #[inline]
    pub fn elapsed_ns(&self) -> u64 {
        let elapsed_ticks = read_tsc().wrapping_sub(self.start);
        elapsed_ticks.saturating_mul(1_000_000_000) / self.freq
    }

    #[inline]
    pub fn elapsed_us(&self) -> u64 {
        self.elapsed_ns() / 1_000
    }

    #[inline]
    pub fn elapsed_ms(&self) -> f64 {
        self.elapsed_ns() as f64 / 1_000_000.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timer_monotonic() {
        let t = Timer::start();
        let mut prev = 0u64;
        for _ in 0..100 {
            let now = t.elapsed_ns();
            assert!(now >= prev, "timer went backwards: {} < {}", now, prev);
            prev = now;
        }
    }

    #[test]
    fn test_tsc_frequency_nonzero() {
        assert!(tsc_frequency_hz() > 0);
    }

    #[test]
    fn test_elapsed_ordering() {
        let t = Timer::start();
        // Do some work
        let mut x = 0u64;
        for i in 0..10_000 {
            x = x.wrapping_add(i);
        }
        let _ = x;
        let ns = t.elapsed_ns();
        let us = t.elapsed_us();
        let ms = t.elapsed_ms();
        // ns >= us * 1000 (approximately — timing can be slightly off due to measurement)
        assert!(ms >= 0.0);
        assert!(us <= ns / 1_000 + 1); // allow 1us tolerance
    }
}
