use reqwest::Client;
use schemars::JsonSchema;
use serde::Deserialize;

use crate::{
    content::extractor::{self, ExtractedContent},
    serpapi::client::{SearchParams, SerpApiClient},
};

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ResearchTopicParams {
    #[schemars(description = "The topic to research")]
    pub topic: String,

    #[schemars(
        description = "Research depth: basic (3 sources, brief), intermediate (5 sources, default), advanced (8-10 sources, detailed with contradictions)"
    )]
    pub depth: Option<String>,

    #[schemars(description = "Maximum number of sources to consult (1–10, default 5)")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_u32")]
    pub num_sources: Option<u32>,

    #[schemars(description = "Specific aspects or subtopics to focus on")]
    pub focus_areas: Option<Vec<String>>,
}

pub async fn run_research_topic(
    serpapi: &SerpApiClient,
    http_client: &Client,
    params: ResearchTopicParams,
) -> String {
    let depth = params.depth.as_deref().unwrap_or("intermediate");
    let num_sources = params.num_sources.unwrap_or(5).clamp(1, 10) as usize;
    let focus_areas = params.focus_areas.unwrap_or_default();

    // Build queries: main topic + per-focus-area variants
    let mut queries = vec![params.topic.clone()];
    for area in &focus_areas {
        queries.push(format!("{} {}", params.topic, area));
    }

    // Execute searches (sequential to avoid hammering SerpAPI)
    let sources_per_query = ((num_sources + queries.len() - 1) / queries.len() + 2).min(10);
    let mut all_results = Vec::new();

    for query in &queries {
        let sp = SearchParams {
            query: query.clone(),
            results_per_page: sources_per_query as u32,
            start: 0,
            site: None,
            exact_terms: None,
            language: None,
            date_restrict: None,
            result_type: None,
            sort: None,
        };
        match serpapi.search(sp).await {
            Ok(mut results) => all_results.append(&mut results),
            Err(e) => tracing::warn!("Search query '{}' failed: {}", query, e),
        }
    }

    if all_results.is_empty() {
        return format!(
            "No search results found for topic: \"{}\".\n\nPlease check your SERPAPI_KEY or try a different query.",
            params.topic
        );
    }

    // Deduplicate by URL, sort by quality score, take top N
    let mut seen_urls = std::collections::HashSet::new();
    all_results.retain(|r| seen_urls.insert(r.link.clone()));
    all_results.sort_by(|a, b| {
        b.quality_score
            .partial_cmp(&a.quality_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let top_results: Vec<_> = all_results.into_iter().take(num_sources).collect();

    // Concurrently extract content from top 5 (extraction is the slow part)
    let extract_urls: Vec<String> = top_results.iter().take(5).map(|r| r.link.clone()).collect();

    let tasks: Vec<_> = extract_urls
        .iter()
        .map(|url| {
            let client = http_client.clone();
            let url = url.clone();
            tokio::spawn(async move {
                extractor::extract_url(&client, &url, "markdown", Some(4000)).await
            })
        })
        .collect();

    let mut extracted: Vec<(String, ExtractedContent)> = Vec::new();
    for (i, task) in tasks.into_iter().enumerate() {
        let url = &extract_urls[i];
        match task.await {
            Ok(Ok(content)) => extracted.push((url.clone(), content)),
            Ok(Err(e)) => tracing::warn!("Extraction failed for {}: {}", url, e),
            Err(e) => tracing::warn!("Task panicked for {}: {}", url, e),
        }
    }

    // Include search snippets for sources we couldn't extract
    let snippet_sources: Vec<_> = top_results
        .iter()
        .filter(|r| !extracted.iter().any(|(url, _)| url == &r.link))
        .collect();

    build_agent_prompt(&params.topic, depth, &extracted, &snippet_sources, &focus_areas)
}

fn build_agent_prompt(
    topic: &str,
    depth: &str,
    extracted: &[(String, ExtractedContent)],
    snippet_sources: &[&crate::serpapi::types::SearchResult],
    focus_areas: &[String],
) -> String {
    let depth_instructions = match depth {
        "basic" => "Provide a brief 2-3 paragraph overview with 3-5 key findings.",
        "advanced" => {
            "Provide an in-depth analysis with 7-10 findings, detailed themes, \
             contradictions between sources, and actionable recommendations."
        }
        _ => "Provide a comprehensive analysis with 5-7 key findings, common themes, and practical takeaways.",
    };

    let findings_range = match depth {
        "basic" => "3-5",
        "advanced" => "7-10",
        _ => "5-7",
    };

    let advanced_sections = if depth == "advanced" {
        "\n## Contradictions Between Sources\n[Note any conflicts or disagreements found]\n\n## Recommendations\n[Actionable recommendations based on the research]"
    } else {
        ""
    };

    let focus_section = if !focus_areas.is_empty() {
        format!(
            "\n**Focus Areas to address:** {}\n\nFor each focus area provide:\n1. A dedicated summary paragraph\n2. 3-5 key points\n3. Best practices or recommendations\n",
            focus_areas.join(", ")
        )
    } else {
        String::new()
    };

    let mut sources_text = String::new();

    for (i, (url, content)) in extracted.iter().enumerate() {
        sources_text.push_str(&format!(
            "\n\n=== SOURCE {} ===\nTitle: {}\nURL: {}\nDescription: {}\nWord Count: {}\nSummary: {}\n\nContent:\n{}\n",
            i + 1,
            content.title,
            url,
            content.description,
            content.word_count,
            content.summary,
            content.content_markdown
        ));
    }

    let offset = extracted.len();
    for (i, result) in snippet_sources.iter().enumerate() {
        sources_text.push_str(&format!(
            "\n\n=== SOURCE {} (snippet only) ===\nTitle: {}\nURL: {}\nSnippet: {}\n",
            offset + i + 1,
            result.title,
            result.link,
            result.snippet,
        ));
    }

    let total_sources = extracted.len() + snippet_sources.len();

    format!(
        r#"# RESEARCH SYNTHESIS TASK

You are analyzing research on: **"{topic}"**

**Analysis Depth:** {depth}
**Total Sources:** {total_sources} ({extracted} with full content, {snippets} snippet-only)
{focus_section}
**Instructions:** {depth_instructions}

**Research Sources:**
{sources_text}

---

**Required Output Format:**

## Executive Summary
[Comprehensive 3-6 paragraph synthesis of findings]

## Key Findings
[{findings_range} numbered findings with source attribution (Source N)]

## Common Themes
[Bulleted list of themes that appear across multiple sources]
{advanced_sections}

Begin your analysis:"#,
        topic = topic,
        depth = depth,
        total_sources = total_sources,
        extracted = extracted.len(),
        snippets = snippet_sources.len(),
        focus_section = focus_section,
        depth_instructions = depth_instructions,
        sources_text = sources_text,
        findings_range = findings_range,
        advanced_sections = advanced_sections,
    )
}
