// google-research-mcp — main binary entry point.
//
// Linked as a Windows GUI subsystem app so there is no auto-created console
// window when launched from File Explorer or by an MCP client. CLI subcommands
// attach to the parent's console (cmd / PowerShell) so output still appears
// when the user runs the binary from a terminal.
#![cfg_attr(all(windows, not(debug_assertions)), windows_subsystem = "windows")]

use anyhow::Result;
use rmcp::{
    ServiceExt,
    transport::{
        StreamableHttpServerConfig, StreamableHttpService,
        stdio,
        streamable_http_server::session::local::LocalSessionManager,
    },
};
use tracing_subscriber::{EnvFilter, fmt};

use google_research_mcp::{config, config_file, crashlog, diagnose, install, server, service};

#[cfg(windows)]
use google_research_mcp::{console, gui_install, tray};

fn main() -> Result<()> {
    // Install crash-to-file panic hook so windows-subsystem failures aren't silent.
    crashlog::install_panic_hook();

    let args: Vec<String> = std::env::args().collect();
    crashlog::note(&format!("main() entered with args: {:?}", args));

    // ---- Subcommand dispatch ----------------------------------------------
    // For CLI subcommands we attach to the parent's console (if any) so
    // output goes to the cmd/PowerShell window that invoked us.
    if args.len() >= 2 {
        #[cfg(windows)]
        let _ = console::try_attach_parent();

        let result = dispatch_subcommand(&args);

        #[cfg(windows)]
        console::flush_trailing_newline();

        return result;
    }

    // ---- No subcommand: figure out which mode -----------------------------
    //
    // Three cases distinguished by Win32 GetFileType on STD_INPUT_HANDLE:
    //   - FILE_TYPE_PIPE     -> MCP server over stdio (Claude Desktop)
    //   - FILE_TYPE_CHAR     -> cmd/PowerShell with no args, print help
    //   - FILE_TYPE_UNKNOWN  -> File Explorer launch, show GUI installer
    let stdio_kind = detect_stdio_kind();
    crashlog::note(&format!("stdio detection: {:?}", stdio_kind));

    match stdio_kind {
        StdioKind::Pipe => {
            crashlog::note("stdio piped -> MCP server mode");
            if install::needs_install() {
                let _ = install::run_install_silent();
            }
            run_server()
        }
        StdioKind::Console => {
            crashlog::note("stdio is console -> print help");
            #[cfg(windows)]
            {
                let _ = console::try_attach_parent();
                print_help();
                console::flush_trailing_newline();
            }
            #[cfg(not(windows))]
            {
                print_help();
            }
            Ok(())
        }
        StdioKind::None => {
            crashlog::note("no stdio handle -> GUI installer");
            #[cfg(windows)]
            {
                return run_gui_installer();
            }
            #[cfg(not(windows))]
            {
                print_help();
                Ok(())
            }
        }
    }
}

#[derive(Debug, Copy, Clone)]
enum StdioKind {
    Pipe,
    Console,
    None,
}

#[cfg(windows)]
fn detect_stdio_kind() -> StdioKind {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::Storage::FileSystem::{
        FILE_TYPE_CHAR, FILE_TYPE_DISK, FILE_TYPE_PIPE, GetFileType,
    };
    use windows_sys::Win32::System::Console::{GetStdHandle, STD_INPUT_HANDLE};
    unsafe {
        let h = GetStdHandle(STD_INPUT_HANDLE);
        if h.is_null() || h == INVALID_HANDLE_VALUE {
            return StdioKind::None;
        }
        match GetFileType(h) {
            FILE_TYPE_PIPE | FILE_TYPE_DISK => StdioKind::Pipe,
            FILE_TYPE_CHAR => StdioKind::Console,
            _ => StdioKind::None,
        }
    }
}

#[cfg(not(windows))]
fn detect_stdio_kind() -> StdioKind {
    use std::io::IsTerminal;
    if std::io::stdin().is_terminal() {
        StdioKind::Console
    } else {
        StdioKind::Pipe
    }
}

fn dispatch_subcommand(args: &[String]) -> Result<()> {
    match args.get(1).map(String::as_str) {
        Some("init") => install::run_install(),
        Some("uninstall") => install::run_uninstall(),
        Some("status") => install::print_status(),
        Some("diagnose") | Some("doctor") => run_diagnose_blocking(),
        Some("service") => {
            let sub = args.get(2).map(String::as_str).unwrap_or("");
            service::run(sub)
        }
        Some("http-service") => run_http_service(),
        Some("skill") => {
            let name = args.get(2).map(String::as_str).unwrap_or("");
            install::print_skill_content(name)
        }
        Some("--help") | Some("-h") | Some("help") => {
            print_help();
            Ok(())
        }
        Some("--version") | Some("-V") => {
            println!("google-research-mcp {}", env!("CARGO_PKG_VERSION"));
            Ok(())
        }
        Some(other) => {
            eprintln!("Unknown argument: {}", other);
            print_help();
            std::process::exit(2);
        }
        None => unreachable!(),
    }
}

