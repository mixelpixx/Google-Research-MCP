// Embeds a Windows application manifest into the linked binaries.
//
// Required because:
//   - native-windows-gui (used by the GUI installer in the main binary) calls
//     into Common Controls v6 APIs like GetWindowSubclass.
//   - Without a manifest declaring dependency on Microsoft.Windows.Common-Controls
//     v6.0, Windows links against the v5 stub and the exe fails to load with
//     "procedure entry point GetWindowSubclass could not be located".
//
// The manifest also enables modern visual styles, per-monitor DPI awareness, and
// long-path support, which we want for a production-ready Windows tool.

fn main() {
    #[cfg(windows)]
    {
        use embed_manifest::{embed_manifest, new_manifest};
        embed_manifest(new_manifest("google-research-mcp"))
            .expect("failed to embed Windows application manifest");
    }
}
