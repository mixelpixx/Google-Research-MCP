use serde::{Deserialize, Serialize};

/// Top-level SerpAPI response envelope.
///
/// We deliberately deserialize ONLY the fields we use. SerpAPI returns many more
/// (search_metadata, search_parameters, search_information, pagination, etc.) and
/// some of them have inconsistent types across queries (e.g. total_results may be
/// either a string or an integer). Listing only what we need keeps us robust to
/// upstream schema drift.
#[derive(Debug, Deserialize)]
pub struct SerpApiResponse {
    pub error: Option<String>,
    pub organic_results: Option<Vec<OrganicResult>>,
}

/// One item from organic_results. Every field is optional because SerpAPI omits
/// fields rather than nulling them when data isn't available.
#[derive(Debug, Deserialize)]
pub struct OrganicResult {
    pub title: Option<String>,
    pub link: Option<String>,
    pub snippet: Option<String>,
    /// Display name of the source domain (e.g. "Wikipedia")
    pub source: Option<String>,
    pub date: Option<String>,
    pub position: Option<u32>,
    pub displayed_link: Option<String>,
}

/// Internal representation after mapping from OrganicResult
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    pub title: String,
    pub link: String,
    pub snippet: String,
    pub source: Option<String>,
    pub date: Option<String>,
    pub position: Option<u32>,
    pub quality_score: f64,
    pub authority: f64,
    pub source_type: String,
}