#[cfg(windows)]
fn run_gui_installer() -> Result<()> {
    crashlog::note("entering GUI installer path");
    let result = std::panic::catch_unwind(|| gui_install::run());
    match result {
        Ok(Ok(())) => {
            crashlog::note("GUI installer exited cleanly");
            Ok(())
        }
        Ok(Err(e)) => {
            crashlog::note(&format!("GUI installer returned error: {}", e));
            // Try to show a Win32 message box so the user sees SOMETHING.
            show_message_box(
                "google-research-mcp installer",
                &format!(
                    "Installer failed to initialize:\n\n{}\n\nA crash log was written to:\n{}",
                    e,
                    crashlog::log_path().display()
                ),
            );
            Err(anyhow::anyhow!(e.to_string()))
        }
        Err(panic) => {
            let msg = if let Some(s) = panic.downcast_ref::<&str>() {
                (*s).to_string()
            } else if let Some(s) = panic.downcast_ref::<String>() {
                s.clone()
            } else {
                "unknown panic".to_string()
            };
            crashlog::note(&format!("GUI installer panicked: {}", msg));
            show_message_box(
                "google-research-mcp installer",
                &format!(
                    "Installer crashed:\n\n{}\n\nA crash log was written to:\n{}",
                    msg,
                    crashlog::log_path().display()
                ),
            );
            Err(anyhow::anyhow!("GUI installer panicked: {}", msg))
        }
    }
}

#[cfg(windows)]
fn show_message_box(title: &str, body: &str) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MB_OK, MessageBoxW};
    let title_w: Vec<u16> = title.encode_utf16().chain(std::iter::once(0)).collect();
    let body_w: Vec<u16> = body.encode_utf16().chain(std::iter::once(0)).collect();
    unsafe {
        MessageBoxW(
            std::ptr::null_mut(),
            body_w.as_ptr(),
            title_w.as_ptr(),
            MB_OK | MB_ICONERROR,
        );
    }
}

/// Bridge from the synchronous main() into the async diagnose routine.
fn run_diagnose_blocking() -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(diagnose::run_diagnose())
}

/// Internal subcommand kept for backward compatibility — the new flow uses the
/// separate `google-research-mcp-tray.exe` for autostart, but this still works
/// as a fallback if the tray binary isn't deployed alongside.
fn run_http_service() -> Result<()> {
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

    #[cfg(windows)]
    {
        return tray::run_with_tray().map_err(|e| anyhow::anyhow!(e.to_string()));
    }
    #[cfg(not(windows))]
    {
        run_server()
    }
}

fn print_help() {
    println!(
        r#"google-research-mcp {} — Google search & research MCP server

USAGE:
    google-research-mcp [SUBCOMMAND]

SUBCOMMANDS (run from cmd / PowerShell):
    (none)             Launch GUI installer (when double-clicked from Explorer)
                       Or run MCP server (when launched by Claude Desktop)
    init               Install skills + agents into ~/.claude/
    uninstall          Remove installed skills + agents
    status             Show install status
    diagnose           Self-test the binary (live SerpAPI request, timing)
    service install    Enable HTTP autostart + spawn tray-based server
    service uninstall  Remove autostart registration
    service status     Show service state (config, autostart, port)
    service start      Spawn the tray HTTP server right now (no autostart)
    skill <name>       Print a skill's markdown content to stdout
    help               Show this message
    --version          Show version

GUI INSTALLER:
    Double-click google-research-mcp.exe from File Explorer to launch a
    native install dialog. Paste your SerpAPI key, click Install. The
    background HTTP service runs as a separate windows-subsystem binary
    (google-research-mcp-tray.exe) registered to start on every login.

ENVIRONMENT (server mode):
    SERPAPI_KEY     Your SerpAPI key. Read from config file if not set.
    MCP_TRANSPORT   "stdio" (default) or "http".
    PORT            HTTP port (default 3030).

SKILLS (auto-invoked by Claude based on intent):
    deep-research, fact-check, find-docs, news-monitor,
    competitive-analysis, cite-sources

AGENTS (auto-delegated by Claude when context savings matter):
    deep-research-agent
"#,
        env!("CARGO_PKG_VERSION")
    );
}

#[tokio::main]
async fn run_server() -> Result<()> {
    fmt()
        .with_env_filter(
            EnvFilter::from_default_env()
                .add_directive("google_research_mcp=info".parse()?)
                .add_directive("rmcp=warn".parse()?),
        )
        .with_writer(std::io::stderr)
        .with_ansi(false)
        .init();

    let config = config::Config::from_env().map_err(|e| {
        eprintln!("Configuration error: {}", e);
        eprintln!();
        eprintln!("Set SERPAPI_KEY in your environment, or run `google-research-mcp service install`");
        eprintln!("to save it to the config file and enable HTTP autostart.");
        e
    })?;

    tracing::info!(
        "google-research-mcp starting (transport: {:?})",
        config.transport
    );

    let server = server::GoogleResearchServer::new(config.clone());

    match config.transport {
        config::Transport::Stdio => {
            let service = server.serve(stdio()).await.inspect_err(|e| {
                tracing::error!("Server error: {:?}", e);
            })?;
            service.waiting().await?;
        }
        config::Transport::Http => {
            let bind_addr = format!("0.0.0.0:{}", config.port);
            tracing::info!("HTTP transport listening on http://{}/mcp", bind_addr);

            let http_service = StreamableHttpService::new(
                move || Ok(server.clone()),
                LocalSessionManager::default().into(),
                StreamableHttpServerConfig::default(),
            );

            let router = axum::Router::new().nest_service("/mcp", http_service);
            let listener = tokio::net::TcpListener::bind(&bind_addr).await?;
            axum::serve(listener, router).await?;
        }
    }

    Ok(())
}
