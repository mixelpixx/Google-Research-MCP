import { google } from 'googleapis';
import { SearchResult, SearchFilters, SearchPaginationInfo, CategoryInfo } from '../types.js';
import { URL } from 'url';

interface CacheEntry {
  timestamp: number;
  data: {
    results: SearchResult[];
    pagination?: SearchPaginationInfo;
    categories?: CategoryInfo[];
  };
}

export class GoogleSearchService {
  // Cache for search results (key: query string + filters, value: results)
  private searchCache: Map<string, CacheEntry> = new Map();
  // Cache expiration time in milliseconds (5 minutes)
  private cacheTTL: number = 5 * 60 * 1000;
  private customSearch;
  private searchEngineId: string;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    
    if (!apiKey || !searchEngineId) {
      throw new Error('Missing required environment variables: GOOGLE_API_KEY and GOOGLE_SEARCH_ENGINE_ID');
    }

    // Initialize Google Custom Search API
    this.customSearch = google.customsearch('v1').cse;
    this.searchEngineId = searchEngineId;

    // Set up the API client
    google.options({
      auth: apiKey
    });
  }

  /**
   * Generate a cache key from search parameters
   */
  private generateCacheKey(query: string, numResults: number, filters?: SearchFilters): string {
    return JSON.stringify({
      query,
      numResults,
      filters
    });
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return now - entry.timestamp < this.cacheTTL;
  }

  /**
   * Store search results in cache
   */
  private cacheSearchResults(
    cacheKey: string, 
    results: SearchResult[], 
    pagination?: SearchPaginationInfo, 
    categories?: CategoryInfo[]
  ): void {
    this.searchCache.set(cacheKey, {
      timestamp: Date.now(),
      data: { results, pagination, categories }
    });
    
    // Limit cache size to prevent memory issues (max 100 entries)
    if (this.searchCache.size > 100) {
      // Delete oldest entry
      const oldestKey = Array.from(this.searchCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.searchCache.delete(oldestKey);
    }
  }

  async search(query: string, numResults: number = 5, filters?: SearchFilters): Promise<{ 
    results: SearchResult[]; 
    pagination?: SearchPaginationInfo;
    categories?: CategoryInfo[];
  }> {
    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(query, numResults, filters);
      
      // Check cache first
      const cachedResult = this.searchCache.get(cacheKey);
      if (cachedResult && this.isCacheValid(cachedResult)) {
        console.error('Using cached search results');
        return cachedResult.data;
      }
      let formattedQuery = query;
      
      // Apply site filter if provided
      if (filters?.site) {
        formattedQuery += ` site:${filters.site}`;
      }
      
      // Apply exact terms if provided
      if (filters?.exactTerms) {
        formattedQuery += ` "${filters.exactTerms}"`;
      }
      
      // Set default pagination values if not provided
      const page = filters?.page && filters.page > 0 ? filters.page : 1;
      const resultsPerPage = filters?.resultsPerPage ? Math.min(filters.resultsPerPage, 10) : Math.min(numResults, 10);
      
      // Calculate start index for pagination (Google uses 1-based indexing)
      const startIndex = (page - 1) * resultsPerPage + 1;
      
      const params: any = {
        cx: this.searchEngineId,
        q: formattedQuery,
        num: resultsPerPage,
        start: startIndex
      };
      
      // Apply language filter if provided
      if (filters?.language) {
        params.lr = `lang_${filters.language}`;
      }
      
      // Apply date restriction if provided
      if (filters?.dateRestrict) {
        params.dateRestrict = filters.dateRestrict;
      }
      
      // Apply result type filter if provided
      if (filters?.resultType) {
        switch (filters.resultType.toLowerCase()) {
          case 'image':
          case 'images':
            params.searchType = 'image';
            break;
          case 'news':
            // For news, we need to modify the query
            formattedQuery += ' source:news';
            params.q = formattedQuery;
            break;
          case 'video':
          case 'videos':
            // For videos, we can use a more specific filter
            formattedQuery += ' filetype:video OR inurl:video OR inurl:watch';
            params.q = formattedQuery;
            break;
        }
      }
      
      // Apply sorting if provided
      if (filters?.sort) {
        switch (filters.sort.toLowerCase()) {
          case 'date':
            // Sort by date (most recent first)
            params.sort = 'date';
            break;
          case 'relevance':
          default:
            // Google's default sort is by relevance, so we don't need to specify
            break;
        }
      }
      
      const response = await this.customSearch.list(params);

      // If no items are found, return empty results with pagination info
      if (!response.data.items) {
        return { 
          results: [],
          pagination: {
            currentPage: page,
            resultsPerPage,
            totalResults: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: page > 1
          },
          categories: []
        };
      }

      // Map the search results and categorize them
      const results = response.data.items.map(item => {
        const result: SearchResult = {
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || '',
          pagemap: item.pagemap || {},
          datePublished: item.pagemap?.metatags?.[0]?.['article:published_time'] || '',
          source: 'google_search'
        };
        
        // Add category to the result
        result.category = this.categorizeResult(result);
        
        return result;
      });
      
      // Generate category statistics
      const categories = this.generateCategoryStats(results);
      
      // Create pagination information
      const totalResults = parseInt(response.data.searchInformation?.totalResults || '0', 10);
      const totalPages = Math.ceil(totalResults / resultsPerPage);
      
      const pagination: SearchPaginationInfo = {
        currentPage: page,
        resultsPerPage,
        totalResults,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
      
      // Cache the results before returning
      this.cacheSearchResults(cacheKey, results, pagination, categories);
      
      return { 
        results,
        pagination,
        categories
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Google Search API error: ${error.message}`);
      }
      throw new Error('Unknown error during Google search');
    }
  }
  
  /**
   * Categorizes a search result based on its content
   * @param result The search result to categorize
   * @returns The category name
   */
  private categorizeResult(result: SearchResult): string {
    try {
      // Extract the domain from the URL
      const url = new URL(result.link);
      const domain = url.hostname.replace(/^www\./, '');
      
      // Check if this is a social media site
      if (domain.match(/facebook\.com|twitter\.com|instagram\.com|linkedin\.com|pinterest\.com|tiktok\.com|reddit\.com/i)) {
        return 'Social Media';
      }
      
      // Check if this is a video site
      if (domain.match(/youtube\.com|vimeo\.com|dailymotion\.com|twitch\.tv/i)) {
        return 'Video';
      }
      
      // Check if this is a news site
      if (domain.match(/news|cnn\.com|bbc\.com|nytimes\.com|wsj\.com|reuters\.com|bloomberg\.com/i)) {
        return 'News';
      }
      
      // Check if this is an educational site
      if (domain.match(/\.edu$|wikipedia\.org|khan|course|learn|study|academic/i)) {
        return 'Educational';
      }
      
      // Check if this is a documentation site
      if (domain.match(/docs|documentation|developer|github\.com|gitlab\.com|bitbucket\.org|stackoverflow\.com/i) || 
          result.title.match(/docs|documentation|api|reference|manual/i)) {
        return 'Documentation';
      }
      
      // Check if this is a shopping site
      if (domain.match(/amazon\.com|ebay\.com|etsy\.com|walmart\.com|shop|store|buy/i)) {
        return 'Shopping';
      }
      
      // Default category based on domain
      return domain.split('.').slice(-2, -1)[0].charAt(0).toUpperCase() + domain.split('.').slice(-2, -1)[0].slice(1);
      
    } catch (error) {
      // If there's any error in categorization, return a default category
      return 'Other';
    }
  }
  
  /**
   * Generates category statistics from search results
   * @param results The search results to analyze
   * @returns An array of category information
   */
  private generateCategoryStats(results: SearchResult[]): CategoryInfo[] {
    // Count results by category
    const categoryCounts: Record<string, number> = {};
    
    results.forEach(result => {
      const category = result.category || 'Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Convert to array of category info objects
    return Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
  }
}
