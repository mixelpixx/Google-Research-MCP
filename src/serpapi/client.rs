use reqwest::Client;

use crate::{
    content::quality,
    error::SerpApiError,
    serpapi::types::{SearchResult, SerpApiResponse},
};

pub struct SerpApiClient {
    client: Client,
    api_key: String,
}

impl SerpApiClient {
    pub fn new(api_key: String) -> Self {
        let client = Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");
        Self { client, api_key }
    }

    pub async fn search(&self, params: SearchParams) -> Result<Vec<SearchResult>, SerpApiError> {
        let mut url = url::Url::parse("https://serpapi.com/search").expect("static URL");
        {
            let mut qp = url.query_pairs_mut();
            qp.append_pair("api_key", &self.api_key);
            qp.append_pair("engine", &params.engine());
            qp.append_pair("q", &params.build_query());
            qp.append_pair("num", &params.results_per_page.to_string());
            if params.start > 0 {
                qp.append_pair("start", &params.start.to_string());
            }
            if let Some(hl) = &params.language {
                qp.append_pair("hl", hl);
                qp.append_pair("gl", hl);
            }
            if let Some(tbs) = params.tbs() {
                qp.append_pair("tbs", &tbs);
            }
            if params.sort.as_deref() == Some("date") {
                qp.append_pair("sort", "date");
            }
        }

        // SerpAPI usually responds in 1-2s but occasionally spikes to 5-7s.
        // We retry once on transient network errors so a single hiccup doesn't
        // surface to the caller (most MCP clients have aggressive per-tool
        // timeouts, especially with smaller models that won't think to retry).
        let response = match self.client.get(url.clone()).send().await {
            Ok(r) => r,
            Err(e) if is_transient(&e) => {
                tracing::warn!(error = %e, "SerpAPI transient failure — retrying once");
                self.client
                    .get(url)
                    .send()
                    .await
                    .map_err(SerpApiError::Network)?
            }
            Err(e) => return Err(SerpApiError::Network(e)),
        };

        let status = response.status().as_u16();

        if !response.status().is_success() {
            let body: serde_json::Value = response.json().await.unwrap_or_default();
            let message = body["error"]
                .as_str()
                .unwrap_or("unknown error")
                .to_string();
            return Err(SerpApiError::Http { status, message });
        }

        // Read body as text first so we can include a snippet in error messages
        // if JSON deserialization fails (the bare reqwest error is unhelpful).
        let body_text = response.text().await.map_err(SerpApiError::Network)?;
        let data: SerpApiResponse = serde_json::from_str(&body_text).map_err(|e| {
            let preview: String = body_text.chars().take(300).collect();
            SerpApiError::ApiError(format!(
                "could not decode SerpAPI response: {} | body preview: {}",
                e, preview
            ))
        })?;

        if let Some(err) = data.error {
            return Err(SerpApiError::ApiError(err));
        }

        let organic = data.organic_results.unwrap_or_default();
        if organic.is_empty() {
            return Err(SerpApiError::NoResults(params.query.clone()));
        }

        Ok(organic
            .into_iter()
            .map(|item| {
                let link = item.link.unwrap_or_default();
                let (quality_score, authority, source_type) = quality::score_url(&link);
                SearchResult {
                    title: item.title.unwrap_or_default(),
                    link,
                    snippet: item.snippet.unwrap_or_default(),
                    source: item.source,
                    date: item.date,
                    position: item.position,
                    quality_score,
                    authority,
                    source_type,
                }
            })
            .collect())
    }
}

/// Returns true for reqwest errors that are worth a single retry — connection
/// drops, idle-timeout disconnects, request timeouts, etc. Body-decode errors
/// or 4xx status codes are NOT retried since retrying won't help.
fn is_transient(e: &reqwest::Error) -> bool {
    e.is_timeout() || e.is_connect() || e.is_request()
}

/// Parameters for a SerpAPI search request
pub struct SearchParams {
    pub query: String,
    pub site: Option<String>,
    pub exact_terms: Option<String>,
    pub language: Option<String>,
    /// Google-format date restriction: "d7", "w2", "m6", "y1"
    pub date_restrict: Option<String>,
    /// "news" | "image" | "video" | None (web)
    pub result_type: Option<String>,
    pub results_per_page: u32,
    /// 0-based offset for pagination
    pub start: u32,
    pub sort: Option<String>,
}

impl SearchParams {
    /// Convert Google dateRestrict format to SerpAPI tbs format.
    /// "d7" → "qdr:d7", "m6" → "qdr:m6", "y1" → "qdr:y"
    pub fn tbs(&self) -> Option<String> {
        let dr = self.date_restrict.as_deref()?;
        if dr.is_empty() {
            return None;
        }
        let unit = dr.chars().next()?;
        let n = &dr[1..];
        let tbs_unit = match unit {
            'd' => "d",
            'w' => "w",
            'm' => "m",
            'y' => "y",
            _ => return None,
        };
        if n.is_empty() || n == "1" {
            Some(format!("qdr:{}", tbs_unit))
        } else {
            Some(format!("qdr:{}{}", tbs_unit, n))
        }
    }

    pub fn engine(&self) -> String {
        match self.result_type.as_deref() {
            Some("news") => "google_news".to_string(),
            Some("image") | Some("images") => "google_images".to_string(),
            Some("video") | Some("videos") => "google_videos".to_string(),
            _ => "google".to_string(),
        }
    }

    pub fn build_query(&self) -> String {
        let mut q = self.query.clone();
        if let Some(site) = &self.site {
            q.push_str(&format!(" site:{}", site));
        }
        if let Some(exact) = &self.exact_terms {
            q.push_str(&format!(" \"{}\"", exact));
        }
        q
    }
}
