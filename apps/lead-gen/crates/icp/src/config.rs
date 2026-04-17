use crate::criteria::{IcpWeights, CompanyIcpWeights};

pub fn load_icp_weights(path: &std::path::Path) -> IcpWeights {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn load_company_icp_weights(path: &std::path::Path) -> CompanyIcpWeights {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save_icp_weights(weights: &IcpWeights, path: &std::path::Path) -> std::io::Result<()> {
    weights.to_json(path)
}

pub fn save_company_icp_weights(weights: &CompanyIcpWeights, path: &std::path::Path) -> std::io::Result<()> {
    let json = serde_json::to_string_pretty(weights)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(path, json)
}
