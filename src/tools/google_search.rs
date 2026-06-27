use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct GoogleSearchParams {
    #[schemars(description = "The search query")]
    pub query: String,

    #[schemars(description = "Number of results to return (default 5, max 10)")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_u32")]
    pub num_results: Option<u32>,

    #[schemars(description = "Restrict results to a specific domain, e.g. wikipedia.org")]
    pub site: Option<String>,

    #[schemars(description = "ISO 639-1 language code, e.g. 'en', 'es', 'fr'")]
    pub language: Option<String>,

    #[schemars(
        description = "Date restriction in Google format: d7 (7 days), w2 (2 weeks), m6 (6 months), y1 (1 year)"
    )]
    pub date_restrict: Option<String>,

    #[schemars(description = "Exact phrase that must appear in results")]
    pub exact_terms: Option<String>,

    #[schemars(description = "Result type: news, image, video, or omit for standard web results")]
    pub result_type: Option<String>,

    #[schemars(description = "Page number (1-based, default 1)")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_u32")]
    pub page: Option<u32>,

    #[schemars(description = "Number of results per page (default 5, max 10)")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_u32")]
    pub results_per_page: Option<u32>,

    #[schemars(description = "Sort order: relevance (default) or date")]
    pub sort: Option<String>,
}
