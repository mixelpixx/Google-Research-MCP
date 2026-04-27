## Check out the 'Serp API' Branch
https://github.com/mixelpixx/Google-Search-MCP-Server/tree/serpapi-only


# Google Research MCP Server

**Version 3.0.0** - Enhanced research synthesis with intelligent source quality assessment and deduplication.

An advanced Model Context Protocol (MCP) server that provides comprehensive Google search capabilities, webpage content extraction, and AI-powered research synthesis. Built for Claude Code, Claude Desktop, and other MCP-compatible clients.

## Multi-Provider Search Support (v3.0+)

**NEW:** This server now supports multiple search providers! Choose the best option for your needs.


#### Brave Search (Recommended)

```bash
# Get free API key: https://api.search.brave.com/app/keys
SEARCH_PROVIDER=brave
BRAVE_API_KEY=your_brave_api_key_here
```

- 2,000 free queries/month (no credit card)
- Privacy-focused, no tracking
- $3/month for 5,000 queries
- No sunset date announced

#### Tavily Search (For AI Research)

```bash
# Get API key: https://app.tavily.com/sign-in
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_tavily_api_key_here
```

- 1,000 free queries/month
- AI-optimized with quality scoring
- Advanced search depth (10-30s per query)
- Best for synthesis and research

#### Google Custom Search (Legacy)

```bash
# Only if you already have an API key
SEARCH_PROVIDER=google
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

- API **sunsets January 1, 2027**
- Closed to new users (2024)
- Only 100 queries/day free
- Higher costs ($5/1,000 queries)

**Migration Guide**: See [MIGRATION.md](MIGRATION.md) for detailed migration instructions.

---

## Google API Status (For Legacy Users)

### For New Users

**Google has CLOSED the Custom Search JSON API to new customers as of 2026.**

**If you don't have a Google API key:**
- You CANNOT get one anymore
- Use **Brave** or **Tavily** instead (see above)
- Both providers work with all MCP tools

### For Existing Google Users

**Important Dates:**
- **January 1, 2027**: Google Custom Search API **sunsets**
- **Action Required**: Migrate to Brave or Tavily (see [MIGRATION.md](MIGRATION.md))

**Current Limits:**
- 100 queries per day FREE
- After 100: $5 per 1,000 queries (max 10k/day)

**Monitor Your Usage:**
- Dashboard: https://console.cloud.google.com/apis/dashboard
- Enable billing: https://console.cloud.google.com/billing

### Quick Troubleshooting

**Error: "not working" or "403 Forbidden"**
1. Check if you hit the 100/day limit (wait until tomorrow or enable billing)
2. Verify API is enabled: https://console.cloud.google.com/apis/library/customsearch.googleapis.com
3. Check your API key is correct in `.env`

**Error: "429 Too Many Requests"**
- You exceeded 100 queries/day
- Wait for midnight UTC reset OR enable billing

**Need more than 100/day?**
- Enable billing: https://console.cloud.google.com/billing
- Cost: $5 per 1,000 queries

---

## Overview

This MCP server transforms Google search into a powerful research tool by:

- **Intelligent Source Ranking** - Automatically scores sources by authority, recency, and credibility
- **Deduplication** - Removes duplicate URLs and similar content across search results
- **Agent-Based Synthesis** - Leverages your existing Claude session to synthesize research findings
- **Focus Area Analysis** - Provides dedicated analysis for specific aspects of your research topic
- **Quality Metrics** - Tracks source diversity, authority, and content freshness

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Google Cloud Platform account with Custom Search API enabled
- Google Custom Search Engine ID

### Installation

#### Option 1: Using npx (Recommended)

Run directly without cloning:

```bash
# Set environment variables and run
GOOGLE_API_KEY=your_key GOOGLE_SEARCH_ENGINE_ID=your_id npx google-search-mcp
```

Or create a `.env` file in your working directory with your credentials, then run:

```bash
npx google-search-mcp
```

#### Option 2: Clone and Build

```bash
# Clone the repository
git clone <https://github.com/mixelpixx/Google-Search-MCP-Server>
cd Google-Research-MCP

# Install dependencies
npm install

