//! Crash + diagnostic logging to a file next to the exe.
//!
//! With `windows_subsystem = "windows"`, stderr panics are invisible — the OS
//! silently terminates the process and the user sees nothing. This module
//! installs a panic hook that writes to `<exe-dir>/google-research-mcp-crash.log`
//! so we can debug GUI-init failures and other early crashes.

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

/// Returns the path to the crash log file. Sits next to the exe so users can
/// find it without digging in temp folders.
pub fn log_path() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::env::temp_dir())
        .join("google-research-mcp-crash.log")
}

/// Install a panic hook that appends to the crash log file.
pub fn install_panic_hook() {
    std::panic::set_hook(Box::new(|info| {
        let _ = append(&format!(
            "PANIC at {}: {}\n",
            timestamp(),
            info
        ));
    }));
}

/// Append a line to the crash log. Best-effort; failures are ignored because
/// what would we do with them anyway.
pub fn note(msg: &str) {
    let _ = append(&format!("[{}] {}\n", timestamp(), msg));
}

fn append(content: &str) -> std::io::Result<()> {
    let mut f = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path())?;
    f.write_all(content.as_bytes())?;
    Ok(())
}

fn timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = now.as_secs();
    // Plain UTC seconds; we're not going to pull in chrono just for crash logs
    format!("t={}", secs)
}
