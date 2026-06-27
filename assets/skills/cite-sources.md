---
name: cite-sources
description: Generate properly formatted citations and references from research
argument-hint: [format: APA/MLA/Chicago/IEEE]
---

# Citation Generator

Generate citations in **$ARGUMENTS** format (default: APA if not specified).

## How to Use

After conducting research with `google_search`, `extract_webpage_content`, or `research_topic`, use this skill to format your sources as proper citations.

## Citation Formats

### APA 7th Edition (Default)

**Website/Online Article:**
```
Author, A. A. (Year, Month Day). Title of page. Site Name. URL
```

**No author:**
```
Title of page. (Year, Month Day). Site Name. URL
```

**Online News Article:**
```
Author, A. A. (Year, Month Day). Title of article. Publication Name. URL
```

### MLA 9th Edition

**Website:**
```
Author Last Name, First Name. "Title of Page." Site Name, Day Month Year, URL.
```

**No author:**
```
"Title of Page." Site Name, Day Month Year, URL.
```

### Chicago 17th Edition

**Website (Notes-Bibliography):**
```
First Name Last Name, "Title of Page," Site Name, Month Day, Year, URL.
```

**Website (Author-Date):**
```
Last Name, First Name. Year. "Title of Page." Site Name. Month Day, Year. URL.
```

### IEEE

**Website:**
```
[#] A. Author. "Title of Page." Site Name. URL (accessed Month Day, Year).
```

## Process

### Step 1: Gather Source Information

For each source from your research, extract:
- Author(s) - check byline, about page
- Publication date - look for date published/updated
- Title - exact title of the page/article
- Site/Publication name - the website or publication
- URL - full URL

### Step 2: Handle Missing Information

**No author found:**
- Use organization name if official content
- Start with title if no clear author

**No date found:**
- Use (n.d.) for APA
- Use "n.d." for other formats

**Dynamic content:**
- Add "Retrieved [date]" or "accessed [date]"

## Output Format

```markdown
# References

## APA Format

Author, A. A. (2024, January 15). Title of the article. *Publication Name*. https://example.com/article

Organization Name. (2024). Title of page. *Site Name*. https://example.com/page

Title of page with no author. (n.d.). *Site Name*. Retrieved January 20, 2024, from https://example.com

## In-Text Citations

Use: (Author, Year) or Author (Year)
- Single author: (Smith, 2024)
- Two authors: (Smith & Jones, 2024)
- Three+ authors: (Smith et al., 2024)
- No author: ("Title," 2024)
- No date: (Smith, n.d.)
```

## Quality Checklist

- [ ] All URLs are complete and functional
- [ ] Dates are in correct format for citation style
- [ ] Author names are properly formatted (Last, First for APA/Chicago)
- [ ] Titles use correct capitalization for style
- [ ] Online sources include retrieval/access date where required
- [ ] DOIs used instead of URLs where available
