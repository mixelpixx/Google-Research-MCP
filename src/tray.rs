//! Windows system tray UI for the HTTP service.
//!
//! Replaces the console window that Windows otherwise creates when the autostart
//! Run-key launches us. We hide the console immediately, then run the HTTP server
//! supervised by a small Win32 message loop that also hosts the tray icon.

#![cfg(windows)]

use anyhow::{Context, Result};
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
    mpsc,
};
use std::thread;
use std::time::Duration;

use tray_icon::{
    Icon, TrayIcon, TrayIconBuilder,
    menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem},
};

use crate::config_file;

// =============================================================================
// Status types — flow from server supervisor to tray UI
// =============================================================================

#[derive(Debug, Clone)]
pub enum ServerStatus {
    Starting,
    Running { port: u16 },
    Stopped,
    Error(String),
}

#[derive(Debug, Clone, Copy)]
enum ServerCmd {
    Restart,
    Stop,
    Quit,
}

// =============================================================================
// Public entry point — called from main.rs when http-service subcommand fires
// =============================================================================

pub fn run_with_tray() -> Result<()> {
    hide_console_window();

    // Two SPSC channels: tray -> server (commands), server -> tray (status).
    let (cmd_tx, cmd_rx) = mpsc::channel::<ServerCmd>();
    let (status_tx, status_rx) = mpsc::channel::<ServerStatus>();

    // Initial status before the server thread reports back
    status_tx
        .send(ServerStatus::Starting)
        .expect("status channel");

    // Run the HTTP server (and its supervisor) on a worker thread that owns
    // its own tokio runtime. Tray + Win32 message pump stay on the main thread.
    let supervisor_status_tx = status_tx.clone();
    let supervisor_thread = thread::Builder::new()
        .name("http-supervisor".into())
        .spawn(move || {
            let rt = match tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
            {
                Ok(rt) => rt,
                Err(e) => {
                    let _ = supervisor_status_tx
                        .send(ServerStatus::Error(format!("tokio init: {}", e)));
                    return;
                }
            };
            rt.block_on(server_supervisor(cmd_rx, supervisor_status_tx));
        })
        .context("spawning supervisor thread")?;

    // Build tray icon + menu. Build a stable menu (item IDs are static strings
    // we match against below) and dynamic status / URL labels we update later.
    let (menu, ids) = build_menu();
    let port = config_file::load()
        .http_port
        .unwrap_or(crate::service::DEFAULT_HTTP_PORT);

    let tray = TrayIconBuilder::new()
        .with_tooltip(format!("google-research-mcp (starting on :{})", port))
        .with_icon(make_solid_icon(IconColor::Yellow))
        .with_menu(Box::new(menu))
        .build()
        .context("building tray icon")?;

    // Run the message loop. Blocks until WM_QUIT.
    run_message_loop(tray, ids, cmd_tx.clone(), status_rx, port);

    // Tell the supervisor to wind down, give it a moment, then exit.
    let _ = cmd_tx.send(ServerCmd::Quit);
    let _ = supervisor_thread.join();
    Ok(())
}

// =============================================================================
// Tray menu — built once, items updated dynamically
// =============================================================================

struct MenuIds {
    status: String,
    url: String,
    open_url: String,
    restart: String,
    stop: String,
    start: String,
    quit: String,
}

fn build_menu() -> (Menu, MenuIds) {
    let menu = Menu::new();

    // Header (disabled label)
    let header = MenuItem::new(
        format!("google-research-mcp v{}", env!("CARGO_PKG_VERSION")),
        false,
        None,
    );
    let status = MenuItem::new("Status: starting...", false, None);
    let url = MenuItem::new("URL: (waiting)", false, None);
    let sep1 = PredefinedMenuItem::separator();
    let open_url = MenuItem::new("Open URL in browser", true, None);
    let restart = MenuItem::new("Restart server", true, None);
    let stop = MenuItem::new("Stop server", true, None);
    let start = MenuItem::new("Start server", false, None); // disabled until stopped
    let sep2 = PredefinedMenuItem::separator();
    let quit = MenuItem::new("Quit", true, None);

    let ids = MenuIds {
        status: status.id().0.clone(),
        url: url.id().0.clone(),
        open_url: open_url.id().0.clone(),
        restart: restart.id().0.clone(),
        stop: stop.id().0.clone(),
        start: start.id().0.clone(),
        quit: quit.id().0.clone(),
    };

    menu.append(&header).unwrap();
    menu.append(&status).unwrap();
    menu.append(&url).unwrap();
    menu.append(&sep1).unwrap();
    menu.append(&open_url).unwrap();
    menu.append(&restart).unwrap();
    menu.append(&stop).unwrap();
    menu.append(&start).unwrap();
    menu.append(&sep2).unwrap();
    menu.append(&quit).unwrap();

    (menu, ids)
}

