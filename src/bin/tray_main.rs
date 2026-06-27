// google-research-mcp-tray — windows-subsystem binary.
//
// This is the binary that Windows autostart launches on every login. It is
// linked as a GUI-subsystem app so Windows DOES NOT create a console for it,
// meaning there is no console flash at login. It owns the HTTP server and the
// system tray icon; all CLI is in the sibling `google-research-mcp.exe`.
#![windows_subsystem = "windows"]

#[cfg(windows)]
fn main() {
    use google_research_mcp::{config_file, service, tray};

    // Pull persisted config into env vars so the shared Config::from_env()
    // path finds them. (Win32 autostart doesn't propagate env vars.)
    let cfg = config_file::load();
    if let Some(k) = cfg.serpapi_key.as_deref() {
        unsafe {
            std::env::set_var("SERPAPI_KEY", k);
        }
    }
    unsafe {
        std::env::set_var("MCP_TRANSPORT", "http");
        std::env::set_var(
            "PORT",
            cfg.http_port.unwrap_or(service::DEFAULT_HTTP_PORT).to_string(),
        );
    }

    // Run the tray UI + supervised HTTP server. Returns when the user clicks
    // Quit. Errors are logged to a tracing subscriber that writes to a file
    // (no console available in windows-subsystem).
    if let Err(e) = tray::run_with_tray() {
        // Last-ditch: write to a crashlog beside the exe so we have something
        // to look at if the tray fails to come up.
        let crashlog = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("tray-crash.log")));
        if let Some(path) = crashlog {
            let _ = std::fs::write(&path, format!("tray::run_with_tray failed: {}\n", e));
        }
        std::process::exit(1);
    }
}

#[cfg(not(windows))]
fn main() {
    eprintln!("google-research-mcp-tray is a Windows-only binary.");
    std::process::exit(1);
}
