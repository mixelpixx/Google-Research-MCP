//! Native Windows GUI installer (single-page swap-to-success design).
//!
//! Replaces the console-based double-click install flow. Shows a small native
//! dialog with: skills/agent install status, SerpAPI key field, "Enable HTTP
//! service" checkbox, and an Install button. After install completes the same
//! window swaps to a success page with copy-to-clipboard JSON snippets for
//! both Claude Desktop (stdio) and LM Studio (HTTP).

#![cfg(windows)]

use std::cell::RefCell;
use std::rc::Rc;

use native_windows_gui as nwg;
use nwg::NativeUi;

use crate::{config_file::PersistedConfig, install, service};

// Layout constants. Tuned to feel close to standard Windows install dialogs:
// compact, Segoe UI 9pt body, slightly larger header. Width comfortably holds
// the longest hint line; height grows just enough for all the rows.
const WINDOW_W: i32 = 520;
const WINDOW_H: i32 = 430;
const PAD: i32 = 16;

// Font sizes are NWG "logical units" (close to pixels at 96 DPI). These map
// roughly to: 14 -> body, 18 -> header, 13 -> small/hint, code uses Consolas.
const FONT_HEADER: u32 = 18;
const FONT_BODY: u32 = 14;
const FONT_HINT: u32 = 13;
const FONT_CODE: u32 = 14;

