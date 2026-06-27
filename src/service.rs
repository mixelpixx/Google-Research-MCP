//! Auto-start service management. Registers the binary as a Windows login-start
//! item via HKCU\Software\Microsoft\Windows\CurrentVersion\Run, and launches an
//! invisible background HTTP server. Avoids the need for users to manage .bat
//! files or the Windows startup folder by hand.
//!
//! Linux/macOS: subcommands print a friendly "not supported on this OS" message.

use anyhow::Result;
use std::io::{self, BufRead, Write};

use crate::config_file::{self, PersistedConfig};

pub const DEFAULT_HTTP_PORT: u16 = 3030;

pub fn run(subcommand: &str) -> Result<()> {
    match subcommand {
        "install" => install_interactive(),
        "uninstall" => uninstall(),
        "status" => status(),
        "start" => spawn_detached_now(),
        "" | "help" | "--help" | "-h" => {
            print_help();
            Ok(())
        }
        other => {
            eprintln!("Unknown 'service' subcommand: {}\n", other);
            print_help();
            std::process::exit(2);
        }
    }
}

fn print_help() {
    println!(
        r#"google-research-mcp service — manage HTTP autostart

USAGE:
    google-research-mcp service <SUBCOMMAND>

SUBCOMMANDS:
    install     Register HTTP server to start on every Windows login, and
                start it immediately in the background. Recommended for
                LM Studio and any client that doesn't play well with stdio.
    uninstall   Remove autostart registration. Already-running server keeps
                running until you log out or restart.
    status      Show whether autostart is registered + key is saved.
    start       Spawn a hidden background HTTP server right now (one-shot,
                no autostart registration).

After 'install', use this in your MCP client config:

    "google-research": {{ "url": "http://localhost:{}/mcp" }}
"#,
        DEFAULT_HTTP_PORT
    );
}

/// One-shot interactive setup: ask for key (or pull from env), save it,
/// register autostart, spawn the server. Designed to be invoked either from
/// the double-click install flow or directly via `service install`.
pub fn install_interactive() -> Result<()> {
    println!();
    println!("=== HTTP service setup ===\n");

    // 1. SerpAPI key
    let existing = config_file::resolve_serpapi_key();
    let key = match existing {
        Some(k) => {
            let masked = mask(&k);
            println!("Existing SerpAPI key found ({}). Using it.", masked);
            k
        }
        None => prompt_for_key()?,
    };

    // 2. Port — accept default unless user wants otherwise
    let port = DEFAULT_HTTP_PORT;

    // 3. Save config
    let saved_path = config_file::save(&PersistedConfig {
        serpapi_key: Some(key.clone()),
        http_port: Some(port),
    })?;
    println!("  + Config saved   -> {}", saved_path.display());

    // 4. Register autostart (Windows only). Prefer the tray binary (windows-
    //    subsystem, no console flash) if it exists alongside the main exe;
    //    otherwise fall back to the main exe with the `http-service` subcommand.
    #[cfg(windows)]
    {
        let main_exe = std::env::current_exe()?;
        let tray_exe = main_exe
            .parent()
            .map(|d| d.join("google-research-mcp-tray.exe"));
        let (autostart_target, spawn_target) = match tray_exe {
            Some(p) if p.exists() => (p.clone(), p),
            _ => {
                eprintln!(
                    "  ! google-research-mcp-tray.exe not found alongside the main exe."
                );
                eprintln!("    Falling back to main exe (will show a brief console flash on login).");
                (main_exe.clone(), main_exe.clone())
            }
        };

        if autostart_target.file_name().map(|n| n.to_string_lossy().into_owned())
            == Some("google-research-mcp-tray.exe".to_string())
        {
            windows_impl::register_autostart_path(&autostart_target)?;
        } else {
            windows_impl::register_autostart(&autostart_target)?;
        }
        println!(
            "  + Autostart      -> HKCU\\...\\Run\\google-research-mcp = \"{}\"",
            autostart_target.display()
        );

        // 5. Start the server NOW
        match windows_impl::spawn_detached(&spawn_target) {
            Ok(pid) => println!(
                "  + Server spawned -> PID {}, listening on http://localhost:{}/mcp",
                pid, port
            ),
            Err(e) => {
                eprintln!("  ! Spawn failed: {}", e);
                eprintln!("    Autostart will still kick in on next login.");
            }
        }
    }
    #[cfg(not(windows))]
    {
        println!("  ! Autostart is only implemented for Windows.");
        println!("    Run with MCP_TRANSPORT=http to start the HTTP server manually.");
    }

    print_post_install_instructions(port);
    Ok(())
}

fn prompt_for_key() -> Result<String> {
    print!("Paste your SerpAPI key (free tier: https://serpapi.com/manage-api-key): ");
    io::stdout().flush()?;
    let mut input = String::new();
    io::stdin().lock().read_line(&mut input)?;
    let key = input.trim().to_string();
    if key.is_empty() {
        anyhow::bail!("SerpAPI key cannot be empty");
    }
    Ok(key)
}

fn print_post_install_instructions(port: u16) {
    println!();
    println!("---");
    println!("HTTP service is now running and will auto-start on every login.\n");
    println!("Add this to your MCP client config (LM Studio, etc.):\n");
    println!("    \"google-research\": {{");
    println!("      \"url\": \"http://localhost:{}/mcp\"", port);
    println!("    }}\n");
    println!("Restart your MCP client to pick up the change.");
}

