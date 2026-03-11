use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::Region;

use crate::error::{Error, Result};

/// Configuration for uploading to Cloudflare R2.
#[derive(Debug, Clone)]
pub struct R2Config {
    pub account_id: String,
    pub access_key_id: String,
    pub secret_access_key: String,
    pub bucket_name: String,
    pub public_domain: Option<String>,
    pub key_prefix: String,
}

/// Result of a successful R2 upload.
#[derive(Debug, Clone)]
pub struct R2UploadResult {
    pub key: String,
    pub public_url: Option<String>,
    pub size_bytes: usize,
}

impl R2Config {
    /// Create config with required fields; defaults bucket to `longform-tts` and prefix to `vadim-blog`.
    pub fn new(
        account_id: impl Into<String>,
        access_key_id: impl Into<String>,
        secret_access_key: impl Into<String>,
    ) -> Self {
        Self {
            account_id: account_id.into(),
            access_key_id: access_key_id.into(),
            secret_access_key: secret_access_key.into(),
            bucket_name: "longform-tts".into(),
            public_domain: None,
            key_prefix: "vadim-blog".into(),
        }
    }

    /// Read config from environment variables.
    ///
    /// Required: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
    /// Optional: `R2_BUCKET_NAME` (default: `longform-tts`), `R2_PUBLIC_DOMAIN`, `R2_KEY_PREFIX` (default: `vadim-blog`)
    pub fn from_env() -> Result<Self> {
        let account_id = std::env::var("R2_ACCOUNT_ID")
            .map_err(|_| Error::R2("R2_ACCOUNT_ID not set".into()))?;
        let access_key_id = std::env::var("R2_ACCESS_KEY_ID")
            .map_err(|_| Error::R2("R2_ACCESS_KEY_ID not set".into()))?;
        let secret_access_key = std::env::var("R2_SECRET_ACCESS_KEY")
            .map_err(|_| Error::R2("R2_SECRET_ACCESS_KEY not set".into()))?;

        let mut config = Self::new(account_id, access_key_id, secret_access_key);

        if let Ok(bucket) = std::env::var("R2_BUCKET_NAME") {
            config.bucket_name = bucket;
        }
        if let Ok(domain) = std::env::var("R2_PUBLIC_DOMAIN") {
            config.public_domain = Some(domain);
        }
        if let Ok(prefix) = std::env::var("R2_KEY_PREFIX") {
            config.key_prefix = prefix;
        }

        Ok(config)
    }

    pub fn bucket_name(mut self, name: impl Into<String>) -> Self {
        self.bucket_name = name.into();
        self
    }

    pub fn public_domain(mut self, domain: impl Into<String>) -> Self {
        self.public_domain = Some(domain.into());
        self
    }

    pub fn key_prefix(mut self, prefix: impl Into<String>) -> Self {
        self.key_prefix = prefix.into();
        self
    }
}

/// Upload arbitrary bytes to R2 with specified extension and content type.
///
/// Key format: `{prefix}/{slug}.{extension}`
pub async fn upload_file(
    config: &R2Config,
    slug: &str,
    extension: &str,
    content_type: &str,
    bytes: &[u8],
) -> Result<R2UploadResult> {
    let endpoint = format!("https://{}.r2.cloudflarestorage.com", config.account_id);
    let region = Region::Custom {
        region: "auto".into(),
        endpoint,
    };

    let credentials = Credentials::new(
        Some(&config.access_key_id),
        Some(&config.secret_access_key),
        None,
        None,
        None,
    )
    .map_err(|e| Error::R2(format!("credentials error: {e}")))?;

    let bucket = Bucket::new(&config.bucket_name, region, credentials)
        .map_err(|e| Error::R2(format!("bucket error: {e}")))?
        .with_path_style();

    let key = if config.key_prefix.is_empty() {
        format!("{slug}.{extension}")
    } else {
        format!("{}/{slug}.{extension}", config.key_prefix)
    };

    let response = bucket
        .put_object_with_content_type(&key, bytes, content_type)
        .await
        .map_err(|e| Error::R2(format!("upload failed: {e}")))?;

    if response.status_code() != 200 {
        return Err(Error::R2(format!(
            "upload returned status {}",
            response.status_code()
        )));
    }

    let public_url = config
        .public_domain
        .as_ref()
        .map(|domain| format!("https://{domain}/{key}"));

    Ok(R2UploadResult {
        key,
        public_url,
        size_bytes: bytes.len(),
    })
}

/// Upload WAV bytes to R2 (convenience wrapper).
///
/// Key format: `{prefix}/{slug}.wav`
pub async fn upload(config: &R2Config, slug: &str, wav_bytes: &[u8]) -> Result<R2UploadResult> {
    upload_file(config, slug, "wav", "audio/wav", wav_bytes).await
}
