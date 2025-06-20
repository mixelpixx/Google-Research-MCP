import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import MarkdownIt from 'markdown-it';
import { WebpageContent, OutputFormat } from '../types.js';
import TurndownService from 'turndown';

interface ContentCacheEntry {
  timestamp: number;
  content: WebpageContent;
}

export class ContentExtractor {
  private md: MarkdownIt;
  private turndownService: TurndownService;
  // Cache for webpage content (key: url + format, value: content)
  private contentCache: Map<string, ContentCacheEntry> = new Map();
  // Cache expiration time in milliseconds (30 minutes)
  private cacheTTL: number = 30 * 60 * 1000;

  constructor() {
    this.md = new MarkdownIt();
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }

  private cleanText(text: string): string {
    // Remove multiple blank lines
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    // Remove excessive spaces
    text = text.replace(/ +/g, ' ');
    return text.trim();
  }

  private cleanMarkdown(text: string): string {
    let cleanedText = this.cleanText(text);
    // Ensure headers have space after #
    cleanedText = cleanedText.replace(/#([A-Za-z0-9])/g, '# $1');
    return cleanedText;
  }

  private htmlToMarkdown(html: string): string {
    return this.cleanMarkdown(this.turndownService.turndown(html));
  }

  private htmlToPlainText(html: string): string {
    const dom = new JSDOM(html);
    return this.cleanText(dom.window.document.body.textContent || '');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a cache key from URL and format
   */
  private generateCacheKey(url: string, format: OutputFormat): string {
    return `${url}|${format}`;
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(entry: ContentCacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < this.cacheTTL;
  }

  /**
   * Store webpage content in cache
   */
  private cacheContent(url: string, format: OutputFormat, content: WebpageContent): void {
    const cacheKey = this.generateCacheKey(url, format);
    this.contentCache.set(cacheKey, {
      timestamp: Date.now(),
      content
    });
    
    // Limit cache size to prevent memory issues (max 50 entries)
    if (this.contentCache.size > 50) {
      // Delete oldest entry
      const oldestKey = Array.from(this.contentCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.contentCache.delete(oldestKey);
    }
  }

  /**
   * Generates a concise summary of the content
   * @param content The content to summarize
   * @param maxLength Maximum length of the summary
   * @returns A summary of the content
   */
  private generateSummary(content: string, maxLength: number = 300): string {
    // Simple summarization: take first few sentences up to maxLength
    const sentences = content.split(/(?<=[.!?])\s+/);
    let summary = '';
    
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence + ' ';
      } else {
        break;
      }
    }
    
    return summary.trim() + (summary.length < content.length ? '...' : '');
  }

  async extractContent(url: string, format: OutputFormat = 'markdown'): Promise<WebpageContent> {
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL provided');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(url, format);
    const cachedContent = this.contentCache.get(cacheKey);
    if (cachedContent && this.isCacheValid(cachedContent)) {
      console.error(`Using cached content for ${url}`);
      return cachedContent.content;
    }

    try {
      // Fetch webpage content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000, // Increased for complex research content
        maxContentLength: 50 * 1024 * 1024, // 50MB max for research papers
        maxBodyLength: 50 * 1024 * 1024
      });

      // Parse with Cheerio for metadata
      const $ = cheerio.load(response.data);
      const metaTags: Record<string, string> = {};
      
      // Extract more meta tags for research purposes
      const importantMetaTags = [
        'description', 'keywords', 'author', 'og:title', 'og:description',
        'twitter:title', 'twitter:description', 'article:published_time',
        'article:author', 'citation_title', 'citation_author', 'citation_publication_date',
        'citation_journal_title', 'citation_doi'
      ];
      
      $('meta').each((_, element) => {
        const name = $(element).attr('name') || $(element).attr('property') || '';
        const content = $(element).attr('content') || '';
        if (name && content && importantMetaTags.some(tag => name.includes(tag))) {
          metaTags[name] = content;
        }
      });

      // Use enhanced content extraction for complete, coherent content
      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      
      // First try Readability with enhanced options
      const reader = new Readability(document.cloneNode(true) as Document, {
        charThreshold: 50,  // Lower threshold to capture more content
        classesToPreserve: ['table', 'figure', 'chart', 'formula', 'citation', 'code', 'pre', 'blockquote'],
        keepClasses: true,
        debug: false
      });
      const article = reader.parse();

      let contentStr: string;
      
      if (article && article.content && article.content.length > 100) {
        // Readability succeeded - use it but enhance it
        switch (format) {
          case 'html':
            contentStr = this.enhanceHtmlContent(article.content);
            break;
          case 'text':
            contentStr = this.enhanceTextContent(this.htmlToPlainText(article.content));
            break;
          case 'markdown':
          default:
            contentStr = this.enhanceMarkdownContent(this.htmlToMarkdown(article.content));
            break;
        }
      } else {
        // Readability failed or returned insufficient content - use fallback extraction
        console.log(`Readability failed for ${url}, using fallback extraction`);
        contentStr = this.fallbackContentExtraction($, format);
      }

      // Calculate content stats
      const wordCount = contentStr.split(/\s+/).filter(word => word.length > 0).length;
      
      // Generate an improved summary of the content
      const summary = this.generateSummary(contentStr, 500); // Longer summaries for research content
      
      // Extract any section headings for better content structure understanding
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_, element) => {
        const headingText = $(element).text().trim();
        if (headingText) {
          headings.push(headingText);
        }
      });

