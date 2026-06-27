---
name: deep-research
description: Conduct comprehensive multi-source research on any topic with synthesis and quality assessment
argument-hint: [topic]
---

# Deep Research Workflow

Use this skill to conduct thorough research on: **$ARGUMENTS**

## Research Process

### Phase 1: Initial Discovery
1. Use `google_search` with the main topic to find top sources
2. Note the source types (academic, docs, news, blogs) and quality scores
3. Identify 2-3 subtopics or angles that emerge

### Phase 2: Targeted Deep Dives
For each important subtopic:
1. Run focused `google_search` queries
2. Use `extract_webpage_content` on the highest-quality sources (authority > 70%)
3. Extract full content for sources that seem most authoritative

### Phase 3: Synthesis
Use `research_topic` with:
- `depth: "advanced"` for comprehensive analysis
- `focus_areas` based on subtopics identified in Phase 1
- `num_sources: 8` minimum for thorough coverage

### Phase 4: Gap Analysis
After synthesis, identify:
- Questions that weren't fully answered
- Contradictions between sources
- Areas needing more recent information

Run additional targeted searches to fill gaps.

## Output Format

Provide research results as:

```markdown
# Research: [Topic]

## Executive Summary
[2-3 paragraph overview]

## Key Findings
1. [Finding with source attribution]
2. [Finding with source attribution]
...

## Detailed Analysis
### [Subtopic 1]
...

### [Subtopic 2]
...

## Source Quality Assessment
| Source | Type | Authority | Key Contribution |
|--------|------|-----------|------------------|
| ...    | ...  | ...       | ...              |

## Limitations & Gaps
- [What couldn't be definitively answered]
- [Areas needing more research]

## Recommended Next Steps
- [Actionable recommendations]
```

## Quality Standards

- Minimum 5 unique domains in sources
- Prefer sources with authority > 60%
- Include at least one academic or official documentation source when available
- Flag any findings that only come from a single source
