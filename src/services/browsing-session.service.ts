import { v4 as uuidv4 } from 'uuid';
import {
  BrowsingSession,
  BrowsingHistoryPage,
  BrowsingPath,
  ExtractedLink,
  NavigationOptions,
  EnhancedWebpageContent
} from '../types/enhanced-types.js';
import { EnhancedContentExtractor } from './enhanced-content-extractor.service.js';
import { GoogleSearchService } from './google-search.service.js';

/**
 * BrowsingSessionService
 * 
 * Manages browsing sessions with context-aware navigation and history tracking.
 * This service maintains state across interactions, enabling a more natural browsing
 * experience that mimics how humans navigate the web.
 */
export class BrowsingSessionService {
  private sessions: Map<string, BrowsingSession> = new Map();
  private contentExtractor: EnhancedContentExtractor;
  private searchService: GoogleSearchService;
  
  // Session timeout (30 minutes)
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000;
  
  constructor(contentExtractor: EnhancedContentExtractor, searchService: GoogleSearchService) {
    this.contentExtractor = contentExtractor;
    this.searchService = searchService;
    
    // Set up periodic cleanup of expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
  }
  
  /**
   * Creates a new browsing session
   */
  public createSession(topic?: string): BrowsingSession {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: BrowsingSession = {
      id: sessionId,
      startTime: now,
      lastActivityTime: now,
      topic,
      history: [],
      bookmarks: [],
      sessionSummary: topic ? `Research session on "${topic}"` : "New browsing session",
      researchQuestions: []
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  /**
   * Gets an existing session by ID
   */
  public getSession(sessionId: string): BrowsingSession | undefined {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Update last activity time
      session.lastActivityTime = new Date();
      return session;
    }
    
    return undefined;
  }
  
  /**
   * Visits a URL and adds it to the session history
   */
  public async visitUrl(
    sessionId: string, 
    url: string, 
    parentUrl?: string
  ): Promise<EnhancedWebpageContent> {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Extract enhanced content from the URL
    const enhancedContent = await this.contentExtractor.extractEnhancedContent(url);
    
    // Create a history entry
    const historyEntry: BrowsingHistoryPage = {
      url,
      title: enhancedContent.title,
      visitTime: new Date(),
      summary: enhancedContent.summary || this.generatePageSummary(enhancedContent),
      keywords: this.extractKeywords(enhancedContent),
      parentUrl
    };
    
    // Add to history
    session.history.push(historyEntry);
    
    // Update current URL
    session.currentUrl = url;
    
    // Update session summary
    this.updateSessionSummary(session);
    
    return enhancedContent;
  }
  
  /**
   * Follows relevant links from the current page
   */
  public async followRelevantLinks(
    sessionId: string,
    options: NavigationOptions
  ): Promise<{
    links: ExtractedLink[];
    recommendedLinks: ExtractedLink[];
  }> {
    const session = this.getSession(sessionId);
    
    if (!session || !session.currentUrl) {
      throw new Error('No active browsing session or current URL');
    }
    
    try {
      // Get enhanced content of the current page which includes links
      const content = await this.contentExtractor.extractEnhancedContent(session.currentUrl);
      
      // Extract links from the enhanced content
      const extractedLinks = content.links || [];
      
      if (extractedLinks.length === 0) {
        console.error(`No links found for URL: ${session.currentUrl}`);
        return { links: [], recommendedLinks: [] };
      }
      
      // Score links for relevance
      const scoredLinks = this.scoreLinksRelevance(
        extractedLinks,
        session.topic || '',
        options
      );
      
      // Filter for recommended links based on relevance threshold
      const recommendedLinks = scoredLinks.filter(
        link => (link.relevanceScore || 0) >= options.relevanceThreshold
      );
      
      return {
        links: scoredLinks,
        recommendedLinks
      };
    } catch (error) {
      console.error(`Error following links from ${session.currentUrl}:`, error);
      return { links: [], recommendedLinks: [] };
    }
  }
  
  /**
   * Generates navigation paths between pages
   */
  public generateNavigationPaths(
    sessionId: string,
    startUrl: string,
    endUrl: string
  ): BrowsingPath[] {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Implementation will find all possible paths between two URLs
    // based on the browsing history
    const paths: BrowsingPath[] = [];
    
    // Get the browsing history as a graph
    const historyGraph = this.buildHistoryGraph(session);
    
    // Find paths between the two URLs
    // (This is a simplified placeholder - actual implementation would use graph traversal)
    paths.push({
      startUrl,
      endUrl,
      intermediateUrls: [],
      relevance: 1.0
    });
    
    return paths;
  }
  
  /**
   * Summarizes the current browsing session
   */
  public getSessionSummary(sessionId: string): string {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return session.sessionSummary;
  }
  
  /**
   * Adds a bookmark to the session
   */
  public addBookmark(sessionId: string, url: string): void {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    if (!session.bookmarks.includes(url)) {
      session.bookmarks.push(url);
    }
  }
  
  /**
   * Generates research questions based on the browsing history
   */
  public generateResearchQuestions(sessionId: string): string[] {
    const session = this.getSession(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // This is a placeholder - actual implementation would analyze 
    // content to identify gaps and generate questions
    const questions = [
      `What are the main aspects of ${session.topic}?`,
      `What are the recent developments in ${session.topic}?`,
      `What are the challenges related to ${session.topic}?`
    ];
    
    session.researchQuestions = questions;
    return questions;
  }
  
  /**
   * Cleans up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date().getTime();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivity = session.lastActivityTime.getTime();
      
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }
  
  /**
   * Updates the session summary based on browsing history
   */
  private updateSessionSummary(session: BrowsingSession): void {
    if (session.history.length === 0) {
      return;
    }
    
    // Generate a summary based on the browsing history
    let summary = `Research session`;
    
    if (session.topic) {
      summary += ` on "${session.topic}"`;
    }
    
    summary += ` has explored ${session.history.length} pages.\n\n`;
    
    // Add key pages visited
    if (session.history.length > 0) {
      summary += `Key pages visited:\n`;
      
      // Get the last 5 pages visited
      const recentPages = session.history.slice(-5);
      
      recentPages.forEach(page => {
        summary += `- ${page.title} (${page.url})\n`;
      });
    }
    
    session.sessionSummary = summary;
  }
  
  
  /**
   * Extracts links from enhanced webpage content
   */
  private extractLinksFromContent(content: EnhancedWebpageContent): ExtractedLink[] {
    return content.links || [];
  }
  
  /**
   * Scores links for relevance to the topic
   */
  private scoreLinksRelevance(
    links: ExtractedLink[],
    topic: string,
    options: NavigationOptions
  ): ExtractedLink[] {
    if (links.length === 0) {
      return [];
    }
    
    return links.map(link => {
      // Initialize with medium relevance
      let relevanceScore = 0.5;
      
      // If we have keywords to filter by, check if they appear in the link text or context
      if (options.filterByKeywords && options.filterByKeywords.length > 0) {
        const combinedText = (link.text + ' ' + link.context).toLowerCase();
        
        // Calculate how many keywords match
        const matchCount = options.filterByKeywords.filter(keyword =>
          combinedText.includes(keyword.toLowerCase())
        ).length;
        
        // Adjust score based on keyword matches
        if (matchCount > 0) {
          relevanceScore = Math.min(0.9, 0.5 + (matchCount / options.filterByKeywords.length) * 0.4);
        } else {
          relevanceScore = 0.3;
        }
      }
      
      // Check domain restrictions
      if (options.includeDomains && options.includeDomains.length > 0) {
        const linkDomain = new URL(link.url).hostname;
        const domainMatch = options.includeDomains.some(domain => linkDomain.includes(domain));
        
        if (!domainMatch) {
          relevanceScore *= 0.5; // Reduce score if not in included domains
        }
      }
      
      if (options.excludeDomains && options.excludeDomains.length > 0) {
        const linkDomain = new URL(link.url).hostname;
        const domainMatch = options.excludeDomains.some(domain => linkDomain.includes(domain));
        
        if (domainMatch) {
          relevanceScore = 0.1; // Significantly reduce score if in excluded domains
        }
      }
      
      // Determine if relevant based on threshold
      const isRelevant = relevanceScore >= options.relevanceThreshold;
      
      return {
        ...link,
        relevanceScore,
        isRelevant
      };
    });
  }
  
  /**
   * Builds a graph of the browsing history
   * This is a placeholder implementation
   */
  private buildHistoryGraph(session: BrowsingSession): any {
    // This would build a graph representation of the browsing history
    return {};
  }
  
  /**
   * Generates a summary of a webpage
   */
  private generatePageSummary(content: EnhancedWebpageContent): string {
    if (content.content) {
      const sentences = content.content.split(/(?<=[.!?])\s+/);
      const firstSentences = sentences.slice(0, 2).join(' ');
      return firstSentences + (sentences.length > 2 ? '...' : '');
    }
    return `Summary of ${content.title}`;
  }
  
  /**
   * Extracts keywords from webpage content
   */
  private extractKeywords(content: EnhancedWebpageContent): string[] {
    const keywords = new Set<string>();
    
    // Extract from title
    if (content.title) {
      const titleWords = content.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      titleWords.forEach(word => keywords.add(word));
    }
    
    // Extract from description
    if (content.description) {
      const descWords = content.description
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4);
      descWords.slice(0, 5).forEach(word => keywords.add(word));
    }
    
    return Array.from(keywords).slice(0, 10);
  }
}