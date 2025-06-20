/**
 * Tool definitions for the Google Research MCP Server
 * 
 * This file contains the schema definitions for all tools provided by the server.
 * Tools are organized into logical groups:
 * - Search Tools: Tools for searching the web
 * - Content Tools: Tools for extracting and analyzing content
 * - Navigation Tools: Tools for contextual navigation and browsing
 * - Synthesis Tools: Tools for synthesizing information from multiple sources
 */

import { OutputFormat } from '../types.js';

// Tool groups for better organization
export const TOOL_GROUPS = {
  SEARCH: 'Search Tools',
  CONTENT: 'Content Tools',
  NAVIGATION: 'Navigation Tools',
  SYNTHESIS: 'Synthesis Tools'
};

/**
 * Search Tools
 */
export const SEARCH_TOOLS = {
  GOOGLE_SEARCH: {
    name: 'google_search',
    description: 'Search Google and return relevant results from the web. This tool finds web pages, articles, and information on specific topics using Google\'s search engine. Results include titles, snippets, and URLs that can be analyzed further using extract_webpage_content.',
    group: TOOL_GROUPS.SEARCH,
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
  }
};

/**
 * Content Tools
 */
export const CONTENT_TOOLS = {
  EXTRACT_WEBPAGE_CONTENT: {
    name: 'extract_webpage_content',
    description: 'Extract and analyze content from a webpage, converting it to readable text. This tool fetches the main content while removing ads, navigation elements, and other clutter. Use it to get detailed information from specific pages found via google_search. Works with most common webpage formats including articles, blogs, and documentation.',
    group: TOOL_GROUPS.CONTENT,
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
  EXTRACT_MULTIPLE_WEBPAGES: {
    name: 'extract_multiple_webpages',
    description: 'Extract and analyze content from multiple webpages in a single request. This tool is ideal for comparing information across different sources or gathering comprehensive information on a topic. Limited to 5 URLs per request to maintain performance.',
    group: TOOL_GROUPS.CONTENT,
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of webpage URLs to extract content from. Each URL must be public and start with http:// or https://. Maximum 5 URLs per request.'
        },
        format: {
          type: 'string',
          description: 'Output format for the extracted content. Options: "markdown" (default), "html", or "text".'
        }
      },
      required: ['urls']
    }
  },
  SUMMARIZE_WEBPAGE: {
    name: 'summarize_webpage',
    description: 'Generate a comprehensive summary of a webpage\'s content. This tool extracts the key points, main ideas, and essential information from a webpage, condensing it into a concise summary.',
    group: TOOL_GROUPS.CONTENT,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the webpage to summarize (must start with http:// or https://). Ensure the URL is from a public webpage and not behind authentication.'
        },
        length: {
          type: 'string',
          description: 'Desired length of the summary: "short" (250 words), "medium" (500 words), or "long" (1000 words). Default is "medium".'
        },
        focus: {
          type: 'string',
          description: 'Optional specific aspect to focus on when summarizing the content.'
        }
      },
      required: ['url']
    }
  },
  STRUCTURED_CONTENT_EXTRACTION: {
    name: 'structured_content_extraction',
    description: 'Extract content from a webpage with enhanced structure preservation, maintaining tables, lists, hierarchies, and image context. This tool provides a richer representation of webpage content than standard extraction.',
    group: TOOL_GROUPS.CONTENT,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL of the webpage to extract content from (must start with http:// or https://)'
        },
        format: {
          type: 'string',
          description: 'Output format for the extracted content. Options: "markdown" (default), "html", or "text".'
        },
        preserve_tables: {
          type: 'boolean',
          description: 'Whether to preserve table structure in the output. Default is true.'
        },
        extract_images: {
          type: 'boolean',
          description: 'Whether to extract images with context information. Default is true.'
        },
        analyze_links: {
          type: 'boolean',
          description: 'Whether to analyze and include links with context. Default is true.'
        }
      },
      required: ['url']
    }
  }
};

/**
 * Research and Synthesis Tools
 */
export const RESEARCH_TOOLS = {
  RESEARCH_TOPIC: {
    name: 'research_topic',
    description: 'Deeply research a topic by searching for relevant information, extracting content from multiple sources, and organizing it into a comprehensive markdown document. This tool helps develop a thorough understanding of complex or unfamiliar topics.',
    group: TOOL_GROUPS.SYNTHESIS,
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
  SYNTHESIZE_CONTENT: {
    name: 'synthesize_content',
    description: 'Synthesize content from multiple webpages into a cohesive, structured document. This tool extracts relevant information from multiple sources, identifies common themes and contradictions, and organizes the information into a well-structured format.',
    group: TOOL_GROUPS.SYNTHESIS,
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
  },
  ENHANCED_SYNTHESIS: {
    name: 'enhanced_synthesis',
    description: 'Create an enhanced synthesis of content from multiple sources with advanced capabilities like contradiction detection and source credibility assessment. This tool provides a more nuanced and comprehensive synthesis than standard approaches.',
    group: TOOL_GROUPS.SYNTHESIS,
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
          description: 'A specific aspect or question to focus on when synthesizing the content.'
        },
        structure: {
          type: 'string',
          description: 'The structure to use for the synthesized content: "chronological", "thematic", "compare_contrast", or "question_answer". Default is "thematic".'
        },
        detect_contradictions: {
          type: 'boolean',
          description: 'Whether to detect and highlight contradictions between sources. Default is true.'
        },
        assess_credibility: {
          type: 'boolean',
          description: 'Whether to include source credibility assessment. Default is true.'
        },
        compare_by: {
          type: 'array',
          items: { type: 'string' },
          description: 'Aspects to compare when using compare_contrast structure. For example: ["methodology", "results", "limitations"].'
        }
      },
      required: ['urls']
    }
  }
};

/**
 * Navigation Tools
 */
export const NAVIGATION_TOOLS = {
  CONTEXTUAL_NAVIGATION: {
    name: 'contextual_navigation',
    description: 'Navigate the web contextually by following relevant links from a starting page. This tool simulates how a human browses by identifying and exploring related content, maintaining context between pages.',
    group: TOOL_GROUPS.NAVIGATION,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Starting URL for the navigation session (must start with http:// or https://)'
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to guide link relevance assessment. Links containing or related to these keywords will be prioritized.'
        },
        depth: {
          type: 'number',
          description: 'Maximum navigation depth (1-3). Higher values explore more links but take longer. Default is 1.'
        },
        max_links: {
          type: 'number',
          description: 'Maximum number of links to follow per page (1-5). Default is 3.'
        },
        session_id: {
          type: 'string',
          description: 'Optional session ID to continue a previous browsing session. If not provided, a new session will be created.'
        },
        stay_on_domain: {
          type: 'boolean',
          description: 'Whether to stay on the same domain as the starting URL. Default is false.'
        }
      },
      required: ['url']
    }
  }
};

// Combine all tools into a single object for easy access
export const ALL_TOOLS = {
  ...SEARCH_TOOLS,
  ...CONTENT_TOOLS,
  ...RESEARCH_TOOLS,
  ...NAVIGATION_TOOLS
};

// Export all tools as an array for registration with the server
export const ALL_TOOL_DEFINITIONS = Object.values(ALL_TOOLS);