/// Public entry point — called from main.rs when no args + no parent console.
/// Blocks until the user closes the dialog. Returns Ok regardless of whether
/// the user installed or cancelled; the install itself is best-effort.
pub fn run() -> Result<(), Box<dyn std::error::Error>> {
    crate::crashlog::note("gui_install::run() - calling nwg::init()");
    nwg::init().map_err(|e| {
        crate::crashlog::note(&format!("nwg::init failed: {}", e));
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    crate::crashlog::note("nwg::init OK - setting global font");
    if let Err(e) = nwg::Font::set_global_family("Segoe UI") {
        crate::crashlog::note(&format!("Font set_global_family failed (continuing): {}", e));
    }

    crate::crashlog::note("building UI");
    let ui = InstallerUi::default();
    let nwg_ui = InstallerUi::build_ui(ui).map_err(|e| {
        crate::crashlog::note(&format!("build_ui failed: {}", e));
        Box::new(e) as Box<dyn std::error::Error>
    })?;

    crate::crashlog::note("UI built - entering dispatch loop");
    nwg::dispatch_thread_events();
    crate::crashlog::note("dispatch loop exited");
    drop(nwg_ui);
    Ok(())
}

// =============================================================================
// State shared between event handlers
// =============================================================================

#[derive(Default)]
struct State {
    on_success_page: bool,
    /// Set after a successful install — populated with the snippets we show.
    snippets: Option<Snippets>,
}

#[derive(Clone, Default)]
struct Snippets {
    claude_desktop: String,
    lm_studio: String,
}

// =============================================================================
// UI struct — controls + state + event wiring
// =============================================================================

#[derive(Default)]
pub struct InstallerUi {
    window: nwg::Window,

    // --- Form page controls ---
    header: nwg::Label,
    subheader: nwg::Label,
    skills_label: nwg::Label,
    agents_label: nwg::Label,
    key_label: nwg::Label,
    key_input: nwg::TextInput,
    key_hint: nwg::Label,
    http_checkbox: nwg::CheckBox,
    http_hint: nwg::Label,
    install_btn: nwg::Button,
    cancel_btn: nwg::Button,
    status: nwg::Label,

    // --- Success page controls ---
    success_header: nwg::Label,
    success_summary: nwg::Label,
    claude_label: nwg::Label,
    claude_snippet: nwg::TextBox,
    claude_copy_btn: nwg::Button,
    lmstudio_label: nwg::Label,
    lmstudio_snippet: nwg::TextBox,
    lmstudio_copy_btn: nwg::Button,
    done_btn: nwg::Button,

    state: Rc<RefCell<State>>,
}

mod implementation {
    use super::*;

    pub struct InstallerUiWrapper {
        pub inner: Rc<InstallerUi>,
        handlers: RefCell<Vec<nwg::EventHandler>>,
    }

    impl Drop for InstallerUiWrapper {
        fn drop(&mut self) {
            for h in self.handlers.borrow_mut().drain(..) {
                nwg::unbind_event_handler(&h);
            }
        }
    }

    impl nwg::NativeUi<InstallerUiWrapper> for InstallerUi {
        fn build_ui(mut data: InstallerUi) -> Result<InstallerUiWrapper, nwg::NwgError> {
            // ----- Window -----
            nwg::Window::builder()
                .size((WINDOW_W, WINDOW_H))
                .position((300, 200))
                .title(&format!(
                    "google-research-mcp setup v{}",
                    env!("CARGO_PKG_VERSION")
                ))
                .flags(nwg::WindowFlags::WINDOW | nwg::WindowFlags::VISIBLE)
                .build(&mut data.window)?;

            // Fonts. Set up once, reused everywhere.
            let mut body_font = nwg::Font::default();
            nwg::Font::builder()
                .family("Segoe UI")
                .size(FONT_BODY)
                .build(&mut body_font)?;

            let mut header_font = nwg::Font::default();
            nwg::Font::builder()
                .family("Segoe UI Semibold")
                .size(FONT_HEADER)
                .weight(600)
                .build(&mut header_font)?;

            let mut hint_font = nwg::Font::default();
            nwg::Font::builder()
                .family("Segoe UI")
                .size(FONT_HINT)
                .build(&mut hint_font)?;

            let mut code_font = nwg::Font::default();
            nwg::Font::builder()
                .family("Consolas")
                .size(FONT_CODE)
                .build(&mut code_font)?;

            // ----- Form page (laid out top-down) -----
            let mut y = PAD;
            let row_h = 20;
            let input_h = 24;
            let button_h = 28;
            let inner_w = WINDOW_W - 2 * PAD;

            nwg::Label::builder()
                .text("Set up google-research-mcp")
                .size((inner_w, 26))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.header)?;
            data.header.set_font(Some(&header_font));
            y += 32;

            nwg::Label::builder()
                .text("Installs skills, an agent, and (optionally) the background HTTP service.")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.subheader)?;
            data.subheader.set_font(Some(&body_font));
            y += row_h + 6;

            nwg::Label::builder()
                .text("• 6 skills will be written to ~/.claude/skills/")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.skills_label)?;
            data.skills_label.set_font(Some(&hint_font));
            y += row_h;

            nwg::Label::builder()
                .text("• 1 agent will be written to ~/.claude/agents/")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.agents_label)?;
            data.agents_label.set_font(Some(&hint_font));
            y += row_h + 14;

            nwg::Label::builder()
                .text("SerpAPI key")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.key_label)?;
            data.key_label.set_font(Some(&body_font));
            y += row_h;

            let prefill = crate::config_file::resolve_serpapi_key().unwrap_or_default();

            nwg::TextInput::builder()
                .text(&prefill)
                .size((inner_w, input_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.key_input)?;
            data.key_input.set_font(Some(&body_font));
            y += input_h + 4;

            nwg::Label::builder()
                .text("Get a free key (100 searches/month) at serpapi.com/manage-api-key")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.key_hint)?;
            data.key_hint.set_font(Some(&hint_font));
            y += row_h + 12;

            nwg::CheckBox::builder()
                .text("Enable HTTP service  (recommended — required for LM Studio)")
                .size((inner_w, row_h + 2))
                .position((PAD, y))
                .check_state(nwg::CheckBoxState::Checked)
                .parent(&data.window)
                .build(&mut data.http_checkbox)?;
            data.http_checkbox.set_font(Some(&body_font));
            y += row_h + 2;

            nwg::Label::builder()
                .text("Background server, auto-starts on every login, no console window.")
                .size((inner_w - 20, row_h))
                .position((PAD + 20, y))
                .parent(&data.window)
                .build(&mut data.http_hint)?;
            data.http_hint.set_font(Some(&hint_font));
            y += row_h + 18;

            // Buttons right-aligned
            let btn_w = 96;
            let btn_gap = 8;
            let install_x = WINDOW_W - PAD - btn_w * 2 - btn_gap;
            let cancel_x = WINDOW_W - PAD - btn_w;
            nwg::Button::builder()
                .text("Install")
                .size((btn_w, button_h))
                .position((install_x, y))
                .parent(&data.window)
                .build(&mut data.install_btn)?;
            data.install_btn.set_font(Some(&body_font));
            nwg::Button::builder()
                .text("Cancel")
                .size((btn_w, button_h))
                .position((cancel_x, y))
                .parent(&data.window)
                .build(&mut data.cancel_btn)?;
            data.cancel_btn.set_font(Some(&body_font));
            y += button_h + 6;

            nwg::Label::builder()
                .text("")
                .size((inner_w, row_h))
                .position((PAD, y))
                .parent(&data.window)
                .build(&mut data.status)?;
            data.status.set_font(Some(&hint_font));

            // ----- Success page (built hidden, placed top-down) -----
            let mut sy = PAD;
            let snippet_h = 64;

            nwg::Label::builder()
                .text("Installation complete")
                .size((inner_w, 26))
                .position((PAD, sy))
                .parent(&data.window)
                .build(&mut data.success_header)?;
            data.success_header.set_font(Some(&header_font));
            data.success_header.set_visible(false);
            sy += 32;

            nwg::Label::builder()
                .text("")
                .size((inner_w, row_h * 3))
                .position((PAD, sy))
                .parent(&data.window)
                .build(&mut data.success_summary)?;
            data.success_summary.set_font(Some(&body_font));
            data.success_summary.set_visible(false);
            sy += row_h * 3 + 6;

            nwg::Label::builder()
                .text("Claude Desktop / Claude Code (paste into claude_desktop_config.json):")
                .size((inner_w, row_h))
                .position((PAD, sy))
                .parent(&data.window)
                .build(&mut data.claude_label)?;
            data.claude_label.set_font(Some(&body_font));
            data.claude_label.set_visible(false);
            sy += row_h;

            let snippet_w = inner_w - btn_w - btn_gap;
            nwg::TextBox::builder()
                .text("")
                .size((snippet_w, snippet_h))
                .position((PAD, sy))
                .parent(&data.window)
                .readonly(true)
                .flags(nwg::TextBoxFlags::VISIBLE | nwg::TextBoxFlags::VSCROLL)
                .build(&mut data.claude_snippet)?;
            data.claude_snippet.set_font(Some(&code_font));
            data.claude_snippet.set_visible(false);

            nwg::Button::builder()
                .text("Copy")
                .size((btn_w, button_h))
                .position((WINDOW_W - PAD - btn_w, sy))
                .parent(&data.window)
                .build(&mut data.claude_copy_btn)?;
            data.claude_copy_btn.set_font(Some(&body_font));
            data.claude_copy_btn.set_visible(false);
            sy += snippet_h + 10;

            nwg::Label::builder()
                .text("LM Studio (paste into mcp.json):")
                .size((inner_w, row_h))
                .position((PAD, sy))
                .parent(&data.window)
                .build(&mut data.lmstudio_label)?;
            data.lmstudio_label.set_font(Some(&body_font));
            data.lmstudio_label.set_visible(false);
            sy += row_h;

            nwg::TextBox::builder()
                .text("")
                .size((snippet_w, snippet_h - 12))
                .position((PAD, sy))
                .parent(&data.window)
                .readonly(true)
                .flags(nwg::TextBoxFlags::VISIBLE | nwg::TextBoxFlags::VSCROLL)
                .build(&mut data.lmstudio_snippet)?;
            data.lmstudio_snippet.set_font(Some(&code_font));
            data.lmstudio_snippet.set_visible(false);

            nwg::Button::builder()
                .text("Copy")
                .size((btn_w, button_h))
                .position((WINDOW_W - PAD - btn_w, sy))
                .parent(&data.window)
                .build(&mut data.lmstudio_copy_btn)?;
            data.lmstudio_copy_btn.set_font(Some(&body_font));
            data.lmstudio_copy_btn.set_visible(false);
            sy += (snippet_h - 12) + 14;

            nwg::Button::builder()
                .text("Done")
                .size((btn_w, button_h))
                .position((WINDOW_W - PAD - btn_w, sy))
                .parent(&data.window)
                .build(&mut data.done_btn)?;
            data.done_btn.set_font(Some(&body_font));
            data.done_btn.set_visible(false);

            // ----- Wrap and wire events -----
            let inner = Rc::new(data);
            let window_handle = inner.window.handle;
            let wrapper = InstallerUiWrapper {
                inner: inner.clone(),
                handlers: RefCell::new(Vec::new()),
            };

            let handler_ui = inner.clone();
            let h = nwg::full_bind_event_handler(&window_handle, move |evt, _data, handle| {
                use nwg::Event::*;
                match evt {
                    OnButtonClick => {
                        if handle == handler_ui.install_btn.handle {
                            on_install(&handler_ui);
                        } else if handle == handler_ui.cancel_btn.handle {
                            nwg::stop_thread_dispatch();
                        } else if handle == handler_ui.claude_copy_btn.handle {
                            if let Some(s) = &handler_ui.state.borrow().snippets {
                                copy_to_clipboard(&handler_ui.window, &s.claude_desktop);
                            }
                        } else if handle == handler_ui.lmstudio_copy_btn.handle {
                            if let Some(s) = &handler_ui.state.borrow().snippets {
                                copy_to_clipboard(&handler_ui.window, &s.lm_studio);
                            }
                        } else if handle == handler_ui.done_btn.handle {
                            nwg::stop_thread_dispatch();
                        }
                    }
                    OnWindowClose => {
                        if handle == handler_ui.window.handle {
                            nwg::stop_thread_dispatch();
                        }
                    }
                    _ => {}
                }
            });
            wrapper.handlers.borrow_mut().push(h);

            Ok(wrapper)
        }
    }
}