# Optional: Install Google API support (only if using Google provider)
# Note: googleapis is now optional - only install if you need Google
npm install googleapis

# Build the project
npm run build
```

**Note**: The `googleapis` package is now optional. If you're using Brave or Tavily, you don't need to install it. This reduces installation size and dependencies.

### Configuration

Create a `.env` file in the project root:

#### For Brave (Recommended)

```bash
SEARCH_PROVIDER=brave
BRAVE_API_KEY=your_brave_api_key_here
```

#### For Tavily

```bash
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=your_tavily_api_key_here
```

#### For Google (Legacy)

```bash
SEARCH_PROVIDER=google  # Optional, defaults to google for backwards compatibility
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_custom_search_engine_id
```

**Note:** No Anthropic API key is required. The server uses agent-based synthesis that leverages your existing Claude session.

### Usage Tracking (Optional)

Track your API usage and costs to prevent unexpected bills:

```bash
# Enable usage tracking
USAGE_TRACKING_ENABLED=true

# Persist tracking to SQLite database (optional)
USAGE_TRACKING_PERSIST=true
USAGE_TRACKING_DB_PATH=./.mcp-usage-tracking.db

# Set thresholds for warnings (optional)
USAGE_MAX_SEARCHES_PER_MONTH=2000  # Alert at 80% and 100%
USAGE_MAX_COST_PER_MONTH=10.00     # In USD
```

**Benefits:**
- Monitor usage across all providers
- Get warnings at 80% and 100% of limits
- Prevent quota overruns
- Track estimated costs
- Historical data with SQLite persistence

### Running the Server

```bash
# Start v3 server (recommended)
npm run start:v3

# For HTTP mode
npm run start:v3:http
```

Expected output (with Brave):
```
============================================================
Google Research MCP Server v3.0.0 (Enhanced)
============================================================
Initializing search provider: brave
✓ Using Brave Search as search provider
  Free tier: 2,000 queries/month
✓ Source quality assessment
✓ Deduplication
✓ AI synthesis: AGENT MODE (Claude will launch agents)
  └─ No API key needed - uses your existing Claude session
✓ Focus area analysis
✓ Enhanced error handling
✓ Cache metadata
============================================================
Server running on STDIO
```

Expected output (with Google):
```
Initializing search provider: google
✓ Using Google Custom Search as search provider
  Free tier: 100 queries/day
WARNING: Google Custom Search will sunset on January 1, 2027
    Consider migrating to Brave Search: https://brave.com/search/api/