      const content: WebpageContent = {
        url,
        title: ($('title').text() as string) || article?.title || '',
        description: metaTags['description'] || '',
        content: contentStr,
        format: format,
        meta_tags: metaTags,
        stats: {
          word_count: wordCount,
          approximate_chars: contentStr.length
        },
        content_preview: {
          first_500_chars: contentStr.slice(0, 500) + (contentStr.length > 500 ? '...' : '')
        },
        summary: summary,
        structure: {
          headings: headings.slice(0, 20) // Include up to 20 headings to show document structure
        }
      };

      // Cache the content before returning
      this.cacheContent(url, format, content);

      return content;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch webpage: ${error.message}`);
      }
      throw error;
    }
  }

  async batchExtractContent(urls: string[], format: OutputFormat = 'markdown'): Promise<Record<string, WebpageContent | { error: string }>> {
    const results: Record<string, WebpageContent | { error: string }> = {};

    await Promise.all(
      urls.map(async (url) => {
        try {
          results[url] = await this.extractContent(url, format);
        } catch (error) {
          results[url] = {
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      })
    );

    return results;
  }

  /**
   * Enhanced HTML content processing to preserve complete thoughts
   */
  private enhanceHtmlContent(html: string): string {
    // Ensure paragraphs are complete and well-formed
    const $ = cheerio.load(html);
    
    // Remove empty paragraphs and normalize whitespace
    $('p').each((i, elem) => {
      const $p = $(elem);
      const text = $p.text().trim();
      if (!text || text.length < 10) {
        $p.remove();
      } else {
        // Ensure paragraph ends with proper punctuation
        if (!/[.!?]$/.test(text)) {
          $p.html($p.html() + '.');
        }
      }
    });
    
    return $.html();
  }

  /**
   * Enhanced text content processing for coherent reading
   */
  private enhanceTextContent(text: string): string {
    // Split into paragraphs and clean each one
    const paragraphs = text.split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20) // Remove very short paragraphs
      .map(p => {
        // Ensure paragraph ends with proper punctuation
        const trimmed = p.trim();
        if (!/[.!?]$/.test(trimmed)) {
          return trimmed + '.';
        }
        return trimmed;
      });
    
    return paragraphs.join('\n\n');
  }

  /**
   * Enhanced markdown content processing
   */
  private enhanceMarkdownContent(markdown: string): string {
    // Clean up markdown and ensure complete sentences
    let enhanced = markdown;
    
    // Fix common markdown issues
    enhanced = enhanced.replace(/#{1,6}\s*([^#\n]+)\s*#{0,6}/g, (match, title) => {
      const level = match.indexOf(' ') - match.indexOf('#');
      return '#'.repeat(Math.min(level, 6)) + ' ' + title.trim();
    });
    
    // Ensure list items are complete
    enhanced = enhanced.replace(/^(\s*[-*+]\s+)(.+)$/gm, (match, prefix, content) => {
      const trimmed = content.trim();
      if (!/[.!?]$/.test(trimmed) && trimmed.length > 10) {
        return prefix + trimmed + '.';
      }
      return match;
    });
    
    // Clean up multiple blank lines
    enhanced = enhanced.replace(/\n{3,}/g, '\n\n');
    
    return enhanced.trim();
  }

  /**
   * Fallback content extraction when Readability fails
   */
  private fallbackContentExtraction($: cheerio.Root, format: OutputFormat): string {
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .sidebar').remove();
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.page-content',
      'article',
      '.article-body'
    ];
    
    let contentElement = null;
    for (const selector of contentSelectors) {
      const elem = $(selector).first();
      if (elem.length && elem.text().trim().length > 200) {
        contentElement = elem;
        break;
      }
    }
    
    // If no main content found, use body but clean it
    if (!contentElement) {
      contentElement = $('body');
      // Remove navigation, sidebars, etc.
      contentElement.find('nav, header, footer, aside, .nav, .navigation, .sidebar, .menu').remove();
    }
    
    const htmlContent = contentElement.html() || '';
    
    switch (format) {
      case 'html':
        return this.enhanceHtmlContent(htmlContent);
      case 'text':
        return this.enhanceTextContent(this.htmlToPlainText(htmlContent));
      case 'markdown':
      default:
        return this.enhanceMarkdownContent(this.htmlToMarkdown(htmlContent));
    }
  }
}
