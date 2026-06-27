---
name: news-monitor
description: Find recent news, announcements, and developments about a topic, company, or technology
argument-hint: [topic/company]
---

# News Monitor

Track recent news and developments for: **$ARGUMENTS**

## Search Strategy

### Step 1: Recent News Search

Use `google_search` with date restrictions:

```json
{
  "query": "[subject]",
  "dateRestrict": "w1",  // Last week
  "num_results": 10
}
```

Then expand if needed:
- `"d3"` - Last 3 days (breaking news)
- `"w1"` - Last week
- `"m1"` - Last month
- `"m3"` - Last quarter

### Step 2: Source-Specific Searches

For comprehensive coverage, search specific source types:

**Major News:**
```
"[subject]" site:reuters.com OR site:apnews.com
"[subject]" site:bbc.com OR site:nytimes.com
```

**Tech News (if applicable):**
```
"[subject]" site:techcrunch.com OR site:theverge.com
"[subject]" site:arstechnica.com OR site:wired.com
```

**Industry/Trade:**
```
"[subject]" announcement OR launch OR release
"[subject]" funding OR acquisition OR partnership
```

### Step 3: Extract Headlines and Summaries

Use `extract_webpage_content` on top 3-5 most relevant articles.

### Step 4: Identify Themes

Look for patterns:
- What's driving the news cycle?
- Are there conflicting reports?
- What's the overall sentiment?

## Output Format

```markdown
# News Monitor: [Subject]
**Period:** [Date range searched]
**Generated:** [Current date]

## Headlines Summary

### Breaking / Major Stories
1. **[Headline]** - [Source], [Date]
   > [1-2 sentence summary]

2. **[Headline]** - [Source], [Date]
   > [1-2 sentence summary]

### Recent Developments
- [Development 1] ([Source], [Date])
- [Development 2] ([Source], [Date])

## News Analysis

### Key Themes
1. **[Theme]**: [Explanation of what's driving coverage]
2. **[Theme]**: [Explanation]

### Sentiment Overview
[Generally positive/negative/neutral/mixed] - [Brief explanation]

### Notable Quotes
> "[Quote]" - [Person], [Title], [Source]

## Timeline

| Date | Event | Source |
|------|-------|--------|
| ...  | ...   | ...    |

## Sources Consulted

| Source | Type | Articles Found |
|--------|------|----------------|
| Reuters | Wire Service | X |
| TechCrunch | Tech News | X |
| ... | ... | ... |

## Recommended Follow-ups
- [Topic to watch]
- [Upcoming event/announcement]
```

## Tips

- Use `resultType: "news"` if available for news-specific results
- Check official press release pages: `site:[company].com press OR newsroom`
- For public companies, check SEC filings for material announcements
- Set up the search again in a week to track ongoing stories
