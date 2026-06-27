---
name: find-docs
description: Find official documentation, API references, and technical guides for technologies, libraries, or tools
argument-hint: [technology/library/tool]
---

# Find Documentation

Locate official documentation for: **$ARGUMENTS**

## Search Strategy

### Step 1: Find Official Sources

Use `google_search` with targeted queries:

```
"[subject] documentation"
"[subject] docs"
"[subject] API reference"
"[subject] official guide"
site:github.com "[subject]" README
```

Prioritize results from:
- Official project domains
- github.com (official repos)
- readthedocs.io
- docs.* subdomains

### Step 2: Identify Documentation Types

Look for:
1. **Getting Started / Quickstart** - Initial setup and basic usage
2. **API Reference** - Complete API documentation
3. **Guides / Tutorials** - Step-by-step instructions
4. **Examples** - Code samples and use cases
5. **Changelog** - Version history and breaking changes
6. **Migration Guides** - Upgrading between versions

### Step 3: Extract Key Information

Use `extract_webpage_content` on official docs to get:
- Installation instructions
- Basic usage examples
- Configuration options
- Common patterns

### Step 4: Find Community Resources

Secondary search for:
```
"[subject] tutorial"
"[subject] example"
"[subject] best practices"
"[subject] cheatsheet"
```

## Output Format

```markdown
# Documentation: [Subject]

## Official Resources

| Resource | URL | Type | Notes |
|----------|-----|------|-------|
| Official Docs | [url] | Reference | Main documentation |
| GitHub Repo | [url] | Source | README, examples |
| API Reference | [url] | Reference | Detailed API docs |

## Quick Start

### Installation
[Official installation command/steps]

### Basic Usage
[Minimal example from official docs]

## Key Documentation Sections

### [Section 1: e.g., Configuration]
- URL: [link]
- Summary: [what it covers]

### [Section 2: e.g., API]
- URL: [link]
- Summary: [what it covers]

## Version Information
- Current stable: [version]
- Documentation version: [version if different]
- Last updated: [date if known]

## Community Resources
- [Tutorial/Guide title](url) - [brief description]
- [Cheatsheet](url) - [brief description]

## Related Documentation
- [Related tool/library](docs url)
```

## Search Tips

- Add version number if looking for specific version docs
- Use `site:` operator for official domains
- Check GitHub repo's `/docs` folder or wiki
- Look for "awesome-[subject]" lists for curated resources
- Recent blog posts often have updated examples
