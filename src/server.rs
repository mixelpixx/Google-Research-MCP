use std::sync::Arc;

use rmcp::{handler::server::wrapper::Parameters, tool, tool_router};

use crate::{
    config::Config,
    content::extractor,
    serpapi::client::{SearchParams, SerpApiClient},
    tools::{
        extract::{ExtractMultipleParams, ExtractWebpageParams},
        google_search::GoogleSearchParams,
        research::ResearchTopicParams,
    },
};

#[derive(Clone)]
pub struct GoogleResearchServer {
    serpapi: Arc<SerpApiClient>,
    http_client: Arc<reqwest::Client>,
    _config: Arc<Config>,
}

impl GoogleResearchServer {
    pub fn new(config: Config) -> Self {
        let serpapi = Arc::new(SerpApiClient::new(config.serpapi_key.clone()));
        let http_client = Arc::new(
            reqwest::Client::builder()
                .user_agent(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                     (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                )
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("failed to build HTTP client"),
        );
        Self {
            serpapi,
            http_client,
            _config: Arc::new(config),
        }
    }
}

#[tool_router(server_handler)]
impl GoogleResearchServer {
    #[tool(description = "Search Google via SerpAPI. Returns organic results with quality scores, \
        source types, and authority ratings. Supports site filtering, date restrictions, \
        language selection, and result type (news/image/video).")]
    async fn google_search(
        &self,
        Parameters(params): Parameters<GoogleSearchParams>,
    ) -> String {
        let started = std::time::Instant::now();
        tracing::info!(query = %params.query, "google_search received");

        let results_per_page = params
            .results_per_page
            .or(params.num_results)
            .unwrap_or(5)
            .min(10);
        let page = params.page.unwrap_or(1).max(1);
        let start = (page - 1) * results_per_page;

        let sp = SearchParams {
            query: params.query.clone(),
            site: params.site,
            exact_terms: params.exact_terms,
            language: params.language,
            date_restrict: params.date_restrict,
            result_type: params.result_type,
            results_per_page,
            start,
            sort: params.sort,
        };

        let result = match self.serpapi.search(sp).await {
            Err(e) => format!("Search error: {}", e),
            Ok(results) => {
                if results.is_empty() {
                    return format!("No results found for \"{}\".", params.query);
                }
                let mut out = format!(
                    "Search results for \"{}\" (page {}):\n\n",
                    params.query, page
                );
                for (i, r) in results.iter().enumerate() {
                    out.push_str(&format!(
                        "{}. **{}**\n   URL: {}\n   Quality: {:.0}% | Authority: {:.0}% | Type: {}\n",
                        i + 1,
                        r.title,
                        r.link,
                        r.quality_score * 100.0,
                        r.authority * 100.0,
                        r.source_type,
                    ));
                    if let Some(date) = &r.date {
                        out.push_str(&format!("   Date: {}\n", date));
                    }
                    out.push_str(&format!("   {}\n\n", r.snippet));
                }
                out
            }
        };

        tracing::info!(
            elapsed_ms = started.elapsed().as_millis() as u64,
            response_bytes = result.len(),
            "google_search completed"
        );
        result
    }

    #[tool(description = "Extract readable content from a single webpage. Returns title, \
        description, word count, summary, and content in markdown, html, or text format. \
        Use full_content=true for the complete page text.")]
    async fn extract_webpage_content(
        &self,
        Parameters(params): Parameters<ExtractWebpageParams>,
    ) -> String {
        let started = std::time::Instant::now();
        tracing::info!(url = %params.url, "extract_webpage_content received");
        let format = params.format.as_deref().unwrap_or("markdown");
        let result = match extractor::extract_url(
            &self.http_client,
            &params.url,
            format,
            params.max_length,
        )
        .await
        {
            Err(e) => format!("Extraction error: {}", e),
            Ok(content) => {
                let body = if params.full_content.unwrap_or(false) {
                    match format {
                        "html" => content.content_html,
                        "text" => content.content_text,
                        _ => content.content_markdown,
                    }
                } else {
                    content.preview
                };
                format!(
                    "**Title:** {}\n**URL:** {}\n**Description:** {}\n**Words:** {} (~{} chars)\n\n**Summary:** {}\n\n---\n\n{}",
                    content.title,
                    content.url,
                    content.description,
                    content.word_count,
                    content.approximate_chars,
                    content.summary,
                    body
                )
            }
        };
        tracing::info!(
            elapsed_ms = started.elapsed().as_millis() as u64,
            response_bytes = result.len(),
            "extract_webpage_content completed"
        );
        result
    }

    #[tool(description = "Extract content from up to 5 URLs concurrently. Returns title, URL, \
        word count, and summary for each page. Useful for quickly scanning multiple sources.")]
    async fn extract_multiple_webpages(
        &self,
        Parameters(params): Parameters<ExtractMultipleParams>,
    ) -> String {
        let urls: Vec<String> = params.urls.into_iter().take(5).collect();
        if urls.is_empty() {
            return "No URLs provided.".to_string();
        }
        let format = params.format.unwrap_or_else(|| "markdown".to_string());

        let tasks: Vec<_> = urls
            .iter()
            .map(|url| {
                let client = self.http_client.clone();
                let url = url.clone();
                let fmt = format.clone();
                tokio::spawn(async move {
                    extractor::extract_url(&client, &url, &fmt, Some(2000)).await
                })
            })
            .collect();

        let mut out = String::new();
        for (i, task) in tasks.into_iter().enumerate() {
            let url = &urls[i];
            match task.await {
                Ok(Ok(content)) => {
                    out.push_str(&format!(
                        "--- Source {} ---\n**Title:** {}\n**URL:** {}\n**Words:** {}\n**Summary:** {}\n\n",
                        i + 1,
                        content.title,
                        content.url,
                        content.word_count,
                        content.summary,
                    ));
                }
                Ok(Err(e)) => {
                    out.push_str(&format!(
                        "--- Source {} ---\n**URL:** {}\n**Error:** {}\n\n",
                        i + 1,
                        url,
                        e
                    ));
                }
                Err(e) => {
                    out.push_str(&format!(
                        "--- Source {} ---\n**URL:** {}\n**Error:** task failed: {}\n\n",
                        i + 1,
                        url,
                        e
                    ));
                }
            }
        }
        out
    }

    #[tool(description = "Research a topic in depth. Searches for sources, extracts content, \
        and returns a structured synthesis prompt for Claude to analyze. Supports basic, \
        intermediate, and advanced depth levels. Use focus_areas to target specific subtopics.")]
    async fn research_topic(
        &self,
        Parameters(params): Parameters<ResearchTopicParams>,
    ) -> String {
        crate::tools::research::run_research_topic(
            &self.serpapi,
            &self.http_client,
            params,
        )
        .await
    }
}
