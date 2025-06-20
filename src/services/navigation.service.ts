import { BrowsingSessionService } from './browsing-session.service.js';
import { EnhancedContentExtractor } from './enhanced-content-extractor.service.js';
import { 
  NavigationOptions, 
  ExtractedLink, 
  BrowsingPath,
  FollowLinksParams,
  FollowLinksResult,
  EnhancedWebpageContent
} from '../types/enhanced-types.js';

/**
 * NavigationService
 * 
 * Provides contextual navigation capabilities that simulate how humans browse the web.
 * This service can follow relevant links, navigate back and forth between pages,
 * and identify relationships between content across different pages.
 */
export class NavigationService {
  private browsingSessionService: BrowsingSessionService;
  private contentExtractor: EnhancedContentExtractor;
  
  constructor(
    browsingSessionService: BrowsingSessionService,
    contentExtractor: EnhancedContentExtractor
  ) {
    this.browsingSessionService = browsingSessionService;
    this.contentExtractor = contentExtractor;
  }
  
  /**
   * Follow links from a starting URL based on relevance to keywords
   */
  public async followLinks(
    sessionId: string,
    params: FollowLinksParams
  ): Promise<FollowLinksResult> {
    const { url, keywords, maxLinksToFollow, depth, stayOnDomain } = params;
    
    // Create or get a session
    let session = this.browsingSessionService.getSession(sessionId);
    
    if (!session) {
      session = this.browsingSessionService.createSession(keywords?.join(', '));
    }
    
    // Visit the starting URL
    // Use enhanced content extractor directly for better extraction
    const startContent = await this.contentExtractor.extractEnhancedContent(url);
    
    // Then add it to the session
    await this.browsingSessionService.visitUrl(sessionId, url);
    
    // Initialize result
    const result: FollowLinksResult = {
      startUrl: url,
      pagesVisited: [{
        url,
        title: startContent.title,
        relevance: 1.0,
        summary: startContent.summary || this.generatePageSummary(startContent)
      }],
      navigationPath: [url],
      relatedTopics: []
    };
    
    if (depth <= 0 || maxLinksToFollow <= 0) {
      return result;
    }
    
    // Use the links we already extracted from the starting page
    const extractedLinks = startContent.links || [];
    console.error(`Found ${extractedLinks.length} links on starting page`);
    
    if (extractedLinks.length === 0) {
      console.error('No links found on starting page, returning early');
      return result;
    }
    
    console.error(`Sample links: ${extractedLinks.slice(0, 5).map(l => `${l.text} -> ${l.url}`).join(', ')}`);
    
    // If we have keywords, filter links by relevance
    const options: NavigationOptions = {
      followLinks: true,
      maxDepth: depth,
      relevanceThreshold: 0.1, // Lower threshold to be less restrictive
      filterByKeywords: keywords,
      excludeDomains: [],
      includeDomains: stayOnDomain ? [new URL(url).hostname] : []
    };
    
    // Score and filter the links we already have
    const scoredLinks = extractedLinks.map(link => {
      // Convert relative URLs to absolute URLs
      let absoluteUrl = link.url;
      try {
        if (!link.url.startsWith('http')) {
          absoluteUrl = new URL(link.url, url).href;
        }
      } catch (error) {
        console.error(`Failed to convert URL ${link.url} to absolute:`, error);
      }
      
      return {
        ...link,
        url: absoluteUrl,
        relevanceScore: this.calculateLinkRelevance({...link, url: absoluteUrl}, keywords || [], startContent)
      };
    });
    
    console.error(`Scored ${scoredLinks.length} links. Scores: ${scoredLinks.slice(0, 10).map(l => `${l.text}:${l.relevanceScore.toFixed(2)}`).join(', ')}`);
    
    // Filter by relevance threshold and other criteria
    let filteredLinks = scoredLinks.filter(link =>
      link.relevanceScore >= options.relevanceThreshold
    );
    
    console.error(`After relevance filtering (>=${options.relevanceThreshold}): ${filteredLinks.length} links`);
    
    // Apply domain filtering if specified
    if (options.includeDomains && options.includeDomains.length > 0) {
      filteredLinks = filteredLinks.filter(link => {
        try {
          const linkDomain = new URL(link.url).hostname;
          return options.includeDomains!.some(domain => linkDomain.includes(domain));
        } catch {
          return false;
        }
      });
    }
    
    // Apply keyword filtering if specified
    if (options.filterByKeywords && options.filterByKeywords.length > 0) {
      filteredLinks = filteredLinks.filter(link => {
        const textToCheck = `${link.text} ${link.context || ''}`.toLowerCase();
        return options.filterByKeywords!.some(keyword =>
          textToCheck.includes(keyword.toLowerCase())
        );
      });
    }
    
    // Sort links by relevance
    const sortedLinks = filteredLinks.sort((a, b) =>
      (b.relevanceScore || 0) - (a.relevanceScore || 0)
    );
    
    console.error(`After filtering: ${sortedLinks.length} relevant links (scores: ${sortedLinks.slice(0, 5).map(l => l.relevanceScore.toFixed(2)).join(', ')})`);
    
    // Only follow the top N links
    const linksToFollow = sortedLinks.slice(0, maxLinksToFollow);
    
    // Follow each link up to the specified depth
    const visitedUrls = new Set<string>([url]);
    
    // Follow links recursively
    await this.followLinksRecursive(
      sessionId,
      linksToFollow,
      visitedUrls,
      depth - 1,
      options,
      result,
      url
    );
    
    // Extract related topics from all visited pages
    result.relatedTopics = this.extractRelatedTopics(result.pagesVisited);
    
    return result;
  }
  
