/**
 * Content Handlers
 * 
 * Handlers for content extraction tools, including webpage extraction, summarization,
 * and structured content extraction.
 */

import { OutputFormat } from '../types.js';
import { ContentExtractor } from '../services/content-extractor.service.js';
import { EnhancedContentExtractor } from '../services/enhanced-content-extractor.service.js';

export class ContentHandlers {
  private contentExtractor: ContentExtractor;
  private enhancedContentExtractor: EnhancedContentExtractor;
  
  constructor(
    contentExtractor: ContentExtractor,
    enhancedContentExtractor: EnhancedContentExtractor
  ) {
    this.contentExtractor = contentExtractor;
    this.enhancedContentExtractor = enhancedContentExtractor;
  }
  
  /**
   * Handle basic webpage content extraction
   */
  public async handleAnalyzeWebpage(args: any): Promise<any> {
    const { url, format, full_content } = args;
    
    // Validate required arguments
    if (!url) {
      throw new Error('Invalid arguments for extract_webpage_content tool: url is required');
    }
    
    try {
      const content = await this.contentExtractor.extractContent(url, format);
      
      // Format the response based on whether full content is requested
      let responseText = `Content from: ${content.url}\n\n`;
      responseText += `Title: ${content.title}\n`;
      
      if (content.description) {
        responseText += `Description: ${content.description}\n`;
      }
      
      responseText += `\nStats: ${content.stats.word_count} words, ${content.stats.approximate_chars} characters\n\n`;
      
      // Add the summary if available
      if (content.summary) {
        responseText += `Summary: ${content.summary}\n\n`;
      }
      
      // Add either the full content or just a preview
      if (full_content) {
        responseText += `Full Content:\n\n${content.content}`;
      } else {
        responseText += `Content Preview:\n${content.content_preview.first_500_chars}\n\n`;
        responseText += `Note: This is a preview of the content. For the full content, use the extract_webpage_content tool with full_content set to true.`;
      }
      
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
      const helpText = 'Common issues:\n- Check if the URL is accessible in a browser\n- Ensure the webpage is public\n- Try again if it\'s a temporary network issue';
      
      return {
        content: [
          {
            type: 'text',
            text: `${errorMessage}\n\n${helpText}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Handle extraction of multiple webpages
   */
  public async handleExtractMultipleWebpages(args: any): Promise<any> {
    const { urls, format } = args;
    
    // Validate required arguments
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('Invalid arguments for extract_multiple_webpages tool: urls array is required');
    }
    
    try {
      // Limit to 5 URLs max for performance
      if (urls.length > 5) {
        return {
          content: [{
            type: 'text',
            text: 'Maximum 5 URLs allowed per extraction to maintain performance. Please reduce the number of URLs.'
          }],
          isError: true
        };
      }
      
      console.error(`Extracting content from ${urls.length} webpages...`);
      
      // Use the batch extraction method from ContentExtractor
      const contents = await this.contentExtractor.batchExtractContent(urls, format || 'markdown');
      
      // Format the results in a readable way
      let responseText = `# Content Extracted from ${urls.length} Webpages\n\n`;
      
      // Add each webpage's content with clear separation
      Object.entries(contents).forEach(([url, content], index) => {
        responseText += `## ${index + 1}. ${url}\n\n`;
        
        if ('error' in content) {
          responseText += `**Error**: ${content.error}\n\n`;
          return;
        }
        
        responseText += `**Title**: ${content.title}\n`;
        if (content.description) {
          responseText += `**Description**: ${content.description}\n`;
        }
        
        responseText += `**Word Count**: ${content.stats.word_count}\n\n`;
        
        // Add summary if available
        if (content.summary) {
          responseText += `### Summary\n\n${content.summary}\n\n`;
        }
        
        // Add content preview
        responseText += `### Content Preview\n\n${content.content_preview.first_500_chars}...\n\n`;
        
        // Add separator between pages
        if (index < Object.keys(contents).length - 1) {
          responseText += `---\n\n`;
        }
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
            text: `Error extracting content from multiple webpages: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Handle webpage summarization
   */
  public async handleSummarizeWebpage(args: any): Promise<any> {
    const { url, length, focus } = args;
    
    // Validate required arguments
    if (!url) {
      throw new Error('Invalid arguments for summarize_webpage tool: url is required');
    }
    
    try {
      console.error(`Summarizing webpage: ${url} with length: ${length || 'medium'}`);
      
      // Extract content from the webpage
      const content = await this.contentExtractor.extractContent(url, 'markdown');
      
      // Determine word count target based on requested length
      let wordCountTarget: number;
      switch (length?.toLowerCase() || 'medium') {
        case 'short':
          wordCountTarget = 250;
          break;
        case 'long':
          wordCountTarget = 1000;
          break;
        case 'medium':
        default:
          wordCountTarget = 500;
          break;
      }
      
      // Create a more focused summary than the basic one provided by the content extractor
      let summary = '';
      
      if (content.summary) {
        // Use existing summary as a starting point
        summary = content.summary;
      } else {
        // Extract first few paragraphs if no summary is available
        const paragraphs = content.content.split('\n\n').filter(p => p.length > 50);
        summary = paragraphs.slice(0, 3).join('\n\n');
      }
      
      // Format the response
      let responseText = `# Summary of [${content.title}](${url})\n\n`;
      
      // Add metadata
      responseText += `**Source**: ${url}\n`;
      responseText += `**Word Count**: ${content.stats.word_count} words in original content\n`;
      responseText += `**Summary Length**: ${length || 'medium'} (target: ~${wordCountTarget} words)\n`;
      
      if (focus) {
        responseText += `**Focus**: ${focus}\n`;
      }
      
      responseText += `\n## Summary\n\n${summary}\n\n`;
      
      // Add key points section (extracted from headings or prominent paragraphs)
      if (content.structure?.headings && content.structure.headings.length > 0) {
        responseText += `## Key Points\n\n`;
        content.structure.headings.slice(0, 5).forEach(heading => {
          responseText += `- ${heading}\n`;
        });
        responseText += '\n';
      }
      
      // Add a note about using extract_webpage_content for more details
      responseText += `\n---\n*For complete content, use the \`extract_webpage_content\` tool with the same URL.*`;
      
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
            text: `Error summarizing webpage: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Handle structured content extraction
   */
  public async handleStructuredContentExtraction(args: any): Promise<any> {
    const { url, format, preserve_tables, extract_images, analyze_links } = args;
    
    // Validate required arguments
    if (!url) {
      throw new Error('Invalid arguments for structured_content_extraction tool: url is required');
    }
    
    try {
      console.error(`Extracting structured content from ${url}`);
      
      // Extract enhanced content
      const content = await this.enhancedContentExtractor.extractEnhancedContent(
        url, 
        format || 'markdown' as OutputFormat
      );
      
      // Format the response
      let responseText = `# Structured Content: ${content.title}\n\n`;
      responseText += `**Source**: [${url}](${url})\n`;
      responseText += `**Extracted on**: ${new Date().toISOString()}\n\n`;
      
      // Add summary if available
      if (content.summary) {
        responseText += `## Summary\n\n${content.summary}\n\n`;
      }
      
      // Add main content
      responseText += `## Main Content\n\n${content.content}\n\n`;
      
      // Add tables if requested
      if (preserve_tables !== false && content.structuredData.tables.length > 0) {
        responseText += `## Tables\n\n`;
        
        content.structuredData.tables.forEach((table, index) => {
          responseText += `### Table ${index + 1}: ${table.caption || 'Untitled'}\n\n`;
          responseText += table.markdownRepresentation + '\n\n';
        });
      }
      
      // Add images if requested
      if (extract_images !== false && content.images.length > 0) {
        responseText += `## Images\n\n`;
        
        content.images.forEach((image, index) => {
          responseText += `### Image ${index + 1}\n\n`;
          responseText += `**URL**: ${image.url}\n`;
          responseText += `**Alt text**: ${image.alt || image.generatedAlt || 'No description available'}\n`;
          
          if (image.position.nearestHeading) {
            responseText += `**Section**: ${image.position.nearestHeading}\n`;
          }
          
          responseText += `**Context**: ${image.context}\n\n`;
        });
      }
      
      // Add links if requested
      if (analyze_links !== false && content.links.length > 0) {
        responseText += `## Links\n\n`;
        
        // Group links by relevance
        const topLinks = content.links.slice(0, 5);
        
        responseText += `### Top Links\n\n`;
        topLinks.forEach((link, index) => {
          responseText += `${index + 1}. [${link.text || link.url}](${link.url})\n`;
          responseText += `   Context: ${link.context.substring(0, 100)}...\n\n`;
        });
        
        responseText += `**Total Links**: ${content.links.length}\n\n`;
      }
      
      // Add source credibility if available
      if (content.sourceCredibility) {
        responseText += `## Source Credibility\n\n`;
        responseText += `**Credibility Score**: ${Math.round(content.sourceCredibility.score * 100)}%\n\n`;
        
        if (content.sourceCredibility.factors.length > 0) {
          responseText += `**Factors**:\n\n`;
          content.sourceCredibility.factors.forEach(factor => {
            responseText += `- ${factor}\n`;
          });
        }
      }
      
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
            text: `Error extracting structured content: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Get all handlers as a map of tool name to handler function
   */
  public getHandlers(): Record<string, (args: any) => Promise<any>> {
    return {
      'extract_webpage_content': this.handleAnalyzeWebpage.bind(this),
      'extract_multiple_webpages': this.handleExtractMultipleWebpages.bind(this),
      'summarize_webpage': this.handleSummarizeWebpage.bind(this),
      'structured_content_extraction': this.handleStructuredContentExtraction.bind(this)
    };
  }
}