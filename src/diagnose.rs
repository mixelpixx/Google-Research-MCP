//! Self-diagnostics. Run `google-research-mcp diagnose` to verify the binary works
//! independently of any MCP client. Useful for ruling out the binary as the cause
//! when MCP timeouts happen in clients like LM Studio or Claude Desktop.

use anyhow::Result;
use std::time::Instant;

use crate::serpapi::client::{SearchParams, SerpApiClient};

pub async fn run_diagnose() -> Result<()> {
    println!("===========================================");
    println!("  google-research-mcp diagnose v{}", env!("CARGO_PKG_VERSION"));
    println!("===========================================\n");

    // 1. Environment check
    println!("[1/4] Environment check");
    let key = match std::env::var("SERPAPI_KEY") {
        Ok(k) if k.trim().is_empty() => {
            println!("    SERPAPI_KEY: SET BUT EMPTY  [FAIL]");
            anyhow::bail!("SERPAPI_KEY is set but empty");
        }
        Ok(k) => {
            let masked = mask_key(&k);
            println!("    SERPAPI_KEY:  {}  [OK]", masked);
            k
        }
        Err(_) => {
            println!("    SERPAPI_KEY:  NOT SET  [FAIL]");
            println!("    Set it via your shell: $env:SERPAPI_KEY = \"your_key\"");
            anyhow::bail!("SERPAPI_KEY env var is required");
        }
    };
    let transport = std::env::var("MCP_TRANSPORT").unwrap_or_else(|_| "stdio".into());
    println!("    MCP_TRANSPORT: {}", transport);
    println!();

    // 2. HTTP client + DNS check
    println!("[2/4] HTTP client construction");
    let t0 = Instant::now();
    let client = SerpApiClient::new(key.clone());
    println!("    reqwest client built in {} ms  [OK]", t0.elapsed().as_millis());
    println!();

    // 3. Live SerpAPI request
    println!("[3/4] Live SerpAPI request");
    println!("    Querying SerpAPI for 'rust programming'...");
    let t1 = Instant::now();
    let params = SearchParams {
        query: "rust programming".into(),
        site: None,
        exact_terms: None,
        language: None,
        date_restrict: None,
        result_type: None,
        results_per_page: 3,
        start: 0,
        sort: None,
    };
    match client.search(params).await {
        Ok(results) => {
            let elapsed = t1.elapsed();
            println!(
                "    Got {} results in {} ms  [OK]",
                results.len(),
                elapsed.as_millis()
            );
            for (i, r) in results.iter().take(3).enumerate() {
                println!("       {}. {}", i + 1, truncate(&r.title, 60));
                println!("          {}", truncate(&r.link, 70));
            }
        }
        Err(e) => {
            println!("    SerpAPI request FAILED: {}  [FAIL]", e);
            println!();
            println!("    This means the binary itself can't reach SerpAPI.");
            println!("    Common causes: invalid key, expired plan, blocked DNS,");
            println!("    corporate proxy/firewall, no internet.");
            anyhow::bail!("SerpAPI live test failed");
        }
    }
    println!();

    // 4. Skill/agent install check
    println!("[4/4] Install state");
    if crate::install::needs_install() {
        println!("    Skills + agents NOT installed  [WARN]");
        println!("    Run `google-research-mcp init` (or double-click the exe).");
    } else {
        println!("    Skills + agents installed  [OK]");
    }
    println!();

    println!("===========================================");
    println!("  All checks passed.");
    println!("===========================================");
    println!();
    println!("If MCP clients (Claude Desktop, LM Studio, etc.) still time out");
    println!("with this binary, the issue is on the client side — not here.");
    println!();
    println!("To debug client-side issues:");
    println!("  - Check the client's MCP server log panel for stderr output");
    println!("  - Look for `google_search received` lines — if absent, the client");
    println!("    isn't actually sending the request to this binary.");
    println!("  - Try a larger model: small (<=4B) models often produce malformed");
    println!("    tool-call JSON that clients silently drop.");
    println!("  - Increase the per-tool-call timeout in your client config.");

    Ok(())
}

fn mask_key(k: &str) -> String {
    if k.len() <= 8 {
        return "***".into();
    }
    format!("{}...{}", &k[..4], &k[k.len() - 4..])
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let truncated: String = s.chars().take(max - 1).collect();
        format!("{}…", truncated)
    }
}
