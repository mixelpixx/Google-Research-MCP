use schemars::JsonSchema;
use serde::Deserialize;

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ExtractWebpageParams {
    #[schemars(description = "Full URL of the webpage (must start with http:// or https://)")]
    pub url: String,

    #[schemars(description = "Output format: markdown (default), html, or text")]
    pub format: Option<String>,

    #[schemars(description = "Return full content (true) or a preview of the first 500 chars (false, default)")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_bool")]
    pub full_content: Option<bool>,

    #[schemars(description = "Maximum character length to return")]
    #[serde(default, deserialize_with = "crate::tools::de::de_opt_usize")]
    pub max_length: Option<usize>,
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ExtractMultipleParams {
    #[schemars(description = "Array of webpage URLs to extract (maximum 5)")]
    pub urls: Vec<String>,

    #[schemars(description = "Output format: markdown (default), html, or text")]
    pub format: Option<String>,
}