pub fn uninstall() -> Result<()> {
    #[cfg(windows)]
    {
        match windows_impl::unregister_autostart() {
            Ok(true) => println!("  + Autostart removed."),
            Ok(false) => println!("  - Autostart was not registered."),
            Err(e) => eprintln!("  ! Could not remove autostart: {}", e),
        }
    }
    #[cfg(not(windows))]
    {
        println!("Autostart not supported on this OS — nothing to remove.");
    }

    println!();
    println!("Note: the running HTTP server (if any) will keep running until you");
    println!("log out, restart Windows, or kill it via Task Manager.");
    println!("Config file (~/.google-research-mcp/config.toml) was NOT deleted —");
    println!("delete it manually if you want to remove your saved SerpAPI key.");
    Ok(())
}

pub fn status() -> Result<()> {
    let cfg = config_file::load();
    let cfg_path = config_file::config_path()
        .map(|p| p.display().to_string())
        .unwrap_or_else(|| "(unknown)".into());

    println!("Service status\n");
    println!("Config file:     {}", cfg_path);
    println!(
        "  SERPAPI_KEY:     {}",
        cfg.serpapi_key
            .as_deref()
            .map(mask)
            .unwrap_or_else(|| "(not saved)".into())
    );
    println!(
        "  http_port:       {}",
        cfg.http_port.unwrap_or(DEFAULT_HTTP_PORT)
    );

    #[cfg(windows)]
    {
        let registered = windows_impl::is_autostart_registered();
        println!("Autostart:       {}", if registered { "REGISTERED" } else { "not registered" });
    }
    #[cfg(not(windows))]
    {
        println!("Autostart:       (Windows only)");
    }

    let port = cfg.http_port.unwrap_or(DEFAULT_HTTP_PORT);
    println!("Probe localhost:{} ...", port);
    match std::net::TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().expect("valid loopback addr"),
        std::time::Duration::from_millis(500),
    ) {
        Ok(_) => println!("  Port is OPEN     (server appears to be running)"),
        Err(_) => println!("  Port is CLOSED   (server not running, or different port)"),
    }
    Ok(())
}

pub fn spawn_detached_now() -> Result<()> {
    #[cfg(windows)]
    {
        let exe = std::env::current_exe()?;
        let pid = windows_impl::spawn_detached_http_service(&exe)?;
        let port = config_file::load().http_port.unwrap_or(DEFAULT_HTTP_PORT);
        println!(
            "Detached HTTP server spawned (PID {}). Listening on http://localhost:{}/mcp",
            pid, port
        );
        Ok(())
    }
    #[cfg(not(windows))]
    {
        anyhow::bail!("`service start` is only implemented for Windows for now")
    }
}

fn mask(k: &str) -> String {
    if k.len() <= 8 {
        return "***".into();
    }
    format!("{}...{}", &k[..4], &k[k.len() - 4..])
}

// ============================================================================
// Windows-specific implementation
// ============================================================================
#[cfg(windows)]
mod windows_impl {
    use anyhow::{Context, Result};
    use std::os::windows::process::CommandExt;
    use std::path::Path;
    use std::process::Command;
    use winreg::enums::*;
    use winreg::RegKey;

    const RUN_KEY: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
    const VALUE_NAME: &str = "google-research-mcp";

    // Windows process creation flags. Bundle so the spawned server has no
    // attached console and survives the parent exiting.
    //   DETACHED_PROCESS  0x00000008  -> no console inherited
    //   CREATE_NO_WINDOW  0x08000000  -> never create a console window
    const SPAWN_FLAGS: u32 = 0x00000008 | 0x08000000;

    pub fn register_autostart(exe: &Path) -> Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (run_key, _) = hkcu.create_subkey(RUN_KEY)?;
        // Quote the path so spaces in directory names are handled correctly.
        let command = format!("\"{}\" http-service", exe.display());
        run_key
            .set_value(VALUE_NAME, &command)
            .context("failed to write Run registry value")?;
        Ok(())
    }

    /// Returns true if a value was removed, false if it didn't exist.
    pub fn unregister_autostart() -> Result<bool> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey_with_flags(RUN_KEY, KEY_WRITE)
            .context("opening Run registry key")?;
        match run_key.delete_value(VALUE_NAME) {
            Ok(_) => Ok(true),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(e) => Err(e.into()),
        }
    }

    pub fn is_autostart_registered() -> bool {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey(RUN_KEY) {
            Ok(run_key) => run_key.get_value::<String, _>(VALUE_NAME).is_ok(),
            Err(_) => false,
        }
    }

    /// Spawn the main binary in `http-service` mode as a detached, hidden process.
    /// Used as a fallback when the tray binary isn't found alongside.
    pub fn spawn_detached_http_service(exe: &Path) -> Result<u32> {
        let child = Command::new(exe)
            .arg("http-service")
            .creation_flags(SPAWN_FLAGS)
            .spawn()
            .context("spawning detached HTTP service")?;
        Ok(child.id())
    }

    /// Register an exe (no extra args — used for the windows-subsystem tray binary).
    pub fn register_autostart_path(exe: &Path) -> Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (run_key, _) = hkcu.create_subkey(RUN_KEY)?;
        let command = format!("\"{}\"", exe.display());
        run_key
            .set_value(VALUE_NAME, &command)
            .context("failed to write Run registry value")?;
        Ok(())
    }

    /// Spawn an arbitrary exe detached (no console, survives parent exit).
    pub fn spawn_detached(exe: &Path) -> Result<u32> {
        let child = Command::new(exe)
            .creation_flags(SPAWN_FLAGS)
            .spawn()
            .context("spawning detached process")?;
        Ok(child.id())
    }
}

// =============================================================================
// Public Windows-only wrappers — used by the GUI installer (gui_install.rs)
// =============================================================================

#[cfg(windows)]
pub fn register_autostart_exe(exe: &std::path::Path) -> Result<()> {
    windows_impl::register_autostart_path(exe)
}

#[cfg(windows)]
pub fn spawn_detached(exe: &std::path::Path) -> Result<u32> {
    windows_impl::spawn_detached(exe)
}
