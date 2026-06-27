# Google-Research-MCP

A standalone Windows MCP server that gives Claude Google search and web research
capabilities, powered by [SerpAPI](https://serpapi.com). It ships as a single self-contained
`.exe` — no Node.js, no npm install, no external runtime.

## Tools

| Tool | Description |
|------|-------------|
| `google_search` | Search Google and get quality-scored results with authority ratings |
| `extract_webpage_content` | Extract clean readable content from any URL |
| `extract_multiple_webpages` | Extract up to 5 URLs concurrently |
| `research_topic` | Multi-source research that returns a structured synthesis prompt |

The binary also bundles six research **skills** and one research **agent** that Claude can
invoke automatically. These are installed into your `~/.claude` directory by `init` (see
[Skills and agents](#skills-and-agents)).

## Requirements

- A [SerpAPI](https://serpapi.com) account and API key (free tier: 100 searches/month)
- Windows 10/11 (64-bit)
- No other runtime required

---

## Installation

### Option A — Use the pre-built .exe

1. Download `google-research-mcp.exe` from the [releases page](https://github.com/mixelpixx/Google-Research-MCP/releases),
   or take it from the `binary-release/` folder in this repository.
2. Place it somewhere permanent, e.g. `C:\Tools\google-research-mcp.exe`.
3. Continue to **Configuration** below.

### Option B — Build from source

You need the [Rust toolchain](https://rustup.rs) installed.

```powershell
git clone https://github.com/mixelpixx/Google-Research-MCP.git
cd Google-Research-MCP
cargo build --release
# Output: target\release\google-research-mcp.exe
#         target\release\google-research-mcp-tray.exe  (optional HTTP/autostart helper)
```

The exe is self-contained — copy it wherever you like. The tray binary is only needed if you
use the background HTTP service (see [HTTP mode](#http-mode)).

---

## Getting a SerpAPI key

1. Go to [serpapi.com](https://serpapi.com) and create a free account.
2. Copy your API key from the [dashboard](https://serpapi.com/manage-api-key).
3. The free plan includes 100 searches/month.

---

## Configuration

The server reads its key from the `SERPAPI_KEY` environment variable. Pass it in the `env`
block of your MCP client config — this keeps the key out of system-wide environment variables.

### Claude Desktop (`claude_desktop_config.json`)

Located at `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-research": {
      "command": "C:\\Tools\\google-research-mcp.exe",
      "env": {
        "SERPAPI_KEY": "your_serpapi_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving. The tools should appear in the tools panel.

### Claude Code

Add the same block to your project's `.claude/settings.json`, or to
`%APPDATA%\Claude\settings.json` to make it available in every project.

---

## CLI subcommands

Run these from cmd or PowerShell:

| Command | Description |
|---------|-------------|
| *(none)* | Starts the MCP server when launched by a client; opens the GUI installer when double-clicked from Explorer; prints help when run in a terminal |
| `init` | Install the skills and agent into `~/.claude/skills` and `~/.claude/agents` |
| `uninstall` | Remove the installed skills and agent |
| `status` | Show install status |
| `diagnose` | Self-test: makes one live SerpAPI request and reports timing |
| `service install` | Save the key, register HTTP autostart, and start the background server |
| `service uninstall` | Remove the autostart registration |
| `service status` | Show config, autostart, and port state |
| `service start` | Spawn the background HTTP server now (no autostart) |
| `skill <name>` | Print a skill's markdown to stdout |
| `--version` | Show version |
| `--help` | Show usage |

The server also re-installs the bundled skills on first launch as a safety net, so they stay
current even if you forget to re-run `init` after updating the exe.

### GUI installer

Double-clicking `google-research-mcp.exe` from File Explorer opens a native install dialog.
Paste your SerpAPI key, optionally enable the background HTTP service, and click Install. This
writes the skills and agent, saves your key to the config file, and (if enabled) registers the
HTTP service to start on login. The background service runs as a separate windows-subsystem
binary, `google-research-mcp-tray.exe`, which must sit next to the main exe.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SERPAPI_KEY` | Yes* | — | Your SerpAPI key |
| `MCP_TRANSPORT` | No | `stdio` | Transport mode: `stdio` or `http` |
| `PORT` | No | `3030` | HTTP server port (used only when `MCP_TRANSPORT=http`) |

\* If `SERPAPI_KEY` is not set, the server falls back to the key stored in the config file
(see below). One of the two must be present.

### Config file

When you install the HTTP service (via the GUI or `service install`), your key and port are
saved to:

```
%USERPROFILE%\.google-research-mcp\config.toml
```

This file is used when the server is launched by Windows autostart, where no `env` block is
available. The key is stored in plaintext, so if that is a concern, prefer passing the key
through your client's `env` block and skip the HTTP service. `uninstall` does not delete this
file — remove it manually if you want to wipe the saved key.

---

## HTTP mode

For HTTP-based MCP clients (for example LM Studio), run the server with the HTTP transport:

```powershell
$env:SERPAPI_KEY = "your_key"
$env:MCP_TRANSPORT = "http"
$env:PORT = "3030"
.\google-research-mcp.exe
```

The endpoint is then available at `http://localhost:3030/mcp`:

```json
{
  "mcpServers": {
    "google-research": {
      "url": "http://localhost:3030/mcp"
    }
  }
}
```

For an always-on background service with autostart, use `service install` instead of running
the exe manually. See [`binary-release/HTTP_SETUP.md`](binary-release/HTTP_SETUP.md) for the
full walkthrough.

### Security note

The HTTP transport binds to `0.0.0.0` (all network interfaces) and the `/mcp` endpoint is
**not authenticated**. Anyone who can reach the port can call the tools and consume your
SerpAPI quota. Only enable HTTP mode on a trusted network or behind a firewall that restricts
the port to localhost. The default stdio mode (used by Claude Desktop and Claude Code) is not
network-exposed and is unaffected.

---

## Skills and agents

`init` (and the GUI installer) write these into your `~/.claude` directory. Claude invokes
them automatically based on your intent; you can also call a skill explicitly with
`/skill-name`.

**Skills** (`~/.claude/skills`):

| Skill | Purpose |
|-------|---------|
| `deep-research` | Multi-source research with structured synthesis |
| `fact-check` | Verify a claim against multiple authoritative sources |
| `find-docs` | Locate official documentation and API references |
| `news-monitor` | Track recent news and developments on a topic |
| `competitive-analysis` | Research competitors and market landscape |
| `cite-sources` | Format citations and references |

**Agent** (`~/.claude/agents`):

| Agent | Purpose |
|-------|---------|
| `deep-research-agent` | Runs a heavy research task in an isolated context and returns only a summary, keeping the main conversation clean |

---

## Tool reference

### `google_search`

Search Google and return ranked, quality-scored results.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The search query |
| `num_results` | number | No | Number of results (default 5, max 10) |
| `site` | string | No | Restrict to a domain, e.g. `wikipedia.org` |
| `language` | string | No | ISO 639-1 code, e.g. `en`, `fr`, `de` |
| `date_restrict` | string | No | `d7` (7 days), `w2` (2 weeks), `m6` (6 months), `y1` (1 year) |
| `exact_terms` | string | No | Phrase that must appear in results |
| `result_type` | string | No | `news`, `image`, or `video` (default: web) |
| `page` | number | No | Page number, 1-based (default 1) |
| `results_per_page` | number | No | Results per page (default 5, max 10) |
| `sort` | string | No | `relevance` (default) or `date` |

### `extract_webpage_content`

Fetch a URL and extract clean readable content, stripping navigation, ads, and boilerplate.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Full URL (must start with `http://` or `https://`) |
| `format` | string | No | `markdown` (default), `html`, or `text` |
| `full_content` | boolean | No | Return full content (`true`) or a 500-character preview (`false`, default) |
| `max_length` | number | No | Maximum character length to return |

Returns: title, description, word count, summary, and content in the requested format.

### `extract_multiple_webpages`

Extract content from up to 5 URLs concurrently.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | string[] | Yes | Array of URLs (max 5) |
| `format` | string | No | `markdown` (default), `html`, or `text` |

Returns a summary (title, URL, word count, excerpt) for each URL.

### `research_topic`

Searches for sources, extracts their content, and returns a structured synthesis prompt for
Claude to analyze. No external AI API is called — the synthesis is performed by Claude itself.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic` | string | Yes | The topic to research |
| `depth` | string | No | `basic`, `intermediate` (default), or `advanced` |
| `num_sources` | number | No | Number of sources to consult (1–10, default 5) |
| `focus_areas` | string[] | No | Specific subtopics, e.g. `["performance", "security"]` |

Depth guide:
- `basic` — 3 sources, short overview
- `intermediate` — 5 sources, key findings and themes
- `advanced` — 8–10 sources, contradictions and recommendations

---

## Troubleshooting

**"SERPAPI_KEY is required"**
The exe isn't receiving the key. Confirm `SERPAPI_KEY` is set in the `env` block of your MCP
config (not only as a system environment variable), or that the config file contains it.

**"SerpAPI HTTP 401"**
The key is invalid or expired. Verify it at [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key).

**"SerpAPI HTTP 429"**
You have hit the plan's rate limit. The free plan allows 100 searches/month.

**Tool calls time out**
Some MCP clients use a short per-tool-call timeout. SerpAPI usually responds in 1–2 seconds but
can spike higher. Set the per-tool-call timeout to at least 30 seconds. Run
`google-research-mcp.exe diagnose` to measure a live call.

**Tools don't appear in Claude**
Restart Claude Desktop/Code after editing the config. Check the JSON is valid (no trailing
commas, use `\\` for path separators on Windows).

**Extraction returns little content**
Some sites block automated requests. Try `format: "text"`, or use `google_search` snippets
instead.

---

## Building for distribution

```powershell
cargo build --release
```

The resulting `target\release\google-research-mcp.exe` is fully self-contained — no DLL
dependencies beyond standard Windows system libraries. Copy it to any Windows 10/11 machine and
run it directly. Build `google-research-mcp-tray.exe` alongside it if you need the background
HTTP service.
