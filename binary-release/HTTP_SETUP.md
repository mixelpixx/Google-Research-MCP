# HTTP Service Setup (for LM Studio and other HTTP MCP clients)

Some MCP clients (LM Studio in particular) misbehave with the default stdio transport. The fix is to run the binary as a **background HTTP service** that LM Studio connects to via URL.

The binary handles everything for you — no .bat files, no startup folder shortcuts, no manual registry editing.

---

## One-time setup

You have two equivalent ways to enable it.

### Option A — During first-time install (easiest)

When you double-click `google-research-mcp.exe` for the first time, a native installer dialog opens. Paste your SerpAPI key, tick the "enable HTTP service" checkbox, and click Install. The HTTP server starts immediately and is registered to auto-start on every login.

### Option B — Any time, from a terminal

If you skipped the prompt during install, or want to enable it later, run:

```powershell
C:\MCP\google-research-mcp\binary-release\google-research-mcp.exe service install
```

That single command does all of this:

- Asks for (or reuses) your SerpAPI key
- Saves it to `%USERPROFILE%\.google-research-mcp\config.toml`
- Registers Windows autostart at `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Spawns a hidden background HTTP server right now
- Prints the JSON snippet to paste into LM Studio's config

Output looks like:

```
=== HTTP service setup ===

Paste your SerpAPI key: ********
  + Config saved   -> C:\Users\you\.google-research-mcp\config.toml
  + Autostart      -> HKCU\...\Run\google-research-mcp = "...\google-research-mcp.exe" http-service
  + Server spawned -> PID 17204, listening on http://localhost:3030/mcp

---
HTTP service is now running and will auto-start on every login.

Add this to your MCP client config (LM Studio, etc.):

    "google-research": {
      "url": "http://localhost:3030/mcp"
    }
```

---

## Step 2 — Update LM Studio's MCP config

Open LM Studio's MCP config:
- `%USERPROFILE%\.lmstudio\mcp.json`, or
- LM Studio → Settings → Integrations → MCP Servers → Edit JSON

Replace the `google-research` entry (the one using `"command"`) with:

```json
"google-research": {
  "url": "http://localhost:3030/mcp"
}
```

Other entries (`filesystem-plus-plus`, etc.) stay as-is.

**Restart LM Studio.**

---

## Verify it's running

```powershell
C:\MCP\google-research-mcp\binary-release\google-research-mcp.exe service status
```

Output should show:

```
Config file:     C:\Users\you\.google-research-mcp\config.toml
  SERPAPI_KEY:     abcd...wxyz
  http_port:       3030
Autostart:       REGISTERED
Probe localhost:3030 ...
  Port is OPEN     (server appears to be running)
```

All three lines green:
- **Config file** has your key saved
- **Autostart** is registered (will start on every login)
- **Port is OPEN** (server is alive right now)

You can also visit it directly to confirm:

```powershell
curl http://localhost:3030/mcp -X POST `
  -H "Content-Type: application/json" `
  -H "Accept: application/json, text/event-stream" `
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

A `200 OK` with a JSON `result` block means the service is healthy.

---

## Disabling the HTTP service

```powershell
google-research-mcp.exe service uninstall
```

Removes the autostart registration. The currently-running server keeps running until you log out / restart Windows / kill it via Task Manager.

Your saved SerpAPI key in `config.toml` is **not** deleted automatically — remove that file manually if you want to wipe it.

---

## Why this works when stdio doesn't

LM Studio's stdio implementation has stricter expectations around protocol framing, startup timing, and stdout cleanliness than most other clients. The Streamable HTTP transport bypasses all of that — every request is a plain HTTP POST, responses come back as JSON or SSE, and the server runs once and stays running (no per-process spawn overhead for every chat).

Side benefit: SerpAPI's TLS connection stays warm between calls, so subsequent searches feel snappier.

---

## Coexistence with stdio clients

You can run both transports at the same time. Claude Desktop spawns its own stdio instance from your `claude_desktop_config.json` entry, while LM Studio talks to the HTTP service. They share the same binary on disk but are independent processes.

A typical setup ends up with two `google-research-mcp.exe` processes in Task Manager — one stdio (per stdio client) and one HTTP (the service). That's expected and fine.

---

## All service subcommands

```
service install    Save key, register autostart, spawn detached server
service uninstall  Remove autostart registration
service status     Show config, autostart, and port-open status
service start      One-shot: spawn detached server right now (no autostart)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Port is CLOSED` after install | Run `google-research-mcp.exe service start` to spawn manually, or log out/in to trigger autostart |
| `Address already in use` | Another process is using port 3030. Edit `~/.google-research-mcp/config.toml` to change `http_port`, then re-register: `service uninstall && service install` |
| LM Studio still says "server not reachable" | Check Windows Firewall isn't blocking localhost; check `service status` shows port OPEN |
| Saved key is wrong | Re-run `service install` — it will overwrite the saved key |
| Want to verify the live server | `google-research-mcp.exe diagnose` runs a live SerpAPI test |
| Need to see what the server is doing | The autostart server is hidden. Run `service start` from a terminal instead to see per-call logs |
