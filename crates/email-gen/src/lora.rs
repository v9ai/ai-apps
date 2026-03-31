use candle_core::{safetensors, DType, Device, Tensor};
use std::collections::HashMap;
use std::path::Path;

use crate::error::Result;

/// LoRA adapter weights loaded from a safetensors file.
pub struct LoraAdapter {
    /// Maps layer name prefix -> (lora_a, lora_b) weight pairs
    pub weights: HashMap<String, (Tensor, Tensor)>,
    pub scale: f32,
}

impl LoraAdapter {
    /// Load LoRA adapter weights from an `adapters.safetensors` file.
    ///
    /// Expected tensor names follow the pattern:
    ///   `base_model.model.model.layers.{N}.self_attn.{q,k,v,o}_proj.lora_a.weight`
    ///   `base_model.model.model.layers.{N}.self_attn.{q,k,v,o}_proj.lora_b.weight`
    ///
    /// We group them by the prefix before `.lora_a` / `.lora_b`.
    pub fn load(path: &Path, device: &Device) -> Result<Self> {
        let tensors = safetensors::load(path, device)?;
        let mut a_tensors: HashMap<String, Tensor> = HashMap::new();
        let mut b_tensors: HashMap<String, Tensor> = HashMap::new();

        for (name, tensor) in tensors {
            if let Some(prefix) = name.strip_suffix(".lora_a.weight") {
                a_tensors.insert(prefix.to_string(), tensor);
            } else if let Some(prefix) = name.strip_suffix(".lora_b.weight") {
                b_tensors.insert(prefix.to_string(), tensor);
            } else if let Some(prefix) = name.strip_suffix(".lora_A.weight") {
                a_tensors.insert(prefix.to_string(), tensor);
            } else if let Some(prefix) = name.strip_suffix(".lora_B.weight") {
                b_tensors.insert(prefix.to_string(), tensor);
            }
        }

        let mut weights = HashMap::new();
        for (prefix, a) in a_tensors {
            if let Some(b) = b_tensors.remove(&prefix) {
                weights.insert(prefix, (a, b));
            } else {
                tracing::warn!("LoRA: found lora_a but no lora_b for {prefix}");
            }
        }

        tracing::info!("loaded {} LoRA adapter weight pairs", weights.len());

        // Default LoRA scale (alpha / rank). Typical: alpha=16, rank=8 -> scale=2.0
        // We use 1.0 as default; the training config should set this properly.
        Ok(Self {
            weights,
            scale: 1.0,
        })
    }

    /// Apply LoRA delta to a linear layer's output: y = Wx + scale * (B @ A @ x)
    ///
    /// `base_output` is the output from the base linear layer (Wx).
    /// `input` is the input to the linear layer (x).
    /// `lora_a` has shape (rank, in_features), `lora_b` has shape (out_features, rank).
    pub fn apply_delta(
        input: &Tensor,
        lora_a: &Tensor,
        lora_b: &Tensor,
        scale: f32,
    ) -> Result<Tensor> {
        let input_dtype = input.dtype();

        // Ensure consistent dtypes for matmul
        let a = lora_a.to_dtype(input_dtype)?;
        let b = lora_b.to_dtype(input_dtype)?;

        // x @ A^T @ B^T  (input is [batch, seq, hidden])
        let delta = input.matmul(&a.t()?)?.matmul(&b.t()?)?;
        let scaled = (delta * (scale as f64))?;
        Ok(scaled)
    }
}

/// Merge LoRA weights directly into a base weight matrix: W' = W + scale * B @ A
///
/// This is used at load time to avoid runtime overhead.
pub fn merge_lora_into_weight(
    base_weight: &Tensor,
    lora_a: &Tensor,
    lora_b: &Tensor,
    scale: f32,
) -> Result<Tensor> {
    let dtype = base_weight.dtype();
    let a = lora_a.to_dtype(DType::F32)?;
    let b = lora_b.to_dtype(DType::F32)?;

    // W' = W + scale * (B @ A)
    // lora_a: (rank, in_features), lora_b: (out_features, rank)
    // B @ A = (out_features, in_features) — same shape as base_weight
    let delta = b.matmul(&a)?;
    let scaled_delta = (delta * (scale as f64))?;
    let merged = (base_weight.to_dtype(DType::F32)? + scaled_delta)?;
    Ok(merged.to_dtype(dtype)?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use candle_core::Device;

    #[test]
    fn test_merge_lora() -> Result<()> {
        let device = Device::Cpu;
        // Base weight: 4x3
        let base = Tensor::ones((4, 3), DType::F32, &device)?;
        // LoRA A: rank=2, in=3 -> (2, 3)
        let lora_a = Tensor::ones((2, 3), DType::F32, &device)?;
        // LoRA B: out=4, rank=2 -> (4, 2)
        let lora_b = Tensor::ones((4, 2), DType::F32, &device)?;

        let merged = merge_lora_into_weight(&base, &lora_a, &lora_b, 1.0)?;
        // B @ A = (4, 2) @ (2, 3) = (4, 3) all 2s; base is all 1s; merged = all 3s
        let val: f32 = merged.flatten_all()?.to_vec1::<f32>()?[0];
        assert!((val - 3.0).abs() < 1e-6);
        Ok(())
    }
}
