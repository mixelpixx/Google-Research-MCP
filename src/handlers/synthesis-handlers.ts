/**
 * Synthesis Handlers
 * 
 * Handlers for research and synthesis tools, including topic research,
 * content synthesis, and enhanced synthesis with multi-source analysis.
 */

import { ResearchEnhancer } from '../services/research-enhancer.service.js';
import { ContentExtractor } from '../services/content-extractor.service.js';
import { EnhancedContentExtractor } from '../services/enhanced-content-extractor.service.js';
import { GoogleSearchService } from '../services/google-search.service.js';
import { MultiSourceSynthesizer } from '../services/multi-source-synthesizer.service.js';
import { OutputFormat } from '../types.js';
import { EnhancedWebpageContent } from '../types/enhanced-types.js';

export class SynthesisHandlers {
  private researchEnhancer: ResearchEnhancer;
  private contentExtractor: ContentExtractor;
  private enhancedContentExtractor: EnhancedContentExtractor;
  private searchService: GoogleSearchService;
  private multiSourceSynthesizer: MultiSourceSynthesizer;
  
  constructor(
    researchEnhancer: ResearchEnhancer,
    contentExtractor: ContentExtractor,
    enhancedContentExtractor: EnhancedContentExtractor,
    searchService: GoogleSearchService,
    multiSourceSynthesizer: MultiSourceSynthesizer
  ) {
    this.researchEnhancer = researchEnhancer;
    this.contentExtractor = contentExtractor;
    this.enhancedContentExtractor = enhancedContentExtractor;
    this.searchService = searchService;
    this.multiSourceSynthesizer = multiSourceSynthesizer;
  }
  
