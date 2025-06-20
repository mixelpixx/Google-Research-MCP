/**
 * Navigation Handlers
 * 
 * Handlers for contextual navigation tools, including link following and browsing session management.
 */

import { v4 as uuidv4 } from 'uuid';
import { NavigationService } from '../services/navigation.service.js';
import { BrowsingSessionService } from '../services/browsing-session.service.js';

export class NavigationHandlers {
  private navigationService: NavigationService;
  private browsingSessionService: BrowsingSessionService;
  
  // Track active browsing sessions
  private activeSessions: Map<string, { id: string; topic?: string; lastActivity: Date }> = new Map();
  
  constructor(
    navigationService: NavigationService,
    browsingSessionService: BrowsingSessionService
  ) {
    this.navigationService = navigationService;
    this.browsingSessionService = browsingSessionService;
    
    // Set up periodic cleanup of expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 30 * 60 * 1000); // Every 30 minutes
  }
  
  /**
   * Handle contextual navigation requests
   */
  public async handleContextualNavigation(args: any): Promise<any> {
    const { url, keywords, depth, max_links, session_id, stay_on_domain } = args;
    
    // Validate required arguments
    if (!url) {
      throw new Error('Invalid arguments for contextual_navigation tool: url is required');
    }
    
    try {
      console.error(`Starting contextual navigation from ${url} with depth ${depth}`);
      
      // Validate depth (1-3)
      const validDepth = Math.max(1, Math.min(3, depth || 1));
      
      // Validate max links (1-5)
      const validMaxLinks = Math.max(1, Math.min(5, max_links || 3));
      
      // Use existing session or create a new one
      let sessionId = session_id;
      
      if (!sessionId || !this.activeSessions.has(sessionId)) {
        // Create a new session in the browsing session service
        const newSession = this.browsingSessionService.createSession(
          keywords?.join(', ')
        );
        
        sessionId = newSession.id;
        this.activeSessions.set(sessionId, {
          id: sessionId,
          topic: keywords?.join(', '),
          lastActivity: new Date()
        });
        console.error(`Created new browsing session: ${sessionId}`);
      } else {
        // Update last activity
        const session = this.activeSessions.get(sessionId)!;
        session.lastActivity = new Date();
        
        // Make sure the session also exists in the browsing session service
        const browsingSession = this.browsingSessionService.getSession(sessionId);
        if (!browsingSession) {
          // If session exists in our map but not in the service, create it
          this.browsingSessionService.createSession(
            keywords?.join(', ')
          );
        }
        
        console.error(`Using existing browsing session: ${sessionId}`);
      }
      
      // Call the navigation service
      const result = await this.navigationService.followLinks(sessionId, {
        url,
        keywords,
        maxLinksToFollow: validMaxLinks,
        depth: validDepth,
        stayOnDomain: stay_on_domain === true
      });
      
      // Format the response
      let responseText = `# Contextual Navigation Results\n\n`;
      responseText += `**Starting URL**: [${url}](${url})\n`;
      responseText += `**Session ID**: \`${sessionId}\` (can be used to continue this browsing session)\n`;
      responseText += `**Depth**: ${validDepth}\n`;
      responseText += `**Keywords**: ${keywords?.join(', ') || 'None'}\n\n`;
      
      responseText += `## Pages Visited\n\n`;
      
      result.pagesVisited.forEach((page, index) => {
        responseText += `### ${index + 1}. [${page.title}](${page.url})\n\n`;
        responseText += `**Relevance**: ${Math.round(page.relevance * 100)}%\n\n`;
        responseText += `${page.summary}\n\n`;
      });
      
      if (result.relatedTopics.length > 0) {
        responseText += `## Related Topics\n\n`;
        result.relatedTopics.forEach(topic => {
          responseText += `- ${topic}\n`;
        });
        responseText += `\n`;
      }
      
      responseText += `## Navigation Path\n\n`;
      result.navigationPath.forEach((url, index) => {
        const page = result.pagesVisited.find(p => p.url === url);
        responseText += `${index + 1}. ${page ? `[${page.title}](${url})` : url}\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        content: [
          {
            type: 'text',
            text: `Error during contextual navigation: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Clean up expired sessions (older than 2 hours)
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expireTime = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const elapsed = now.getTime() - session.lastActivity.getTime();
      if (elapsed > expireTime) {
        this.activeSessions.delete(sessionId);
        console.error(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }
  
  /**
   * Get all handlers as a map of tool name to handler function
   */
  public getHandlers(): Record<string, (args: any) => Promise<any>> {
    return {
      'contextual_navigation': this.handleContextualNavigation.bind(this)
    };
  }
}