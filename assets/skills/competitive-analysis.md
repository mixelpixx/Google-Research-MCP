---
name: competitive-analysis
description: Research competitors, alternatives, and market landscape for a product, service, or technology
argument-hint: [product/company/technology]
---

# Competitive Analysis

Analyze the competitive landscape for: **$ARGUMENTS**

## Research Framework

### Phase 1: Identify Competitors

Use `google_search` with these query patterns:

```
"[subject] alternatives"
"[subject] vs"
"[subject] competitors"
"best [category] tools/services/products"
"[subject] comparison"
```

### Phase 2: Gather Intelligence

For each major competitor, use `extract_webpage_content` on:
1. Their official website (features, pricing if available)
2. Review sites (G2, Capterra, TrustRadius for software)
3. Recent news articles
4. Technical documentation (if applicable)

Search queries:
```
"[competitor] features"
"[competitor] pricing"
"[competitor] review"
"[competitor] vs [subject]"
```

### Phase 3: Market Context

Use `research_topic` with:
```json
{
  "topic": "[subject] market landscape",
  "depth": "intermediate",
  "focus_areas": ["market trends", "key players", "pricing models", "customer segments"]
}
```

## Analysis Output

```markdown
# Competitive Analysis: [Subject]

## Executive Summary
[Overview of competitive position]

## Market Landscape

### Category Definition
[What category/market does this compete in?]

### Market Trends
- [Trend 1]
- [Trend 2]

## Competitor Matrix

| Competitor | Target Market | Key Differentiator | Pricing | Strengths | Weaknesses |
|------------|---------------|-------------------|---------|-----------|------------|
| ...        | ...           | ...               | ...     | ...       | ...        |

## Detailed Competitor Profiles

### [Competitor 1]
- **Overview**:
- **Key Features**:
- **Target Customer**:
- **Pricing Model**:
- **Strengths**:
- **Weaknesses**:
- **Recent Developments**:

### [Competitor 2]
...

## Competitive Positioning Map

[Describe positioning on key dimensions, e.g.:]
- Price vs Features
- Simplicity vs Power
- SMB vs Enterprise

## Opportunities & Threats

### Opportunities
- [Gap in market]
- [Underserved segment]

### Threats
- [Emerging competitor]
- [Market shift]

## Recommendations
1. [Strategic recommendation]
2. [Tactical recommendation]

## Sources
[List key sources with quality scores]
```

## Tips for Better Results

- Use `dateRestrict: "y1"` for recent competitive moves
- Check Crunchbase/LinkedIn for company info
- Look for customer reviews mentioning alternatives
- Search "[competitor] problems" or "[competitor] issues" for weaknesses