  /**
   * Handle research topic requests
   */
  public async handleResearchTopic(args: any): Promise<any> {
    const { topic, depth, focus_areas, num_sources } = args;
    
    // Validate required arguments
    if (!topic) {
      throw new Error('Invalid arguments for research_topic tool: topic is required');
    }
    
    try {
      // Set max sources and validate
      const maxSources = Math.min(Math.max(num_sources || 5, 3), 10);
      
      console.error(`Researching topic: "${topic}" with depth: ${depth || 'intermediate'}, max sources: ${maxSources}`);
      
      // Step 1: Perform multiple searches to gather diverse information
      // Use different query variations to get better coverage
      const searchQueries = [topic];
      
      // Add depth-specific queries
      if (depth === 'advanced') {
        searchQueries.push(`${topic} research`, `${topic} detailed analysis`);
      } else if (depth === 'basic') {
        searchQueries.push(`${topic} overview`, `${topic} introduction`);
      } else {
        // Default to intermediate
        searchQueries.push(`${topic} explanation`, `${topic} guide`);
      }
      
      // Add focus areas to queries if provided
      if (focus_areas && focus_areas.length > 0) {
        focus_areas.forEach((area: string) => {
          searchQueries.push(`${topic} ${area}`);
        });
      }
      
      // Execute all searches in parallel with source distribution
      const searchesPerQuery = Math.ceil(maxSources / searchQueries.length) + 1; // +1 for redundancy
      console.error(`Executing ${searchQueries.length} search queries with ${searchesPerQuery} results each`);
      
      const searchResults = await Promise.all(
        searchQueries.map(query => this.searchService.search(query, searchesPerQuery))
      );
      
      // Combine and deduplicate results
      let allResults: Array<{title: string; link: string; snippet: string}> = [];
      searchResults.forEach(result => {
        allResults = [...allResults, ...result.results];
      });
      
      // Filter out duplicate URLs and take top N results
      const uniqueUrls = new Set<string>();
      const filteredResults = allResults
        .filter(result => {
          if (uniqueUrls.has(result.link)) return false;
          uniqueUrls.add(result.link);
          return true;
        })
        .slice(0, maxSources);
      
      if (filteredResults.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No results found for "${topic}". Try using different keywords or a more general topic.`
          }],
          isError: true
        };
      }

      console.error(`Found ${filteredResults.length} unique sources for research`);
      
      // Step 2: Extract enhanced content from the sources
      const urls = filteredResults.map(result => result.link);
      console.error(`Extracting enhanced content from ${urls.length} sources...`);
      
      // Use enhanced content extractor for better data
      const contentPromises = urls.map(url =>
        this.enhancedContentExtractor.extractEnhancedContent(url, 'markdown')
          .catch(error => ({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }))
      );
      
      const enhancedContents = await Promise.all(contentPromises);
      
      // Filter out failed extractions
      const validContents = enhancedContents.filter((content): content is EnhancedWebpageContent =>
        !('error' in content)
      );
      
      if (validContents.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Could not extract valid content from any sources for "${topic}". Please try a different topic or keywords.`
          }],
          isError: true
        };
      }
      
      console.error(`Successfully extracted content from ${validContents.length}/${urls.length} sources`);
      
      // Step 3: Use the research enhancer to create a structured research document
      console.error(`Generating research document for "${topic}"`);
      const researchDocument = await this.researchEnhancer.createResearchDocument({
        topic,
        depth: depth || 'intermediate',
        focus_areas,
        sources: enhancedContents.map((content, index) => {
          if ('error' in content) {
            return {
              url: urls[index],
              error: content.error
            };
          }
          return {
            url: content.url,
            title: content.title,
            content: content.content,
            summary: content.summary || ''
          };
        })
      });
      
      return {
        content: [
          {
            type: 'text',
            text: researchDocument,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        content: [
          {
            type: 'text',
            text: `Error researching "${topic}": ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Handle content synthesis requests
   */
  public async handleSynthesizeContent(args: any): Promise<any> {
    const { urls, focus, structure } = args;
    
    // Validate required arguments
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('Invalid arguments for synthesize_content tool: urls array is required');
    }
    
    if (urls.length > 10) {
      return {
        content: [{
          type: 'text',
          text: 'Maximum 10 URLs allowed per synthesis to maintain quality. Please reduce the number of URLs.'
        }],
        isError: true
      };
    }

    try {
      console.error(`Synthesizing content from ${urls.length} sources using ${structure || 'thematic'} structure`);
      
      // Extract enhanced content from all URLs to get better data for synthesis
      console.error('Extracting enhanced content from provided URLs...');
      
      // Use enhanced content extractor for better structure preservation
      const contentPromises = urls.map(url =>
        this.enhancedContentExtractor.extractEnhancedContent(url, 'markdown')
          .catch(error => ({
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }))
      );
      
      const enhancedContents = await Promise.all(contentPromises);
      
      // Filter out failed extractions
      const validContents = enhancedContents.filter((content): content is EnhancedWebpageContent =>
        !('error' in content)
      );
      
      if (validContents.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Could not extract valid content from any of the provided URLs. Please check the URLs and try again.'
          }],
          isError: true
        };
      }
      
      console.error(`Successfully extracted content from ${validContents.length}/${urls.length} sources`);
      
      // Use the multi-source synthesizer instead of research enhancer
      // This leverages the more advanced synthesis capabilities
      console.error(`Generating synthesized content with focus: "${focus || 'general'}"`);
      
      const result = await this.multiSourceSynthesizer.synthesize({
        sources: validContents,
        focus,
        structure: structure || 'thematic',
        compareBy: [],
        detectContradictions: true,
        includeSourceCredibility: true,
        visualizeRelationships: true
      });
      
      const synthesizedContent = result.document;
      
      return {
        content: [
          {
            type: 'text',
            text: synthesizedContent,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        content: [
          {
            type: 'text',
            text: `Error synthesizing content: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  /**
   * Handle enhanced synthesis requests
   */
  public async handleEnhancedSynthesis(args: any): Promise<any> {
    const { urls, focus, structure, detect_contradictions, assess_credibility, compare_by } = args;
    
    // Validate required arguments
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new Error('Invalid arguments for enhanced_synthesis tool: urls array is required');
    }
    
    try {
      console.error(`Performing enhanced synthesis of ${urls.length} sources`);
      
      if (urls.length > 10) {
        return {
          content: [{
            type: 'text',
            text: 'Maximum 10 URLs allowed per synthesis to maintain quality. Please reduce the number of URLs.'
          }],
          isError: true
        };
      }
      
      // Extract enhanced content from all URLs
      const contentPromises = urls.map(url =>
        this.enhancedContentExtractor.extractEnhancedContent(url, 'markdown')
          .catch(error => ({
            url,
            title: url,
            content: '',
            format: 'markdown' as OutputFormat,
            description: '',
            meta_tags: {},
            stats: { word_count: 0, approximate_chars: 0 },
            content_preview: { first_500_chars: '' },
            links: [],
            images: [],
            structuredData: {
              tables: [],
              lists: [],
              hierarchies: [],
              keyValuePairs: []
            },
            error: error instanceof Error ? error.message : 'Unknown error'
          }))
      );
      
      const sources = await Promise.all(contentPromises);
      
      // Filter out failed extractions
      const validSources = sources.filter((source): source is EnhancedWebpageContent =>
        !('error' in source)
      );
      
      if (validSources.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Could not extract valid content from any of the provided URLs. Please check the URLs and try again.'
          }],
          isError: true
        };
      }
      
      // Perform enhanced synthesis
      const result = await this.multiSourceSynthesizer.synthesize({
        sources: validSources,
        focus,
        structure: structure || 'thematic',
        compareBy: compare_by,
        detectContradictions: detect_contradictions !== false,
        includeSourceCredibility: assess_credibility !== false,
        visualizeRelationships: true
      });
      
      return {
        content: [
          {
            type: 'text',
            text: result.document,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return {
        content: [
          {
            type: 'text',
            text: `Error performing enhanced synthesis: ${errorMessage}`,
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
      'research_topic': this.handleResearchTopic.bind(this),
      'synthesize_content': this.handleSynthesizeContent.bind(this),
      'enhanced_synthesis': this.handleEnhancedSynthesis.bind(this)
    };
  }
}