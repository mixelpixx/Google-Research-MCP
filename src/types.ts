export interface SearchFilters {
  site?: string;
  language?: string;
  dateRestrict?: string;
  exactTerms?: string;
  resultType?: string;
  page?: number;
  resultsPerPage?: number;
  sort?: string;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  pagemap: Record<string, any>;
  datePublished: string;
  source: string;
  category?: string;
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface SearchPaginationInfo {
  currentPage: number;
  totalResults?: number;
  resultsPerPage: number;
  totalPages?: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  filters?: SearchFilters;
  pagination?: SearchPaginationInfo;
  categories?: CategoryInfo[];
}

export type OutputFormat = 'markdown' | 'html' | 'text';

export interface WebpageContent {
  url: string;
  title: string;
  description: string;
  content: string;
  format: OutputFormat;
  meta_tags: Record<string, string>;
  stats: {
    word_count: number;
    approximate_chars: number;
  };
  content_preview: {
    first_500_chars: string;
  };
  summary?: string;
  structure?: {
    headings?: string[];
  };
}

export interface WebpageAnalysisResponse {
  [url: string]: WebpageContent | { error: string };
}