// =============================================================================
// Win32 message loop — pumps tray clicks, polls our channels for updates
// =============================================================================

fn run_message_loop(
    tray: TrayIcon,
    ids: MenuIds,
    cmd_tx: mpsc::Sender<ServerCmd>,
    status_rx: mpsc::Receiver<ServerStatus>,
    port: u16,
) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        DispatchMessageW, MSG, PM_REMOVE, PeekMessageW, TranslateMessage, WM_QUIT,
    };

    let menu_rx = MenuEvent::receiver();
    let mut current_url = format!("http://localhost:{}/mcp", port);

    loop {
        // Pump Windows messages so tray-icon receives clicks
        unsafe {
            let mut msg: MSG = std::mem::zeroed();
            while PeekMessageW(&mut msg, std::ptr::null_mut(), 0, 0, PM_REMOVE) != 0 {
                if msg.message == WM_QUIT {
                    return;
                }
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }

        // Drain menu events (user clicked something)
        while let Ok(ev) = menu_rx.try_recv() {
            let id = ev.id().0.as_str();
            if id == ids.quit {
                return;
            } else if id == ids.restart {
                let _ = cmd_tx.send(ServerCmd::Restart);
            } else if id == ids.stop {
                let _ = cmd_tx.send(ServerCmd::Stop);
            } else if id == ids.start {
                // "Start" sends Restart — supervisor will spin up a fresh server
                let _ = cmd_tx.send(ServerCmd::Restart);
            } else if id == ids.open_url {
                open_in_browser(&current_url);
            }
        }

        // Drain status events and update tray UI
        while let Ok(status) = status_rx.try_recv() {
            apply_status(&tray, &ids, &status, &mut current_url, port);
        }

        // Sleep briefly so we don't pin a core
        thread::sleep(Duration::from_millis(80));
    }
}

fn apply_status(
    tray: &TrayIcon,
    _ids: &MenuIds,
    status: &ServerStatus,
    current_url: &mut String,
    default_port: u16,
) {
    // tray-icon doesn't currently expose menu-item label updates without
    // rebuilding the menu, so we update the tooltip + icon color, which is
    // what users actually see at a glance. The menu IDs stay valid.
    let (tooltip, color) = match status {
        ServerStatus::Starting => (
            format!("google-research-mcp: starting on :{}", default_port),
            IconColor::Yellow,
        ),
        ServerStatus::Running { port } => {
            *current_url = format!("http://localhost:{}/mcp", port);
            (
                format!("google-research-mcp: running on :{}", port),
                IconColor::Green,
            )
        }
        ServerStatus::Stopped => (
            "google-research-mcp: stopped".to_string(),
            IconColor::Gray,
        ),
        ServerStatus::Error(e) => (
            format!("google-research-mcp: error — {}", truncate(e, 80)),
            IconColor::Red,
        ),
    };
    let _ = tray.set_tooltip(Some(tooltip));
    let _ = tray.set_icon(Some(make_solid_icon(color)));
}

fn truncate(s: &str, n: usize) -> String {
    if s.chars().count() <= n {
        s.to_string()
    } else {
        let mut out: String = s.chars().take(n.saturating_sub(1)).collect();
        out.push('…');
        out
    }
}

// =============================================================================
// HTTP server supervisor — owns the running server, responds to commands
// =============================================================================

async fn server_supervisor(
    cmd_rx: mpsc::Receiver<ServerCmd>,
    status_tx: mpsc::Sender<ServerStatus>,
) {
    let running = Arc::new(AtomicBool::new(false));

    // Start the server initially
    let mut shutdown = spawn_server(running.clone(), status_tx.clone()).await;

    // Use a separate thread to bridge the std::sync::mpsc receiver to our async loop
    let (async_tx, mut async_rx) = tokio::sync::mpsc::channel::<ServerCmd>(8);
    thread::spawn(move || {
        while let Ok(cmd) = cmd_rx.recv() {
            if async_tx.blocking_send(cmd).is_err() {
                break;
            }
        }
    });

    while let Some(cmd) = async_rx.recv().await {
        match cmd {
            ServerCmd::Stop => {
                if let Some(s) = shutdown.take() {
                    let _ = s.send(());
                }
                running.store(false, Ordering::SeqCst);
                let _ = status_tx.send(ServerStatus::Stopped);
            }
            ServerCmd::Restart => {
                if let Some(s) = shutdown.take() {
                    let _ = s.send(());
                }
                running.store(false, Ordering::SeqCst);
                // Brief pause so the port releases cleanly
                tokio::time::sleep(Duration::from_millis(300)).await;
                let _ = status_tx.send(ServerStatus::Starting);
                shutdown = spawn_server(running.clone(), status_tx.clone()).await;
            }
            ServerCmd::Quit => {
                if let Some(s) = shutdown.take() {
                    let _ = s.send(());
                }
                running.store(false, Ordering::SeqCst);
                break;
            }
        }
    }
}

