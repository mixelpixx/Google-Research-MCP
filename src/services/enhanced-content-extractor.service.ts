import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { ContentExtractor } from './content-extractor.service.js';
import { 
  EnhancedWebpageContent,
  ExtractedLink,
  ExtractedImage,
  TableData,
  ListData,
  HierarchyData,
  KeyValuePair,
  StructuredData,
  HierarchyNode
} from '../types/enhanced-types.js';
import { WebpageContent, OutputFormat } from '../types.js';

/**
 * EnhancedContentExtractor
 * 
 * Extends the ContentExtractor to provide:
 * 1. Structured data preservation (tables, lists, hierarchies)
 * 2. Visual context integration (image descriptions)
 * 3. Link extraction and analysis
 * 4. Source credibility assessment
 */
export class EnhancedContentExtractor extends ContentExtractor {
  constructor() {
    super();
  }
  
  /**
   * Extract enhanced content from a webpage
   */
  async extractEnhancedContent(url: string, format: OutputFormat = 'markdown'): Promise<EnhancedWebpageContent> {
    // First get the base content using the parent class
    const baseContent = await super.extractContent(url, format);
    
    // Now enhance it with additional information
    return await this.enhanceContent(baseContent, url);
  }
  
  /**
   * Batch extract enhanced content from multiple webpages
   */
  async batchExtractEnhancedContent(
    urls: string[], 
    format: OutputFormat = 'markdown'
  ): Promise<Record<string, EnhancedWebpageContent | { error: string }>> {
    const results: Record<string, EnhancedWebpageContent | { error: string }> = {};
    
    await Promise.all(
      urls.map(async (url) => {
        try {
          results[url] = await this.extractEnhancedContent(url, format);
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
   * Enhance content with additional information
   */
  private async enhanceContent(baseContent: WebpageContent, url: string): Promise<EnhancedWebpageContent> {
    try {
      // Fetch the raw HTML again to parse for structured data
      const response = await fetch(url);
      const html = await response.text();
      
      // Parse the HTML
      const $ = cheerio.load(html);
      const dom = new JSDOM(html);
      
      // Extract structured data
      const structuredData = this.extractStructuredData($, dom);
      
      // Extract links
      const links = this.extractLinks($, url);
      
      // Extract images with context
      const images = this.extractImages($);
      
      // Assess source credibility
      const sourceCredibility = this.assessSourceCredibility(baseContent, url, $);
      
      // Create enhanced content
      const enhancedContent: EnhancedWebpageContent = {
        ...baseContent,
        links,
        images,
        structuredData,
        lastVisited: new Date(),
        sourceCredibility
      };
      
      return enhancedContent;
    } catch (error) {
      console.error(`Error enhancing content for ${url}:`, error);
      
      // If enhancement fails, return the base content with empty enhancements
      const fallbackContent: EnhancedWebpageContent = {
        ...baseContent,
        links: [],
        images: [],
        structuredData: {
          tables: [],
          lists: [],
          hierarchies: [],
          keyValuePairs: []
        },
        lastVisited: new Date()
      };
      
      return fallbackContent;
    }
  }
  
  /**
   * Extract structured data from HTML
   */
  private extractStructuredData($: any, dom: JSDOM): StructuredData {
    return {
      tables: this.extractTables($),
      lists: this.extractLists($),
      hierarchies: this.extractHierarchies($),
      keyValuePairs: this.extractKeyValuePairs($)
    };
  }
  
  /**
   * Extract tables from HTML
   */
  private extractTables($: any): TableData[] {
    const tables: TableData[] = [];
    
    $('table').each((index: number, element: any) => {
      try {
        const $table = $(element);
        const id = `table-${index}`;
        const caption = $table.find('caption').text().trim();
        
        // Get context (text before the table)
        const prevText = $table.prev().text().trim();
        
        // Extract headers
        const headers: string[] = [];
        $table.find('thead tr th, tr th').each((_: number, headerCell: any) => {
          headers.push($(headerCell).text().trim());
        });
        
        // Extract rows
        const rows: string[][] = [];
        $table.find('tbody tr, tr').each((_: number, row: any) => {
          const rowData: string[] = [];
          
          // Skip header rows
          if ($(row).find('th').length === 0 || rows.length > 0) {
            $(row).find('td').each((_: number, cell: any) => {
              rowData.push($(cell).text().trim());
            });
            
            if (rowData.length > 0) {
              rows.push(rowData);
            }
          }
        });
        
        // Create markdown representation
        let markdownTable = '';
        
        if (caption) {
          markdownTable += `**${caption}**\n\n`;
        }
        
        // Add headers
        if (headers.length > 0) {
          markdownTable += '| ' + headers.join(' | ') + ' |\n';
          markdownTable += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
        }
        
        // Add rows
        rows.forEach(row => {
          markdownTable += '| ' + row.join(' | ') + ' |\n';
        });
        
        tables.push({
          id,
          caption,
          context: prevText,
          headers,
          rows,
          markdownRepresentation: markdownTable
        });
      } catch (error) {
        console.error('Error extracting table:', error);
      }
    });
    
    return tables;
  }
  
  /**
   * Extract lists from HTML
   */
  private extractLists($: any): ListData[] {
    const lists: ListData[] = [];
    
    $('ul, ol, dl').each((index: number, element: any) => {
      try {
        const $list = $(element);
        const id = `list-${index}`;
        
        // Determine list type
        let type: 'ordered' | 'unordered' | 'definition';
        if ($list.is('ol')) {
          type = 'ordered';
        } else if ($list.is('ul')) {
          type = 'unordered';
        } else {
          type = 'definition';
        }
        
        // Extract items
        const items: string[] = [];
        
        if (type === 'definition') {
          // Handle definition lists
          $list.find('dt').each((_: number, dt: any) => {
            const term = $(dt).text().trim();
            const definition = $(dt).next('dd').text().trim();
            items.push(`**${term}**: ${definition}`);
          });
        } else {
          // Handle ordered and unordered lists
          $list.find('li').each((_: number, li: any) => {
            // Skip nested list items
            if ($(li).parents('li').length === 0) {
              items.push($(li).text().trim());
            }
          });
        }
        
        // Create markdown representation
        let markdownList = '';
        
        items.forEach((item, idx) => {
          if (type === 'ordered') {
            markdownList += `${idx + 1}. ${item}\n`;
          } else {
            markdownList += `- ${item}\n`;
          }
        });
        
        lists.push({
          id,
          type,
          items,
          markdownRepresentation: markdownList
        });
      } catch (error) {
        console.error('Error extracting list:', error);
      }
    });
    
    return lists;
  }
  
  /**
   * Extract hierarchical structures from HTML
   */
  private extractHierarchies($: any): HierarchyData[] {
    const hierarchies: HierarchyData[] = [];
    
    // Look for common hierarchy patterns (nested navs, menus, etc.)
    $('nav, .menu, .tree, .hierarchy').each((index: number, element: any) => {
      try {
        const $hierarchy = $(element);
        const id = `hierarchy-${index}`;
        
        // Try to determine the type
        let type = 'menu';
        if ($hierarchy.is('nav')) {
          type = 'navigation';
        } else if ($hierarchy.attr('class')?.includes('tree')) {
          type = 'tree';
        }
        
        // Extract nodes
        const nodes = this.extractHierarchyNodes($, $hierarchy);
        
        // Create markdown representation
        const markdownHierarchy = this.hierarchyToMarkdown(nodes);
        
        hierarchies.push({
          id,
          type,
          nodes,
          markdownRepresentation: markdownHierarchy
        });
      } catch (error) {
        console.error('Error extracting hierarchy:', error);
      }
    });
    
    return hierarchies;
  }
  
  /**
   * Extract key-value pairs from HTML
   */
  private extractKeyValuePairs($: any): KeyValuePair[] {
    const keyValuePairs: KeyValuePair[] = [];
    
    // Look for definition lists
    $('dl').each((_: number, dl: any) => {
      let currentKey = '';
      
      $(dl).children().each((_: number, child: any) => {
        if ($(child).is('dt')) {
          currentKey = $(child).text().trim();
        } else if ($(child).is('dd') && currentKey) {
          keyValuePairs.push({
            key: currentKey,
            value: $(child).text().trim()
          });
        }
      });
    });
    
    // Look for meta tags
    $('meta').each((_: number, meta: any) => {
      const name = $(meta).attr('name') || $(meta).attr('property');
      const content = $(meta).attr('content');
      
      if (name && content) {
        keyValuePairs.push({
          key: name,
          value: content
        });
      }
    });
    
    return keyValuePairs;
  }
  
  /**
   * Extract links from HTML
   */
  private extractLinks($: any, baseUrl: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    
    $('a[href]').each((_: number, element: any) => {
      try {
        const $link = $(element);
        const href = $link.attr('href');
        
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
          return;
        }
        
        // Resolve relative URLs
        const url = new URL(href, baseUrl).toString();
        const text = $link.text().trim();
        
        // Get surrounding context
        let context = '';
        const parent = $link.parent();
        
        if (parent.length > 0) {
          // Get the nearest paragraph or section
          const container = parent.closest('p, section, div, li');
          
          if (container.length > 0) {
            context = container.text().trim();
            
            // Truncate if too long
            if (context.length > 300) {
              context = context.substring(0, 300) + '...';
            }
          } else {
            // If no container found, use the parent text
            context = parent.text().trim();
          }
        }
        
        links.push({
          url,
          text,
          context
        });
      } catch (error) {
        console.error('Error extracting link:', error);
      }
    });
    
    return links;
  }
  
  /**
   * Extract images with context
   */
  private extractImages($: any): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    
    $('img').each((_: number, element: any) => {
      try {
        const $img = $(element);
        const src = $img.attr('src');
        
        if (!src) {
          return;
        }
        
        const alt = $img.attr('alt') || '';
        const width = parseInt($img.attr('width') || '0', 10) || undefined;
        const height = parseInt($img.attr('height') || '0', 10) || undefined;
        
        // Generate description based on context
        let generatedAlt = '';
        if (!alt) {
          const parent = $img.parent();
          
          // Check for caption
          const figcaption = parent.find('figcaption').text().trim();
          
          if (figcaption) {
            generatedAlt = `Image with caption: ${figcaption}`;
          } else {
            // Look for nearby text
            const nearbyText = parent.text().trim();
            
            if (nearbyText) {
              generatedAlt = `Image related to: ${nearbyText.substring(0, 100)}`;
            } else {
              generatedAlt = 'Image without description';
            }
          }
        }
        
        // Get context
        let context = '';
        const parent = $img.parent();
        
        if (parent.length > 0) {
          // Get the nearest paragraph or section
          const container = parent.closest('p, section, div, figure');
          
          if (container.length > 0) {
            context = container.text().trim();
            
            // Truncate if too long
            if (context.length > 300) {
              context = context.substring(0, 300) + '...';
            }
          }
        }
        
        // Find nearest heading
        let nearestHeading = '';
        let currentElement = $img;
        
        while (currentElement.length > 0 && !nearestHeading) {
          const prevHeading = currentElement.prev('h1, h2, h3, h4, h5, h6');
          
          if (prevHeading.length > 0) {
            nearestHeading = prevHeading.text().trim();
            break;
          }
          
          currentElement = currentElement.parent();
        }
        
        images.push({
          url: src,
          alt,
          generatedAlt: generatedAlt || undefined,
          context: context || 'No context available',
          dimensions: {
            width,
            height
          },
          position: {
            nearestHeading,
            sectionContext: nearestHeading
          }
        });
      } catch (error) {
        console.error('Error extracting image:', error);
      }
    });
    
    return images;
  }
  
  /**
   * Assess source credibility
   */
  private assessSourceCredibility(
    content: WebpageContent, 
    url: string, 
    $: any
  ): { score: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0.5; // Default neutral score
    
    // Check for https
    if (url.startsWith('https://')) {
      score += 0.05;
      factors.push('Secure connection (HTTPS)');
    }
    
    // Check domain reputation
    const domain = new URL(url).hostname;
    const educationalDomain = domain.endsWith('.edu') || domain.endsWith('.gov');
    const newsDomain = domain.includes('news') || 
      ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com'].some(d => domain.includes(d));
    
    if (educationalDomain) {
      score += 0.1;
      factors.push('Educational or government domain');
    } else if (newsDomain) {
      score += 0.05;
      factors.push('Established news source');
    }
    
    // Check for author information
    const hasAuthor = $('*[rel="author"], .author, .byline').length > 0 || 
      content.meta_tags['author'] || 
      content.meta_tags['article:author'];
    
    if (hasAuthor) {
      score += 0.1;
      factors.push('Author information present');
    }
    
    // Check for publication date
    const hasDate = content.meta_tags['article:published_time'] || 
      $('time, .date, .published').length > 0;
    
    if (hasDate) {
      score += 0.05;
      factors.push('Publication date present');
    }
    
    // Check for citations or references
    const hasCitations = $('cite, .citation, .reference, .footnote').length > 0;
    
    if (hasCitations) {
      score += 0.1;
      factors.push('Citations or references present');
    }
    
    // Check for contact information
    const hasContact = $('*[itemprop="email"], .contact, .email').length > 0;
    
    if (hasContact) {
      score += 0.05;
      factors.push('Contact information present');
    }
    
    // Cap score between 0 and 1
    score = Math.max(0, Math.min(1, score));
    
    return {
      score,
      factors
    };
  }
  
  /**
   * Extract hierarchy nodes recursively
   */
  private extractHierarchyNodes($: any, element: any, level: number = 0): HierarchyNode[] {
    const nodes: HierarchyNode[] = [];
    
    element.children().each((index: number, child: any) => {
      const $child = $(child);
      
      // Skip empty text nodes
      if (child.type === 'text' && !$child.text().trim()) {
        return;
      }
      
      const node: HierarchyNode = {
        id: `node-${level}-${index}`,
        text: $child.text().trim(),
        level,
        children: []
      };
      
      // Recursively extract children
      if ($child.children().length > 0) {
        node.children = this.extractHierarchyNodes($, $child, level + 1);
      }
      
      nodes.push(node);
    });
    
    return nodes;
  }
  
  /**
   * Convert hierarchy to markdown
   */
  private hierarchyToMarkdown(nodes: HierarchyNode[], level: number = 0): string {
    let markdown = '';
    
    nodes.forEach(node => {
      const indent = '  '.repeat(level);
      markdown += `${indent}- ${node.text}\n`;
      
      if (node.children && node.children.length > 0) {
        markdown += this.hierarchyToMarkdown(node.children, level + 1);
      }
    });
    
    return markdown;
  }
}