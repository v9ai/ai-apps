use candle_core::Device;

use crate::Result;

pub fn best_device() -> Result<Device> {
    #[cfg(feature = "metal")]
    {
        tracing::info!("using Metal device");
        return Ok(Device::new_metal(0)?);
    }

    #[cfg(feature = "cuda")]
    {
        tracing::info!("using CUDA device");
        return Ok(Device::new_cuda(0)?);
    }

    #[allow(unreachable_code)]
    {
        tracing::info!("using CPU device");
        Ok(Device::Cpu)
    }
}