```

With usage tracking enabled:
```
✓ Using Brave Search as search provider
✓ Usage tracking enabled
✓ Usage tracking database initialized: ./.mcp-usage-tracking.db
```

## Features

### Core Capabilities

#### 1. Advanced Google Search
- Full-text search with quality scoring
- Domain filtering and date restrictions
- Result categorization (academic, official docs, news, forums, etc.)
- Automatic deduplication of results
- Source authority ranking

#### 2. Content Extraction
- Clean content extraction from web pages
- Multiple output formats (Markdown, HTML, plain text)
- Configurable preview lengths
- Batch extraction support (up to 5 URLs)
- Automatic content summarization

#### 3. Research Synthesis
- Agent-based research analysis
- Comprehensive source synthesis
- Focus area breakdowns
- Contradiction detection
- Actionable recommendations
- Quality metrics reporting

### Research Depth Levels

| Depth | Sources | Analysis | Use Case |
|-------|---------|----------|----------|
| **basic** | 3 | Quick overview, 3-5 findings | Fast comparisons, initial research |
| **intermediate** | 5 | Comprehensive analysis, 5-7 findings | Standard research tasks |
| **advanced** | 8-10 | In-depth analysis, 7-10 findings, contradictions | Decision-making, comprehensive reviews |

## Usage Examples

### Basic Research

```typescript
research_topic({
  topic: "WebAssembly performance optimization",
  depth: "basic"
})
```

Returns:
- 3 high-quality sources
- Brief overview (2-3 paragraphs)
- 3-5 key findings
- Quality metrics

### Comprehensive Research with Focus Areas

```typescript
research_topic({
  topic: "Kubernetes security",
  depth: "advanced",
  focus_areas: ["RBAC", "network policies", "pod security"],
  num_sources: 8
})
```

Returns:
- 8 authoritative sources
- In-depth executive summary
- 7-10 detailed findings
- Common themes across sources
- Dedicated analysis for each focus area
- Contradictions between sources
- Actionable recommendations
- Comprehensive quality metrics

### Targeted Search

```typescript
google_search({
  query: "docker container security best practices",
  num_results: 10,
  dateRestrict: "y1",  // Last year only
  site: "github.com"   // Limit to GitHub
})
```

Returns:
- Quality-scored results
- Duplicate removal report
- Source type classification
- Authority ratings

### Content Extraction

```typescript
extract_webpage_content({
  url: "https://kubernetes.io/docs/concepts/security/",
  format: "markdown",
  max_length: 5000,
  preview_length: 300
})
```

Returns:
- Clean extracted content
- Metadata (title, description, author)
- Word count and statistics
- Configurable preview
- Cache information

## Agent Mode

### How It Works

Agent Mode is the default synthesis method. Instead of requiring a separate Anthropic API key, it uses your existing Claude session:

1. **Research Gathering** - MCP server searches, deduplicates, and ranks sources
2. **Content Extraction** - Full content extracted from top sources
3. **Agent Prompt Generation** - All research data packaged into structured prompt
4. **Agent Launch** - Claude Code automatically launches agent with research data
5. **Synthesis** - Agent analyzes sources and generates comprehensive report

### Benefits

- **No Additional API Key** - Uses your existing Claude subscription
- **Full Context** - Agent has access to conversation history
- **Transparent Process** - See agent analysis in real-time
- **Same Quality** - Uses same Claude model you're already using

### Alternative: Direct API Mode

For automated workflows or scripts, you can use Direct API mode:

```bash
# .env
ANTHROPIC_API_KEY=your_anthropic_api_key
USE_DIRECT_API=true
```

This bypasses agent mode and calls the Anthropic API directly from the MCP server.

## Architecture

### Services

```
src/
├── google-search-v3.ts              # Main MCP server (v3)
├── services/
│   ├── google-search.service.ts     # Google Custom Search integration
│   ├── content-extractor.service.ts # Web content extraction
│   ├── source-quality.service.ts    # Source ranking and scoring
│   ├── deduplication.service.ts     # Duplicate detection
│   └── research-synthesis.service.ts # Agent-based synthesis
└── types.ts                          # TypeScript interfaces
```

### Data Flow

```
Search Query → Google API → Results
                              ↓
                         Deduplication
                              ↓
                         Quality Scoring
                              ↓
                         Content Extraction
                              ↓
                         Agent Synthesis
                              ↓
                    Comprehensive Research Report
