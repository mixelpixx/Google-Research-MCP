//! Persistent on-disk config. Used to provide SERPAPI_KEY to the HTTP service
//! when it's launched by Windows autostart (no environment variables are
//! available in that context).
//!
//! Location: ~/.google-research-mcp/config.toml

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct PersistedConfig {
    pub serpapi_key: Option<String>,
    pub http_port: Option<u16>,
}

pub fn config_path() -> Option<PathBuf> {
    Some(
        dirs::home_dir()?
            .join(".google-research-mcp")
            .join("config.toml"),
    )
}

pub fn load() -> PersistedConfig {
    let Some(p) = config_path() else {
        return PersistedConfig::default();
    };
    let Ok(text) = std::fs::read_to_string(&p) else {
        return PersistedConfig::default();
    };
    toml::from_str(&text).unwrap_or_default()
}

pub fn save(cfg: &PersistedConfig) -> Result<PathBuf> {
    let p = config_path().context("could not locate home directory")?;
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let text = toml::to_string_pretty(cfg)?;
    std::fs::write(&p, text)?;
    Ok(p)
}

/// Returns the SERPAPI_KEY from env var if set, else from the config file.
pub fn resolve_serpapi_key() -> Option<String> {
    if let Ok(k) = std::env::var("SERPAPI_KEY") {
        if !k.trim().is_empty() {
            return Some(k);
        }
    }
    load().serpapi_key.filter(|k| !k.trim().is_empty())
}
