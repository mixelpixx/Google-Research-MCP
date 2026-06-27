//! google-research-mcp — library crate.
//!
//! All implementation lives here so both binaries (`google-research-mcp` and
//! `google-research-mcp-tray`) can share code. The binaries themselves are
//! thin entry-point wrappers that wire startup flags and route into the
//! appropriate module.

pub mod config;
pub mod config_file;
pub mod content;
pub mod crashlog;
pub mod diagnose;
pub mod error;
pub mod install;
pub mod manifest;
pub mod serpapi;
pub mod server;
pub mod service;
pub mod tools;

#[cfg(windows)]
pub mod console;
#[cfg(windows)]
pub mod gui_install;
#[cfg(windows)]
pub mod tray;
