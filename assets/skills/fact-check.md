---
name: fact-check
description: Verify claims, statements, or information using multiple authoritative sources
argument-hint: [claim to verify]
---

# Fact-Check Workflow

Verify this claim: **$ARGUMENTS**

## Verification Process

### Step 1: Understand the Claim
Break down the claim into verifiable components:
- What specific facts are being asserted?
- What would need to be true for this claim to be accurate?
- Are there numbers, dates, or specific details to verify?

### Step 2: Search for Primary Sources
Use `google_search` to find:
1. **Official sources** - Government, academic institutions, official documentation
   ```
   query: "[claim keywords] site:gov OR site:edu"
   ```
2. **Fact-checking sites** - Snopes, PolitiFact, FactCheck.org
   ```
   query: "[claim] fact check"
   ```
3. **News sources** - Reuters, AP, established journalism
   ```
   query: "[claim]" with dateRestrict for recency
   ```

### Step 3: Extract and Compare
Use `extract_webpage_content` on top 3-5 sources with highest authority scores.

Compare:
- Do sources agree on the core facts?
- Are there important caveats or context missing from the original claim?
- What's the original source of the information?

### Step 4: Assess Source Quality
Prioritize sources by:
1. Primary sources (original data, studies, official records)
2. Academic/peer-reviewed content
3. Established news organizations
4. Expert commentary

Be skeptical of:
- Single-source claims
- Sources with commercial interest
- Outdated information
- Circular citations (all sources citing each other)

## Verdict Format

```markdown
# Fact Check: [Claim]

## Verdict: [TRUE / MOSTLY TRUE / MIXED / MOSTLY FALSE / FALSE / UNVERIFIABLE]

## Summary
[1-2 sentence summary of findings]

## Evidence

### Supporting Evidence
- [Source]: [What they say] (Authority: X%)
- ...

### Contradicting Evidence
- [Source]: [What they say] (Authority: X%)
- ...

## Important Context
[Any nuance, caveats, or missing context from the original claim]

## Source Quality
- Primary sources consulted: X
- Average source authority: X%
- Source agreement: [High/Medium/Low]

## Confidence Level
[HIGH/MEDIUM/LOW] - [Explanation of confidence]
```

## Red Flags to Note
- Claim uses vague language ("studies show", "experts say") without specifics
- Numbers that seem too round or dramatic
- Claims that align suspiciously well with a particular agenda
- Information that can't be traced to an original source
