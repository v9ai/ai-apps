use crate::error::{Error, Result};

pub async fn capture_screenshot(url: &str) -> Result<Vec<u8>> {
    let output = tokio::process::Command::new("node")
        .arg("scripts/screenshot.mjs")
        .arg(url)
        .output()
        .await
        .map_err(|e| Error::Screenshot {
            reason: format!("failed to spawn node: {e}"),
        })?;

    if output.status.success() && !output.stdout.is_empty() {
        Ok(output.stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(Error::Screenshot {
            reason: format!("exit {}: {}", output.status, stderr.trim()),
        })
    }
}