pub use implementation::InstallerUiWrapper;

// =============================================================================
// Event handlers — install + snippet rendering
// =============================================================================

fn on_install(ui: &InstallerUi) {
    let key = ui.key_input.text().trim().to_string();
    if key.is_empty() {
        ui.status.set_text("SerpAPI key cannot be empty.");
        return;
    }

    let enable_http = ui.http_checkbox.check_state() == nwg::CheckBoxState::Checked;

    ui.install_btn.set_enabled(false);
    ui.cancel_btn.set_enabled(false);
    ui.status.set_text("Installing skills + agent…");

    // Phase 1: skills + agent
    if let Err(e) = install::run_install_silent() {
        ui.status.set_text(&format!("Install failed: {}", e));
        ui.install_btn.set_enabled(true);
        ui.cancel_btn.set_enabled(true);
        return;
    }
    ui.skills_label.set_text("✓ 6 skills written to ~/.claude/skills/");
    ui.agents_label.set_text("✓ 1 agent written to ~/.claude/agents/");

    // Phase 2: HTTP service (optional)
    let port = service::DEFAULT_HTTP_PORT;
    if enable_http {
        ui.status.set_text("Saving config, registering autostart, starting server…");
        let _ = crate::config_file::save(&PersistedConfig {
            serpapi_key: Some(key.clone()),
            http_port: Some(port),
        });
        #[cfg(windows)]
        {
            let main_exe = std::env::current_exe().unwrap_or_default();
            // The tray exe lives alongside the main exe with a fixed name.
            let tray_exe = main_exe
                .parent()
                .map(|d| d.join("google-research-mcp-tray.exe"))
                .unwrap_or_else(|| std::path::PathBuf::from("google-research-mcp-tray.exe"));

            if !tray_exe.exists() {
                ui.status.set_text(&format!(
                    "Warning: tray exe not found at {}. HTTP service NOT registered. \
                     Skills are installed; you can use stdio mode only.",
                    tray_exe.display()
                ));
            } else {
                if let Err(e) = service::register_autostart_exe(&tray_exe) {
                    ui.status
                        .set_text(&format!("Autostart registration failed: {}", e));
                } else if let Err(e) = service::spawn_detached(&tray_exe) {
                    ui.status.set_text(&format!(
                        "Server spawn failed: {}. Autostart will kick in on next login.",
                        e
                    ));
                }
            }
        }
    } else {
        // No HTTP service requested — still persist the key so future
        // service-install calls or autostart launches can find it.
        let _ = crate::config_file::save(&PersistedConfig {
            serpapi_key: Some(key.clone()),
            http_port: Some(port),
        });
    }

    // Phase 3: switch to success page
    let main_exe = std::env::current_exe().unwrap_or_default();
    let exe_str = main_exe.to_string_lossy().replace('\\', "\\\\");

    let claude_snippet = format!(
        "\"google-research\": {{\n  \"command\": \"{}\",\n  \"env\": {{ \"SERPAPI_KEY\": \"{}\" }}\n}}",
        exe_str, key
    );
    let lmstudio_snippet = format!(
        "\"google-research\": {{\n  \"url\": \"http://localhost:{}/mcp\"\n}}",
        port
    );

    ui.state.borrow_mut().snippets = Some(Snippets {
        claude_desktop: claude_snippet.clone(),
        lm_studio: lmstudio_snippet.clone(),
    });

    show_success_page(ui, enable_http, port, &claude_snippet, &lmstudio_snippet);
}

