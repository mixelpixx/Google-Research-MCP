use anyhow::Result;

use crate::config_file;

#[derive(Debug, Clone)]
pub struct Config {
    pub serpapi_key: String,
    pub transport: Transport,
    pub port: u16,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Transport {
    Stdio,
    Http,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        // Try env var first, then fall back to the persisted config file
        // (used when launched by Windows autostart via the Run registry key).
        let serpapi_key = config_file::resolve_serpapi_key()
            .ok_or_else(|| anyhow::anyhow!("SERPAPI_KEY is required (env var or config file)"))?;

        if serpapi_key.trim().is_empty() {
            anyhow::bail!("SERPAPI_KEY is set but empty");
        }

        let transport = match std::env::var("MCP_TRANSPORT")
            .unwrap_or_default()
            .to_lowercase()
            .as_str()
        {
            "http" => Transport::Http,
            _ => Transport::Stdio,
        };

        // Default HTTP port mirrors the service-install default so saved configs
        // and ad-hoc env-var runs land on the same URL.
        let port = std::env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .or_else(|| config_file::load().http_port)
            .unwrap_or(3030u16);

        Ok(Config {
            serpapi_key,
            transport,
            port,
        })
    }
}