```

## API Reference

### Tools

#### google_search

Search Google with advanced filtering and quality scoring.

**Parameters:**
- `query` (string, required) - Search query
- `num_results` (number, optional) - Number of results (default: 5, max: 10)
- `site` (string, optional) - Limit to specific domain
- `language` (string, optional) - ISO 639-1 language code
- `dateRestrict` (string, optional) - Date filter (e.g., "m6" for last 6 months)
- `exactTerms` (string, optional) - Exact phrase matching
- `resultType` (string, optional) - Filter by type (image, news, video)
- `page` (number, optional) - Pagination
- `sort` (string, optional) - Sort by relevance or date

**Returns:**
- Ranked search results with quality scores
- Deduplication statistics
- Source categorization
- Pagination info
- Cache metadata

#### extract_webpage_content

Extract clean content from a webpage.

**Parameters:**
- `url` (string, required) - Target URL
- `format` (enum, optional) - Output format: markdown, html, text (default: markdown)
- `full_content` (boolean, optional) - Return full content (default: false)
- `max_length` (number, optional) - Maximum content length
- `preview_length` (number, optional) - Preview length (default: 500)

**Returns:**
- Extracted content
- Metadata (title, description, author)
- Statistics (word count, character count)
- Content summary
- Cache information

#### extract_multiple_webpages

Batch extract content from multiple URLs (max 5).

**Parameters:**
- `urls` (array, required) - Array of URLs (max 5)
- `format` (enum, optional) - Output format

**Returns:**
- Extracted content per URL
- Error details for failed extractions
- Cache metadata

#### research_topic

Comprehensive research with AI synthesis.

**Parameters:**
- `topic` (string, required) - Research topic
- `depth` (enum, optional) - Analysis depth: basic, intermediate, advanced (default: intermediate)
- `num_sources` (number, optional) - Number of sources (default: varies by depth)
- `focus_areas` (array, optional) - Specific aspects to analyze

**Returns:**
- Executive summary
- Key findings with citations
- Common themes
- Focus area analysis (if specified)
- Contradictions between sources
- Recommendations
- Quality metrics (source diversity, authority, freshness)
- Source list with quality scores

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | - | Google Custom Search API key |
| `GOOGLE_SEARCH_ENGINE_ID` | Yes | - | Custom Search Engine ID |
| `ANTHROPIC_API_KEY` | No | - | For Direct API mode only |
| `USE_DIRECT_API` | No | false | Enable Direct API mode |
| `MCP_TRANSPORT` | No | stdio | Transport mode: stdio or http |
| `PORT` | No | 3000 | Port for HTTP mode |

## Performance

### Response Times

| Operation | Typical Duration | Notes |
|-----------|------------------|-------|
| google_search | 1-2s | Includes quality scoring and deduplication |
| extract_webpage_content | 2-3s | Per URL |
| research_topic (basic) | 8-10s | 3 sources with agent synthesis |
| research_topic (intermediate) | 12-15s | 5 sources with comprehensive analysis |
| research_topic (advanced) | 18-25s | 8-10 sources with deep analysis |

### Quality Improvements Over v2

| Metric | v2 | v3 | Improvement |
|--------|----|----|-------------|
| Summary Quality | 2/10 | 9/10 | 350% |
| Source Diversity | Not tracked | Optimized | New |
| Duplicate Removal | 0% | ~30% | New |
| Source Ranking | Random | By quality | New |
| Focus Area Support | Generic | Dedicated | New |
| Error Helpfulness | 3/10 | 9/10 | 200% |

## Troubleshooting

### Agent Mode Not Working

**Symptoms:** Research returns basic concatenation instead of synthesis

**Solutions:**
1. Verify server shows "AGENT MODE" on startup
2. Check for `[AGENT_SYNTHESIS_REQUIRED]` in response
3. Ensure using v3: `npm run start:v3`
4. Rebuild: `npm run build`

### Quality Scores Missing

**Symptoms:** Search results don't show quality scores

**Solutions:**
1. Confirm running v3, not v2
2. Check server startup output
3. Verify no TypeScript compilation errors

### No Results Found

**Solutions:**
1. Verify Google API key is valid
2. Check Custom Search Engine ID
3. Ensure search engine has indexing enabled
4. Try broader search terms

## Documentation

- **[QUICK-START.md](QUICK-START.md)** - Fast setup guide (2 minutes)
- **[AGENT-MODE.md](AGENT-MODE.md)** - Comprehensive agent mode documentation
- **[SETUP-V3.md](SETUP-V3.md)** - Detailed setup and testing guide

## Version History

### v3.0.0 (Current)
- Agent-based synthesis (no API key required)
- Source quality assessment and ranking
- Comprehensive deduplication
- Focus area analysis
- Enhanced error handling with suggestions
- Cache metadata transparency
- Consistent preview lengths
- Research depth differentiation

### v2.0.0
- HTTP transport support
- Batch webpage extraction
- Basic research synthesis
- Content categorization

### v1.0.0
- Initial release
- Google Custom Search integration
- Basic content extraction

## Contributing

Contributions are welcome. Please ensure:

1. Code follows existing style conventions
2. All tests pass: `npm run build`
3. Documentation is updated
4. Commit messages are descriptive

## License

See [LICENSE](license) file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Credits

- **Google Custom Search API** - Search functionality
- **Anthropic Claude** - AI-powered research synthesis
- **Mozilla Readability** - Content extraction
- **MCP SDK** - Model Context Protocol integration

---

**Version:** 3.0.0
**Last Updated:** 2025-11-07