  /**
   * Recursively follow links up to the specified depth
   */
  private async followLinksRecursive(
    sessionId: string,
    links: ExtractedLink[],
    visitedUrls: Set<string>,
    remainingDepth: number,
    options: NavigationOptions,
    result: FollowLinksResult,
    parentUrl: string
  ): Promise<void> {
    console.error(`Following ${links.length} links at depth ${remainingDepth}`);
    
    if (remainingDepth <= 0 || links.length === 0) {
      return;
    }
    
    for (const link of links) {
      if (visitedUrls.has(link.url)) {
        continue;
      }
      
      try {
        // Use enhanced content extractor to get content and links from this specific page
        const content = await this.contentExtractor.extractEnhancedContent(link.url);
        
        // Add to visited URLs
        visitedUrls.add(link.url);
        
        // Add to result
        result.pagesVisited.push({
          url: link.url,
          title: content.title,
          relevance: this.calculateRelevanceScore(content, options.filterByKeywords || []),
          summary: content.summary || this.generatePageSummary(content)
        });
        
        result.navigationPath.push(link.url);
        
        // If we have more depth to go, extract and analyze links from THIS page
        if (remainingDepth >= 1 && content.links && content.links.length > 0) {
          console.error(`Processing ${content.links.length} links from ${link.url} at depth ${remainingDepth}`);
          
          // Calculate relevance scores for all links
          const scoredLinks = content.links.map(pageLink => ({
            ...pageLink,
            relevanceScore: this.calculateLinkRelevance(pageLink, options.filterByKeywords || [], content)
          }));
          
          // Filter links based on options
          let pageLinks = scoredLinks;
          
          // Apply domain filtering if specified
          if (options.includeDomains && options.includeDomains.length > 0) {
            pageLinks = pageLinks.filter(pageLink => {
              try {
                const linkDomain = new URL(pageLink.url).hostname;
                return options.includeDomains!.some(domain => linkDomain.includes(domain));
              } catch {
                return false;
              }
            });
          }
          
          // Apply keyword filtering if specified
          if (options.filterByKeywords && options.filterByKeywords.length > 0) {
            pageLinks = pageLinks.filter(pageLink => {
              const textToCheck = `${pageLink.text} ${pageLink.context || ''}`.toLowerCase();
              return options.filterByKeywords!.some(keyword =>
                textToCheck.includes(keyword.toLowerCase())
              );
            });
          }
          
          // Apply relevance threshold
          if (options.relevanceThreshold && options.relevanceThreshold > 0) {
            pageLinks = pageLinks.filter(pageLink =>
              pageLink.relevanceScore >= options.relevanceThreshold!
            );
          }
          
          // Sort by relevance and limit to top 3 for deeper exploration
          const sortedPageLinks = pageLinks
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, Math.min(3, Math.max(1, 4 - remainingDepth))); // Fewer links at deeper levels
          
          console.error(`Following ${sortedPageLinks.length} relevant links from ${link.url} (scores: ${sortedPageLinks.map(l => l.relevanceScore.toFixed(2)).join(', ')})`);
          
          // Recursively follow these links
          if (sortedPageLinks.length > 0) {
            await this.followLinksRecursive(
              sessionId,
              sortedPageLinks,
              visitedUrls,
              remainingDepth - 1,
              options,
              result,
              link.url
            );
          }
        }
        
        // Also add to browsing session for tracking (after processing links)
        await this.browsingSessionService.visitUrl(sessionId, link.url, parentUrl);
        
      } catch (error) {
        console.error(`Error following link ${link.url}:`, error);
      }
    }
  }
  
  /**
   * Generate navigation paths between two URLs
   */
  public async findNavigationPaths(
    sessionId: string,
    fromUrl: string,
    toUrl: string
  ): Promise<BrowsingPath[]> {
    const session = this.browsingSessionService.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Get paths from the browsing session service
    return this.browsingSessionService.generateNavigationPaths(sessionId, fromUrl, toUrl);
  }
  
  /**
   * Get suggested links from a page based on context
   */
  public async getSuggestedLinks(
    sessionId: string,
    url: string,
    context?: string,
    maxSuggestions: number = 5
  ): Promise<ExtractedLink[]> {
    const session = this.browsingSessionService.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Get content if not already visited
    if (session.currentUrl !== url) {
      // Use enhanced content extractor directly for better extraction
      const content = await this.contentExtractor.extractEnhancedContent(url);
      
      // Then add it to the session
      await this.browsingSessionService.visitUrl(sessionId, url);
    }
    
    // Get relevant links
    const options: NavigationOptions = {
      followLinks: true,
      maxDepth: 1,
      relevanceThreshold: 0.2,
      filterByKeywords: context ? context.split(/\s+/) : undefined
    };
    
    const { links } = await this.browsingSessionService.followRelevantLinks(sessionId, options);
    
    // Sort by relevance and return top N
    return links
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, maxSuggestions);
  }
  
  /**
   * Extract related topics from visited pages
   */
  private extractRelatedTopics(pagesVisited: Array<{
    url: string;
    title: string;
    relevance: number;
    summary: string;
  }>): string[] {
    // This is a placeholder implementation
    // A real implementation would analyze content and extract common themes
    const topics = new Set<string>();
    
    pagesVisited.forEach(page => {
      // Extract keywords from title
      const titleWords = page.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      titleWords.forEach(word => topics.add(word));
    });
    
    return Array.from(topics).slice(0, 10);
  }
  
  /**
   * Generate a summary of a webpage
   */
  private generatePageSummary(content: EnhancedWebpageContent): string {
    // Simple implementation - use the first few sentences
    if (content.content) {
      const sentences = content.content.split(/(?<=[.!?])\s+/);
      const firstSentences = sentences.slice(0, 3).join(' ');
      
      return firstSentences + (sentences.length > 3 ? '...' : '');
    }
    
    return `Summary of ${content.title}`;
  }

  /**
   * Calculate relevance score for page content based on keywords
   */
  private calculateRelevanceScore(content: EnhancedWebpageContent, keywords: string[]): number {
    if (keywords.length === 0) return 0.7; // Default good score if no keywords
    
    const textToAnalyze = `${content.title} ${content.description} ${content.content || ''}`.toLowerCase();
    let score = 0;
    let totalKeywords = keywords.length;
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
      const matches = textToAnalyze.match(regex);
      
      if (matches) {
        // Score based on frequency and position
        let keywordScore = Math.min(matches.length * 0.1, 0.3); // Up to 0.3 for frequency
        
        // Bonus for title matches
        if (content.title.toLowerCase().includes(keywordLower)) {
          keywordScore += 0.2;
        }
        
        // Bonus for description matches
        if (content.description && content.description.toLowerCase().includes(keywordLower)) {
          keywordScore += 0.1;
        }
        
        score += keywordScore;
      }
    });
    
    // Normalize by number of keywords and cap at 1.0
    return Math.min(score / totalKeywords, 1.0);
  }

  /**
   * Calculate relevance score for individual links
   */
  private calculateLinkRelevance(link: ExtractedLink, keywords: string[], parentContent: EnhancedWebpageContent): number {
    if (keywords.length === 0) return 0.6; // Default score if no keywords
    
    const linkText = `${link.text} ${link.context || ''}`.toLowerCase();
    let score = 0;
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      
      // Direct text match
      if (linkText.includes(keywordLower)) {
        score += 0.3;
      }
      
      // URL keyword match
      if (link.url.toLowerCase().includes(keywordLower)) {
        score += 0.2;
      }
      
      // Context relevance
      if (link.context && link.context.toLowerCase().includes(keywordLower)) {
        score += 0.2;
      }
    });
    
    // Bonus for internal links (same domain)
    try {
      const linkDomain = new URL(link.url).hostname;
      const parentDomain = new URL(parentContent.url).hostname;
      if (linkDomain === parentDomain) {
        score += 0.1;
      }
    } catch {
      // Ignore URL parsing errors
    }
    
    // Penalty for very short link text (likely navigation)
    if (link.text.length < 5) {
      score *= 0.5;
    }
    
    // Bonus for longer, descriptive text
    if (link.text.length > 20) {
      score += 0.1;
    }
    
    return Math.min(score / keywords.length, 1.0);
  }
}