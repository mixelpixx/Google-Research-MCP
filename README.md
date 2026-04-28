
# google-research-mcp — Installation Guide

A self-contained Windows binary that gives Claude Google search, web extraction, and a full research toolkit. Includes 6 auto-triggering skills and a deep-research subagent — all embedded into the exe, no separate downloads.

---

## What's in this package

| File | Description |
|------|-------------|
| `google-research-mcp.exe` | The MCP server + skills + agents (all-in-one) |
| `INSTALL.md` | This file |

---

## Step 1 — Get a SerpAPI key (free)

1. Sign up at [serpapi.com](https://serpapi.com).
2. Copy your key from [serpapi.com/manage-api-key](https://serpapi.com/manage-api-key).
3. Free plan: **100 searches/month**.

---

## Step 2 — Place the .exe

Copy `google-research-mcp.exe` to a permanent location, e.g.:

```
C:\Tools\google-research-mcp.exe
```

No installer is needed.

---

## Step 3 — Double-click the .exe

That's it for installation. **Just double-click `google-research-mcp.exe`** in File Explorer.

A console window will open and:
1. Install 6 skills into `~/.claude/skills/`
2. Install 1 deep-research agent into `~/.claude/agents/`
3. Print the JSON snippet you need for Step 4
4. Wait for you to press Enter

If you'd rather use the terminal, you can also run `google-research-mcp.exe init` from PowerShell — same result.

> **Heads up:** Windows SmartScreen may warn about an unrecognized publisher. Click **More info → Run anyway**.

---

## Step 4 — Add the MCP server to Claude

### Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-research": {
      "command": "C:\\Tools\\google-research-mcp.exe",
      "env": {
        "SERPAPI_KEY": "YOUR_SERPAPI_KEY_HERE"
      }
    }
  }
}
```

### Claude Code

Add to `%APPDATA%\Claude\settings.json` (same JSON shape).

**Restart Claude after saving.**

---

## What you get

### MCP Tools (called directly by Claude)
- `google_search` — Quality-scored Google search
- `extract_webpage_content` — Read and clean any URL
- `extract_multiple_webpages` — Batch-read up to 5 URLs
- `research_topic` — Multi-source research with synthesis prompt

### Skills (auto-triggered by user intent)

Claude Code reads each skill's description and auto-invokes the matching one based on what you say. You can also explicitly call them with `/skill-name`.

| Skill | Triggers when you say... |
|-------|--------------------------|
| `deep-research` | "research X", "deep dive into X", "comprehensive analysis of X" |
| `fact-check` | "is it true that...", "verify this claim", "fact-check X" |
| `find-docs` | "find docs for X", "where's the API reference for Y" |
| `news-monitor` | "latest news on X", "what's happening with Y", "recent developments" |
| `competitive-analysis` | "competitors of X", "alternatives to Y", "X vs Y" |
| `cite-sources` | "cite these sources", "format references", "make a bibliography" |

### Agent (auto-delegated when context matters)

`deep-research-agent` is delegated to automatically when Claude detects a heavy research task that would otherwise burn excessive context (e.g., extracting 10+ webpages). It runs in an isolated context and returns only a polished summary.

**Difference from the `deep-research` skill:**
- The skill runs in your main conversation — you see every step
- The agent runs in a sub-context — main conversation stays clean

---

## Subcommands

```
google-research-mcp.exe init           Install skills + agent
google-research-mcp.exe uninstall      Remove skills + agent
google-research-mcp.exe status         Show install state
google-research-mcp.exe skill <name>   Print a skill's markdown
google-research-mcp.exe --version      Show version
google-research-mcp.exe --help         Show all options
```

Running with no subcommand starts the MCP server (this is what Claude does automatically).

---

## Updating

When a new version of the exe is released:

1. Replace `google-research-mcp.exe` with the new one.
2. Double-click it (or run `init`) to overwrite skills/agent with the latest versions.
3. Restart Claude.

The server also auto-reinstalls skills on first launch as a safety net, so even if you forget step 2, the latest versions will land the next time Claude starts the server.

---

## Uninstalling

```powershell
C:\Tools\google-research-mcp.exe uninstall
```

Then remove the `google-research` block from your Claude config and delete the .exe.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Skills not showing up | Run `init`, then **restart Claude** |
| "SERPAPI_KEY is required" | Key must be in the `env` block of your Claude config |
| "SerpAPI HTTP 401" | Invalid key — re-copy from serpapi.com |
| "SerpAPI HTTP 429" | Rate limit hit — free plan = 100 searches/month |
| Status shows `[-]` for all skills | Run `init` (skills aren't installed yet) |
| Agent not delegated | Claude decides when to delegate — try asking for "deep multi-source research" |

---

## System Requirements

- Windows 10 or 11 (64-bit)
- Claude Desktop or Claude Code installed
- Internet connection
- No other software required
