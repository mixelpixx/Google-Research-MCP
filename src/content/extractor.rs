use reqwest::Client;
use scraper::{Html, Selector};

use crate::error::ExtractionError;

pub struct ExtractedContent {
    pub url: String,
    pub title: String,
    pub description: String,
    pub word_count: usize,
    pub approximate_chars: usize,
    pub content_markdown: String,
    pub content_text: String,
    pub content_html: String,
    pub summary: String,
    pub preview: String,
}

pub async fn extract_url(
    client: &Client,
    url: &str,
    format: &str,
    max_length: Option<usize>,
) -> Result<ExtractedContent, ExtractionError> {
    url::Url::parse(url).map_err(|_| ExtractionError::InvalidUrl(url.to_string()))?;

    let response = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
             (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9")
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .map_err(|e| ExtractionError::FetchFailed {
            url: url.to_string(),
            source: e,
        })?;

    let html_body = response.text().await.map_err(|e| ExtractionError::FetchFailed {
        url: url.to_string(),
        source: e,
    })?;

    let document = Html::parse_document(&html_body);

    let title = extract_title(&document);
    let description = extract_meta_description(&document);

    // Remove boilerplate elements before converting
    let cleaned_html = strip_boilerplate(&html_body);

    let content_markdown = htmd::convert(&cleaned_html)
        .unwrap_or_default()
        .trim()
        .to_string();
    let content_markdown = normalize_markdown(&content_markdown);

    let content_text = extract_text(&cleaned_html);
    let content_html = cleaned_html.clone();

    let word_count = content_text.split_whitespace().count();
    let approximate_chars = content_text.len();

    let preview: String = content_markdown.chars().take(500).collect();
    let summary = generate_summary(&content_text, 300);

    let final_content = match format {
        "html" => content_html.clone(),
        "text" => content_text.clone(),
        _ => content_markdown.clone(),
    };

    let final_content = if let Some(max) = max_length {
        // Truncate by character count, not byte index — slicing on a raw byte
        // offset panics when `max` lands in the middle of a multi-byte UTF-8
        // sequence (common on non-ASCII pages).
        if final_content.chars().count() > max {
            final_content.chars().take(max).collect::<String>()
        } else {
            final_content
        }
    } else {
        final_content
    };

    Ok(ExtractedContent {
        url: url.to_string(),
        title,
        description,
        word_count,
        approximate_chars,
        content_markdown: final_content.clone(),
        content_text,
        content_html,
        summary,
        preview,
    })
}

fn extract_title(doc: &Html) -> String {
    // Prefer og:title
    let og_sel = Selector::parse("meta[property='og:title']").unwrap();
    if let Some(el) = doc.select(&og_sel).next() {
        if let Some(content) = el.value().attr("content") {
            let t = content.trim().to_string();
            if !t.is_empty() {
                return t;
            }
        }
    }
    let title_sel = Selector::parse("title").unwrap();
    doc.select(&title_sel)
        .next()
        .map(|e| e.text().collect::<String>().trim().to_string())
        .unwrap_or_default()
}

fn extract_meta_description(doc: &Html) -> String {
    let sel =
        Selector::parse("meta[name='description'], meta[property='og:description']").unwrap();
    doc.select(&sel)
        .next()
        .and_then(|e| e.value().attr("content"))
        .unwrap_or_default()
        .trim()
        .to_string()
}

/// Strip noisy HTML elements using a simple tag-block removal pass.
/// This avoids the need for a mutable DOM (scraper is read-only).
fn strip_boilerplate(html: &str) -> String {
    const NOISE_TAGS: &[&str] = &[
        "script", "style", "nav", "header", "footer", "aside", "iframe", "noscript", "svg",
        "canvas",
    ];

    let mut result = html.to_string();
    for tag in NOISE_TAGS {
        result = remove_tag_blocks(&result, tag);
    }
    result
}

fn remove_tag_blocks(html: &str, tag: &str) -> String {
    let open_pat = format!("<{}", tag);
    let close_pat = format!("</{}>", tag);
    let mut result = String::with_capacity(html.len());
    let mut remaining = html;

    loop {
        // Find next opening tag (case-insensitive search via lowercase comparison)
        let lower = remaining.to_lowercase();
        let open_start = lower.find(&open_pat);

        match open_start {
            None => {
                result.push_str(remaining);
                break;
            }
            Some(start) => {
                // Only strip if followed by space, >, or newline (not a tag like <navigation>)
                let after = &remaining[start + open_pat.len()..];
                let next_char = after.chars().next().unwrap_or(' ');
                if !matches!(next_char, ' ' | '>' | '\n' | '\r' | '\t' | '/') {
                    // False match (different tag with same prefix) — keep and skip past
                    result.push_str(&remaining[..start + open_pat.len()]);
                    remaining = &remaining[start + open_pat.len()..];
                    continue;
                }

                result.push_str(&remaining[..start]);

                // Find matching closing tag after the opening tag
                let after_open = &remaining[start..];
                let lower_after = after_open.to_lowercase();
                match lower_after.find(&close_pat) {
                    Some(close_start) => {
                        // Skip the entire block including closing tag
                        remaining = &remaining[start + close_start + close_pat.len()..];
                    }
                    None => {
                        // No closing tag found — skip to end of opening tag and continue
                        match after_open.find('>') {
                            Some(gt) => remaining = &remaining[start + gt + 1..],
                            None => break,
                        }
                    }
                }
            }
        }
    }

    result
}

/// Extract all visible text from HTML using scraper.
fn extract_text(html: &str) -> String {
    let doc = Html::parse_document(html);
    let text: Vec<&str> = doc.root_element().text().collect();
    text.join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Collapse excessive blank lines and normalize markdown.
fn normalize_markdown(md: &str) -> String {
    let mut result = String::with_capacity(md.len());
    let mut blank_count = 0u32;
    for line in md.lines() {
        if line.trim().is_empty() {
            blank_count += 1;
            if blank_count <= 2 {
                result.push('\n');
            }
        } else {
            blank_count = 0;
            result.push_str(line);
            result.push('\n');
        }
    }
    result.trim().to_string()
}

fn generate_summary(text: &str, max_len: usize) -> String {
    let mut summary = String::new();
    for sentence in text.split(". ") {
        let candidate = sentence.trim();
        if candidate.is_empty() {
            continue;
        }
        if summary.len() + candidate.len() + 2 > max_len {
            break;
        }
        if !summary.is_empty() {
            summary.push(' ');
        }
        summary.push_str(candidate);
        summary.push('.');
    }
    if summary.len() < text.len().min(max_len) && !summary.ends_with("...") {
        summary.push_str("..");
    }
    summary.trim().to_string()
}
