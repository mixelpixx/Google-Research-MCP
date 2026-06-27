/// Returns `(quality_score, authority_score, source_type)`.
/// All scores are 0.0–1.0.
pub fn score_url(url: &str) -> (f64, f64, String) {
    let domain = extract_domain(url);
    let authority = domain_authority(&domain);
    let source_type = classify_domain(&domain);
    // Recency score unavailable without content — default neutral
    let recency = 0.5_f64;
    let quality = authority * 0.6 + recency * 0.4;
    (quality, authority, source_type)
}

fn extract_domain(url: &str) -> String {
    url::Url::parse(url)
        .ok()
        .and_then(|u| u.host_str().map(|h| h.trim_start_matches("www.").to_lowercase()))
        .unwrap_or_default()
}

fn domain_authority(domain: &str) -> f64 {
    // .edu and .gov always high authority
    if domain.ends_with(".edu") || domain.ends_with(".gov") {
        return 0.95;
    }

    const HIGH: &[&str] = &[
        "wikipedia.org",
        "github.com",
        "stackoverflow.com",
        "docs.rs",
        "rust-lang.org",
        "arxiv.org",
        "nature.com",
        "mozilla.org",
        "w3.org",
        "ietf.org",
        "developer.mozilla.org",
        "crates.io",
    ];

    const MEDIUM: &[&str] = &[
        "medium.com",
        "dev.to",
        "hackernews.com",
        "reddit.com",
        "youtube.com",
        "microsoft.com",
        "google.com",
        "cloudflare.com",
        "digitalocean.com",
        "aws.amazon.com",
    ];

    if HIGH.iter().any(|h| domain == *h || domain.ends_with(&format!(".{}", h))) {
        0.9
    } else if MEDIUM.iter().any(|h| domain == *h || domain.ends_with(&format!(".{}", h))) {
        0.6
    } else {
        0.4
    }
}

fn classify_domain(domain: &str) -> String {
    if domain.ends_with(".edu") {
        return "academic".to_string();
    }
    if domain.ends_with(".gov") {
        return "official".to_string();
    }
    if domain.starts_with("docs.") || domain == "docs.rs" || domain.contains("documentation") {
        return "documentation".to_string();
    }
    if ["medium.com", "dev.to", "substack.com", "hashnode.com"]
        .iter()
        .any(|d| domain == *d || domain.ends_with(&format!(".{}", d)))
    {
        return "blog".to_string();
    }
    if ["reddit.com", "stackoverflow.com", "stackexchange.com", "news.ycombinator.com"]
        .iter()
        .any(|d| domain == *d || domain.ends_with(&format!(".{}", d)))
    {
        return "forum".to_string();
    }
    if ["github.com", "gitlab.com", "bitbucket.org"]
        .iter()
        .any(|d| domain == *d)
    {
        return "code".to_string();
    }
    "web".to_string()
}
