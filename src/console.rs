//! Console attach/reopen helpers.
//!
//! When the main binary is linked with `#![windows_subsystem = "windows"]`,
//! Windows does NOT auto-create a console at startup. For CLI subcommands we
//! want output to appear in the cmd/PowerShell window that invoked us, so we
//! attach to the parent's console and reopen stdout/stderr/stdin against it.
//!
//! For double-click launches (no parent console), the attach silently fails
//! and we fall through to the GUI installer.

#![cfg(windows)]

use std::ffi::CString;
use std::sync::atomic::{AtomicBool, Ordering};

use windows_sys::Win32::System::Console::{ATTACH_PARENT_PROCESS, AttachConsole};

static ATTACHED: AtomicBool = AtomicBool::new(false);

/// Try to attach to the parent process's console. Returns true if attached
/// (CLI mode), false if there was no parent console (GUI launch path).
pub fn try_attach_parent() -> bool {
    if ATTACHED.load(Ordering::SeqCst) {
        return true;
    }
    let ok = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) } != 0;
    if ok {
        // Reopen the standard streams against the freshly-attached console.
        // Without this, `println!` writes vanish into the void.
        unsafe {
            reopen("CONIN$", "r", libc_stdin());
            reopen("CONOUT$", "w", libc_stdout());
            reopen("CONOUT$", "w", libc_stderr());
        }
        ATTACHED.store(true, Ordering::SeqCst);
    }
    ok
}

/// Print a trailing newline before exiting so the next cmd/PowerShell prompt
/// doesn't render on the same line as our last output. Only matters when we
/// attached to a parent console — that prompt was waiting for us.
pub fn flush_trailing_newline() {
    if ATTACHED.load(Ordering::SeqCst) {
        println!();
    }
}

// =============================================================================
// C-style FILE* helpers — reopen stdio handles after AttachConsole.
//
// We avoid pulling in the `libc` crate just for these three globals; instead
// we declare the MSVC runtime's stdio accessors directly.
// =============================================================================

extern "C" {
    fn freopen(filename: *const i8, mode: *const i8, stream: *mut FILE) -> *mut FILE;
    fn __acrt_iob_func(idx: u32) -> *mut FILE;
}

#[repr(C)]
struct FILE {
    _unused: [u8; 0],
}

unsafe fn libc_stdin() -> *mut FILE {
    __acrt_iob_func(0)
}
unsafe fn libc_stdout() -> *mut FILE {
    __acrt_iob_func(1)
}
unsafe fn libc_stderr() -> *mut FILE {
    __acrt_iob_func(2)
}

unsafe fn reopen(name: &str, mode: &str, stream: *mut FILE) {
    let Ok(name) = CString::new(name) else {
        return;
    };
    let Ok(mode) = CString::new(mode) else {
        return;
    };
    let _ = freopen(name.as_ptr(), mode.as_ptr(), stream);
}
