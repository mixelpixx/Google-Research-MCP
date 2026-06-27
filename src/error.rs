use thiserror::Error;

#[derive(Debug, Error)]
pub enum SerpApiError {
    #[error("SerpAPI HTTP {status}: {message}")]
    Http { status: u16, message: String },

    #[error("SerpAPI returned an error: {0}")]
    ApiError(String),

    #[error("No results found for query: {0}")]
    NoResults(String),

    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
}

#[derive(Debug, Error)]
pub enum ExtractionError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Failed to fetch {url}: {source}")]
    FetchFailed {
        url: String,
        #[source]
        source: reqwest::Error,
    },

    #[error("Content extraction produced no readable text")]
    NoContent,
}