fn show_success_page(
    ui: &InstallerUi,
    enable_http: bool,
    port: u16,
    claude_snippet: &str,
    lm_snippet: &str,
) {
    // Hide form controls
    for v in [
        ui.header.handle,
        ui.subheader.handle,
        ui.skills_label.handle,
        ui.agents_label.handle,
        ui.key_label.handle,
        ui.key_input.handle,
        ui.key_hint.handle,
        ui.http_checkbox.handle,
        ui.http_hint.handle,
        ui.install_btn.handle,
        ui.cancel_btn.handle,
        ui.status.handle,
    ] {
        if let Some(ctrl) = nwg::ControlHandle::hwnd(&v) {
            unsafe {
                use windows_sys::Win32::UI::WindowsAndMessaging::{SW_HIDE, ShowWindow};
                ShowWindow(ctrl as _, SW_HIDE);
            }
        }
    }

    // Show success controls
    ui.success_header.set_visible(true);
    ui.success_summary.set_visible(true);
    ui.claude_label.set_visible(true);
    ui.claude_snippet.set_visible(true);
    ui.claude_copy_btn.set_visible(true);
    ui.lmstudio_label.set_visible(true);
    ui.lmstudio_snippet.set_visible(true);
    ui.lmstudio_copy_btn.set_visible(true);
    ui.done_btn.set_visible(true);

    let summary = if enable_http {
        format!(
            "✓ Skills + agent installed\n✓ HTTP service running on http://localhost:{}/mcp\n✓ Autostart registered — will run on every login",
            port
        )
    } else {
        "✓ Skills + agent installed\n(HTTP service was not enabled — you can run it later via the tray binary or `service install`.)".to_string()
    };
    ui.success_summary.set_text(&summary);
    ui.claude_snippet.set_text(claude_snippet);
    ui.lmstudio_snippet.set_text(lm_snippet);

    ui.state.borrow_mut().on_success_page = true;
}

// =============================================================================
// Clipboard helper — uses the Win32 clipboard via NWG's built-in support
// =============================================================================

fn copy_to_clipboard(window: &nwg::Window, text: &str) {
    nwg::Clipboard::set_data_text(window, text);
    // Light visual confirmation: pop a transient message
    nwg::simple_message("Copied", "Snippet copied to clipboard.");
}
