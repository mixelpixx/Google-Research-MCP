import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { GoogleSearchService } from './services/google-search.service.js';
import { ContentExtractor } from './services/content-extractor.service.js';
import { OutputFormat } from './types.js';
import { ResearchEnhancer } from './services/research-enhancer.service.js';

class GoogleResearchServer {
  private server: Server;
  private searchService: GoogleSearchService;
  private contentExtractor: ContentExtractor;
  private researchEnhancer: ResearchEnhancer;

  constructor() {
    this.searchService = new GoogleSearchService();
    this.contentExtractor = new ContentExtractor();
    this.researchEnhancer = new ResearchEnhancer();
    
    this.server = new Server(
      {
        name: 'google-research',
        version: '1.0.0'
      },
      {
      capabilities: {
        tools: {
          google_search: {
            description: 'Search Google and return relevant results from the web. This tool finds web pages, articles, and information on specific topics using Google\'s search engine. Results include titles, snippets, and URLs that can be analyzed further using extract_webpage_content.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { 
                  type: 'string', 
                  description: 'Search query - be specific and use quotes for exact matches. For best results, use clear keywords and avoid very long queries.'
                },
                num_results: { 
                  type: 'number', 
                  description: 'Number of results to return (default: 5, max: 10). Increase for broader coverage, decrease for faster response.'
                },
                site: {
                  type: 'string',
                  description: 'Limit search results to a specific website domain (e.g., "wikipedia.org" or "nytimes.com").'
                },
                language: {
                  type: 'string',
                  description: 'Filter results by language using ISO 639-1 codes (e.g., "en" for English, "es" for Spanish, "fr" for French).'
                },
                dateRestrict: {
                  type: 'string',
                  description: 'Filter results by date using Google\'s date restriction format: "d[number]" for past days, "w[number]" for past weeks, "m[number]" for past months, or "y[number]" for past years. Example: "m6" for results from the past 6 months.'
                },
                exactTerms: {
                  type: 'string',
                  description: 'Search for results that contain this exact phrase. This is equivalent to putting the terms in quotes in the search query.'
                },
                resultType: {
                  type: 'string',
                  description: 'Specify the type of results to return. Options include "image" (or "images"), "news", and "video" (or "videos"). Default is general web results.'
                },
                page: {
                  type: 'number',
                  description: 'Page number for paginated results (starts at 1). Use in combination with resultsPerPage to navigate through large result sets.'
                },
                resultsPerPage: {
                  type: 'number',
                  description: 'Number of results to show per page (default: 5, max: 10). Controls how many results are returned for each page.'
                },
                sort: {
                  type: 'string',
                  description: 'Sorting method for search results. Options: "relevance" (default) or "date" (most recent first).'
                }
              },
              required: ['query']
            }
          },
          extract_webpage_content: {
            description: 'Extract and analyze content from a webpage, converting it to readable text. This tool fetches the main content while removing ads, navigation elements, and other clutter. Use it to get detailed information from specific pages found via google_search.',
            inputSchema: {
              type: 'object',
              properties: {
                url: { 
                  type: 'string', 
                  description: 'Full URL of the webpage to extract content from (must start with http:// or https://). Ensure the URL is from a public webpage and not behind authentication.'
                },
                format: {
                  type: 'string',
                  description: 'Output format for the extracted content. Options: "markdown" (default), "html", or "text".'
                },
                full_content: {
                  type: 'boolean',
                  description: 'Whether to return the full content of the webpage (true) or just a preview (false). Default is false.'
                }
              },
              required: ['url']
            }
          },
          research_topic: {
            description: 'Deeply research a topic by searching for relevant information, extracting content from multiple sources, and organizing it into a comprehensive markdown document. This tool helps develop a thorough understanding of complex or unfamiliar topics.',
            inputSchema: {
              type: 'object',
              properties: {
                topic: { 
                  type: 'string', 
                  description: 'The topic to research. Be specific to get the most relevant results.'
                },
                depth: {
                  type: 'string',
                  description: 'The level of depth for the research: "basic" (overview), "intermediate" (detailed), or "advanced" (comprehensive). Default is "intermediate".'
                },
                focus_areas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific aspects of the topic to focus on. For example, for "quantum computing" you might specify ["applications", "limitations", "recent advances"].'
                },
                num_sources: {
                  type: 'number',
                  description: 'Maximum number of sources to include in the research (default: 5, max: 10).'
                }
              },
              required: ['topic']
            }
          },
          synthesize_content: {
            description: 'Synthesize content from multiple webpages into a cohesive, structured document. This tool extracts relevant information from multiple sources, identifies common themes and contradictions, and organizes the information into a well-structured format.',
            inputSchema: {
              type: 'object',
              properties: {
                urls: { 
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of webpage URLs to extract and synthesize content from. Each URL must be public and start with http:// or https://.'
                },
                focus: {
                  type: 'string',
                  description: 'A specific aspect or question to focus on when synthesizing the content. This helps filter out irrelevant information.'
                },
                structure: {
                  type: 'string',
                  description: 'The structure to use for the synthesized content: "chronological", "thematic", "compare_contrast", or "question_answer". Default is "thematic".'
                }
              },
              required: ['urls']
            }
          }
        }
      }
    });

    // Register tool list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'google_search',
          description: 'Search Google and return relevant results from the web. This tool finds web pages, articles, and information on specific topics using Google\'s search engine. Results include titles, snippets, and URLs that can be analyzed further using extract_webpage_content.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { 
                type: 'string', 
                description: 'Search query - be specific and use quotes for exact matches. For best results, use clear keywords and avoid very long queries.'
              },
              num_results: { 
                type: 'number', 
                description: 'Number of results to return (default: 5, max: 10). Increase for broader coverage, decrease for faster response.'
              },
              site: {
                type: 'string',
                description: 'Limit search results to a specific website domain (e.g., "wikipedia.org" or "nytimes.com").'
              },
              language: {
                type: 'string',
                description: 'Filter results by language using ISO 639-1 codes (e.g., "en" for English, "es" for Spanish, "fr" for French).'
              },
              dateRestrict: {
                type: 'string',
                description: 'Filter results by date using Google\'s date restriction format: "d[number]" for past days, "w[number]" for past weeks, "m[number]" for past months, or "y[number]" for past years. Example: "m6" for results from the past 6 months.'
              },
              exactTerms: {
                type: 'string',
                description: 'Search for results that contain this exact phrase. This is equivalent to putting the terms in quotes in the search query.'
              },
              resultType: {
                type: 'string',
                description: 'Specify the type of results to return. Options include "image" (or "images"), "news", and "video" (or "videos"). Default is general web results.'
              },
              page: {
                type: 'number',
                description: 'Page number for paginated results (starts at 1). Use in combination with resultsPerPage to navigate through large result sets.'
              },
              resultsPerPage: {
                type: 'number',
                description: 'Number of results to show per page (default: 5, max: 10). Controls how many results are returned for each page.'
              },
              sort: {
                type: 'string',
                description: 'Sorting method for search results. Options: "relevance" (default) or "date" (most recent first).'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'extract_webpage_content',
          description: 'Extract and analyze content from a webpage, converting it to readable text. This tool fetches the main content while removing ads, navigation elements, and other clutter. Use it to get detailed information from specific pages found via google_search.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { 
                type: 'string', 
                description: 'Full URL of the webpage to extract content from (must start with http:// or https://). Ensure the URL is from a public webpage and not behind authentication.'
              },
              format: {
                type: 'string',
                description: 'Output format for the extracted content. Options: "markdown" (default), "html", or "text".'
              },
              full_content: {
                type: 'boolean',
                description: 'Whether to return the full content of the webpage (true) or just a preview (false). Default is false.'
              }
            },
            required: ['url']
          }
        },
        {
          name: 'research_topic',
          description: 'Deeply research a topic by searching for relevant information, extracting content from multiple sources, and organizing it into a comprehensive markdown document. This tool helps develop a thorough understanding of complex or unfamiliar topics.',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { 
                type: 'string', 
                description: 'The topic to research. Be specific to get the most relevant results.'
              },
              depth: {
                type: 'string',
                description: 'The level of depth for the research: "basic" (overview), "intermediate" (detailed), or "advanced" (comprehensive). Default is "intermediate".'
              },
              focus_areas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific aspects of the topic to focus on. For example, for "quantum computing" you might specify ["applications", "limitations", "recent advances"].'
              },
              num_sources: {
                type: 'number',
                description: 'Maximum number of sources to include in the research (default: 5, max: 10).'
              }
            },
            required: ['topic']
          }
        },
        {
          name: 'synthesize_content',
          description: 'Synthesize content from multiple webpages into a cohesive, structured document. This tool extracts relevant information from multiple sources, identifies common themes and contradictions, and organizes the information into a well-structured format.',
          inputSchema: {
            type: 'object',
            properties: {
              urls: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Array of webpage URLs to extract and synthesize content from. Each URL must be public and start with http:// or https://.'
              },
              focus: {
                type: 'string',
                description: 'A specific aspect or question to focus on when synthesizing the content. This helps filter out irrelevant information.'
              },
              structure: {
                type: 'string',
                description: 'The structure to use for the synthesized content: "chronological", "thematic", "compare_contrast", or "question_answer". Default is "thematic".'
              }
            },
            required: ['urls']
          }
        }
      ]
    }));

    // Register tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      switch (request.params.name) {
        case 'google_search':
          if (typeof request.params.arguments === 'object' && request.params.arguments !== null && 'query' in request.params.arguments) {
            return this.handleSearch({
              query: String(request.params.arguments.query),
              num_results: typeof request.params.arguments.num_results === 'number' ? request.params.arguments.num_results : undefined,
              filters: {
                site: request.params.arguments.site ? String(request.params.arguments.site) : undefined,
                language: request.params.arguments.language ? String(request.params.arguments.language) : undefined,
                dateRestrict: request.params.arguments.dateRestrict ? String(request.params.arguments.dateRestrict) : undefined,
                exactTerms: request.params.arguments.exactTerms ? String(request.params.arguments.exactTerms) : undefined,
                resultType: request.params.arguments.resultType ? String(request.params.arguments.resultType) : undefined,
                page: typeof request.params.arguments.page === 'number' ? request.params.arguments.page : undefined,
                resultsPerPage: typeof request.params.arguments.resultsPerPage === 'number' ? request.params.arguments.resultsPerPage : undefined,
                sort: request.params.arguments.sort ? String(request.params.arguments.sort) : undefined
              }
            });
          }
          throw new Error('Invalid arguments for google_search tool');

        case 'extract_webpage_content':
          if (typeof request.params.arguments === 'object' && request.params.arguments !== null && 'url' in request.params.arguments) {
            return this.handleAnalyzeWebpage({
              url: String(request.params.arguments.url),
              format: request.params.arguments.format ? String(request.params.arguments.format) as OutputFormat : 'markdown',
              full_content: request.params.arguments.full_content === true
            });
          }
          throw new Error('Invalid arguments for extract_webpage_content tool');

        case 'research_topic':
          if (typeof request.params.arguments === 'object' && request.params.arguments !== null && 'topic' in request.params.arguments) {
            return this.handleResearchTopic({
              topic: String(request.params.arguments.topic),
              depth: request.params.arguments.depth ? String(request.params.arguments.depth) : 'intermediate',
              focus_areas: Array.isArray(request.params.arguments.focus_areas) 
                ? request.params.arguments.focus_areas.map(String) 
                : undefined,
              num_sources: typeof request.params.arguments.num_sources === 'number' 
                ? request.params.arguments.num_sources 
                : 5
            });
          }
          throw new Error('Invalid arguments for research_topic tool');

        case 'synthesize_content':
          if (typeof request.params.arguments === 'object' && 
              request.params.arguments !== null && 
              'urls' in request.params.arguments && 
              Array.isArray(request.params.arguments.urls)) {
            return this.handleSynthesizeContent({
              urls: request.params.arguments.urls.map(String),
              focus: request.params.arguments.focus ? String(request.params.arguments.focus) : undefined,
              structure: request.params.arguments.structure ? String(request.params.arguments.structure) : 'thematic'
            });
          }
          throw new Error('Invalid arguments for synthesize_content tool');

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async handleSearch(args: { 
    query: string; 
    num_results?: number; 
    filters?: { 
      site?: string; 
      language?: string;
      dateRestrict?: string;
      exactTerms?: string;
      resultType?: string;
      page?: number;
      resultsPerPage?: number;
      sort?: string;
    } 
  }) {
    try {
      const { results, pagination, categories } = await this.searchService.search(args.query, args.num_results, args.filters);

      if (results.length === 0) {
        return {
          content: [{ 
            type: 'text', 
            text: 'No results found. Try:\n- Using different keywords\n- Removing quotes from non-exact phrases\n- Using more general terms'
          }],
          isError: true
        };
      }

      // Format results in a more concise, readable way
      const formattedResults = results.map(result => ({
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        category: result.category
      }));

      // Format results in a more AI-friendly way
      let responseText = `Search results for "${args.query}":\n\n`;
      
      // Add category summary if available
      if (categories && categories.length > 0) {
        responseText += "Categories: " + categories.map(c => `${c.name} (${c.count})`).join(', ') + "\n\n";
      }
      
      // Add pagination info
      if (pagination) {
        responseText += `Showing page ${pagination.currentPage}${pagination.totalResults ? ` of approximately ${pagination.totalResults} results` : ''}\n\n`;
      }
      
      // Add each result in a readable format
      formattedResults.forEach((result, index) => {
        responseText += `${index + 1}. ${result.title}\n`;
        responseText += `   URL: ${result.link}\n`;
        responseText += `   ${result.snippet}\n\n`;
      });
      
      // Add navigation hints if pagination exists
      if (pagination && (pagination.hasNextPage || pagination.hasPreviousPage)) {
        responseText += "Navigation: ";
        if (pagination.hasPreviousPage) {
          responseText += "Use 'page: " + (pagination.currentPage - 1) + "' for previous results. ";
        }
        if (pagination.hasNextPage) {
          responseText += "Use 'page: " + (pagination.currentPage + 1) + "' for more results.";
        }
        responseText += "\n";
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
      const message = error instanceof Error ? error.message : 'Unknown error during search';
      return {
        content: [{ type: 'text', text: message }],
        isError: true
      };
    }
  }

  private async handleAnalyzeWebpage(args: { url: string; format?: OutputFormat; full_content?: boolean }) {
    try {
      const content = await this.contentExtractor.extractContent(args.url, args.format);
      
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
      if (args.full_content) {
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

  private async handleResearchTopic(args: { 
    topic: string; 
    depth?: string;
    focus_areas?: string[];
    num_sources?: number;
  }) {
    try {
      // Step 1: Search for relevant information
      const searchQuery = args.focus_areas 
        ? `${args.topic} ${args.focus_areas.join(' ')}`
        : args.topic;
      
      const { results } = await this.searchService.search(searchQuery, args.num_sources || 5);
      
      if (results.length === 0) {
        return {
          content: [{ 
            type: 'text', 
            text: `No results found for "${args.topic}". Try using different keywords or a more general topic.`
          }],
          isError: true
        };
      }

      // Step 2: Extract content from the sources
      const urls = results.map(result => result.link);
      const contents = await this.contentExtractor.batchExtractContent(urls, 'markdown');
      
      // Step 3: Use the research enhancer to create a structured research document
      const researchDocument = await this.researchEnhancer.createResearchDocument({
        topic: args.topic,
        depth: args.depth || 'intermediate',
        focus_areas: args.focus_areas,
        sources: Object.entries(contents).map(([url, content]) => {
          if ('error' in content) {
            return { url, error: content.error };
          }
          return { 
            url, 
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
            text: `Error researching "${args.topic}": ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleSynthesizeContent(args: { 
    urls: string[]; 
    focus?: string;
    structure?: string;
  }) {
    if (args.urls.length > 10) {
      return {
        content: [{ 
          type: 'text', 
          text: 'Maximum 10 URLs allowed per synthesis to maintain quality. Please reduce the number of URLs.'
        }],
        isError: true
      };
    }

    try {
      // Extract content from all URLs
      const contents = await this.contentExtractor.batchExtractContent(args.urls, 'markdown');
      
      // Use the research enhancer to synthesize the content
      const synthesizedContent = await this.researchEnhancer.synthesizeContent({
        sources: Object.entries(contents).map(([url, content]) => {
          if ('error' in content) {
            return { url, error: content.error };
          }
          return { 
            url, 
            title: content.title, 
            content: content.content,
            summary: content.summary || ''
          };
        }),
        focus: args.focus,
        structure: args.structure || 'thematic'
      });
      
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

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Google Research MCP server running');
      
      // Keep the process running
      process.on('SIGINT', () => {
        this.server.close().catch(console.error);
        process.exit(0);
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Failed to start MCP server:', error.message);
      } else {
        console.error('Failed to start MCP server: Unknown error');
      }
      process.exit(1);
    }
  }
}

// Start the server
const server = new GoogleResearchServer();
server.start().catch(console.error);