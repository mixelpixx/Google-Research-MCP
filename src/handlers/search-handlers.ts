/**
 * Search Handlers
 * 
 * Handlers for search-related tools, including Google search functionality.
 */

import { GoogleSearchService } from '../services/google-search.service.js';

export class SearchHandlers {
  private searchService: GoogleSearchService;
  
  constructor(searchService: GoogleSearchService) {
    this.searchService = searchService;
  }
  
  /**
   * Handle Google search requests
   */
  public async handleSearch(args: any): Promise<any> {
    const { query, num_results, site, language, dateRestrict, exactTerms, resultType, page, resultsPerPage, sort } = args;
    
    // Validate required arguments
    if (!query) {
      throw new Error('Invalid arguments for google_search tool: query is required');
    }
    
    try {
      const { results, pagination, categories } = await this.searchService.search(
        query,
        num_results,
        {
          site,
          language,
          dateRestrict,
          exactTerms,
          resultType,
          page: typeof page === 'number' ? page : undefined,
          resultsPerPage: typeof resultsPerPage === 'number' ? resultsPerPage : undefined,
          sort
        }
      );

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
      let responseText = `Search results for "${query}":\n\n`;
      
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
  
  /**
   * Get all handlers as a map of tool name to handler function
   */
  public getHandlers(): Record<string, (args: any) => Promise<any>> {
    return {
      'google_search': this.handleSearch.bind(this)
    };
  }
}