/// Spawn the HTTP server. Returns a shutdown channel; sending `()` triggers
/// graceful shutdown.
async fn spawn_server(
    running: Arc<AtomicBool>,
    status_tx: mpsc::Sender<ServerStatus>,
) -> Option<tokio::sync::oneshot::Sender<()>> {
    // Resolve config — SERPAPI_KEY from env or persisted config file
    let cfg = match crate::config::Config::from_env() {
        Ok(c) => c,
        Err(e) => {
            let _ = status_tx.send(ServerStatus::Error(format!("config: {}", e)));
            return None;
        }
    };

    // Override port from saved config if not set via env
    let port = cfg.port;
    let bind = format!("0.0.0.0:{}", port);

    let server = crate::server::GoogleResearchServer::new(cfg);
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let http_service = rmcp::transport::StreamableHttpService::new(
        move || Ok(server.clone()),
        rmcp::transport::streamable_http_server::session::local::LocalSessionManager::default()
            .into(),
        rmcp::transport::StreamableHttpServerConfig::default(),
    );
    let router = axum::Router::new().nest_service("/mcp", http_service);

    let listener = match tokio::net::TcpListener::bind(&bind).await {
        Ok(l) => l,
        Err(e) => {
            let _ = status_tx.send(ServerStatus::Error(format!(
                "bind {} failed: {}",
                bind, e
            )));
            return None;
        }
    };

    running.store(true, Ordering::SeqCst);
    let _ = status_tx.send(ServerStatus::Running { port });

    let status_for_task = status_tx.clone();
    tokio::spawn(async move {
        let serve = axum::serve(listener, router).with_graceful_shutdown(async move {
            let _ = shutdown_rx.await;
        });
        if let Err(e) = serve.await {
            let _ = status_for_task.send(ServerStatus::Error(format!("serve: {}", e)));
        }
    });

    Some(shutdown_tx)
}

// =============================================================================
// Icons — generated programmatically, no asset files needed
// =============================================================================

#[derive(Copy, Clone)]
enum IconColor {
    Green,
    Yellow,
    Red,
    Gray,
}

fn make_solid_icon(color: IconColor) -> Icon {
    let (r, g, b) = match color {
        IconColor::Green => (40, 180, 70),
        IconColor::Yellow => (230, 180, 30),
        IconColor::Red => (210, 60, 60),
        IconColor::Gray => (130, 130, 135),
    };
    // 16x16 disk on transparent background — better than a square, looks more
    // like a "status dot."
    let size = 16usize;
    let mut rgba = vec![0u8; size * size * 4];
    let cx = (size as f32 - 1.0) / 2.0;
    let cy = (size as f32 - 1.0) / 2.0;
    let radius = 7.2f32;
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - cx;
            let dy = y as f32 - cy;
            let d = (dx * dx + dy * dy).sqrt();
            let i = (y * size + x) * 4;
            if d <= radius {
                rgba[i] = r;
                rgba[i + 1] = g;
                rgba[i + 2] = b;
                rgba[i + 3] = 255;
            } else if d <= radius + 1.0 {
                // 1-pixel antialiased edge
                let alpha = (255.0 * (radius + 1.0 - d).clamp(0.0, 1.0)) as u8;
                rgba[i] = r;
                rgba[i + 1] = g;
                rgba[i + 2] = b;
                rgba[i + 3] = alpha;
            }
        }
    }
    Icon::from_rgba(rgba, size as u32, size as u32).expect("solid icon")
}

// =============================================================================
// Win32 helpers
// =============================================================================

fn hide_console_window() {
    use windows_sys::Win32::System::Console::GetConsoleWindow;
    use windows_sys::Win32::UI::WindowsAndMessaging::{SW_HIDE, ShowWindow};
    unsafe {
        let hwnd = GetConsoleWindow();
        if !hwnd.is_null() {
            ShowWindow(hwnd, SW_HIDE);
        }
    }
}

fn open_in_browser(url: &str) {
    // `start` is a cmd builtin so we have to go through cmd. The empty first
    // argument is required so `start` doesn't consume our URL as a window title
    // when the URL contains spaces.
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", url])
        .spawn();
}
