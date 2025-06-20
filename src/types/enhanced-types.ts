/**
 * Enhanced types for the improved Google Research MCP
 */

import { SearchResult, WebpageContent, OutputFormat } from '../types.js';

/**
 * Represents a link extracted from a webpage
 */
export interface ExtractedLink {
  url: string;
  text: string;
  context: string;  // The surrounding text that provides context for the link
  isRelevant?: boolean;  // Whether this link appears relevant to the current research topic
  relevanceScore?: number;  // A score indicating how relevant this link is (0-1)
  visited?: boolean;  // Whether this link has been visited
}

/**
 * Represents an image found on a webpage
 */
export interface ExtractedImage {
  url: string;
  alt?: string;  // Original alt text
  generatedAlt?: string;  // AI-generated description of the image
  context: string;  // The surrounding text that provides context for the image
  dimensions?: {
    width?: number;
    height?: number;
  };
  position: {
    nearestHeading?: string;
    sectionContext?: string;
  };
}

/**
 * Represents structured data extracted from a webpage
 */
export interface StructuredData {
  tables: TableData[];
  lists: ListData[];
  hierarchies: HierarchyData[];
  keyValuePairs: KeyValuePair[];
}

/**
 * Represents a table extracted from a webpage
 */
export interface TableData {
  id: string;
  caption?: string;
  context: string;  // The surrounding text that provides context for the table
  headers: string[];
  rows: string[][];
  markdownRepresentation: string;  // Table rendered in markdown format
}

/**
 * Represents a list extracted from a webpage
 */
export interface ListData {
  id: string;
  type: 'ordered' | 'unordered' | 'definition';
  items: string[];
  nestedLists?: ListData[];
  markdownRepresentation: string;  // List rendered in markdown format
}

/**
 * Represents a hierarchical structure extracted from a webpage
 */
export interface HierarchyData {
  id: string;
  type: string;  // e.g., "directory", "taxonomy", "menu"
  nodes: HierarchyNode[];
  markdownRepresentation: string;  // Hierarchy rendered in markdown format
}

/**
 * Represents a node in a hierarchical structure
 */
export interface HierarchyNode {
  id: string;
  text: string;
  level: number;
  children?: HierarchyNode[];
}

/**
 * Represents a key-value pair extracted from a webpage
 */
export interface KeyValuePair {
  key: string;
  value: string;
}

/**
 * Enhanced webpage content with structured data and visual elements
 */
export interface EnhancedWebpageContent extends WebpageContent {
  links: ExtractedLink[];
  images: ExtractedImage[];
  structuredData: StructuredData;
  lastVisited?: Date;
  sourceCredibility?: {
    score: number;  // 0-1 score
    factors: string[];  // Factors influencing the credibility assessment
  };
}

/**
 * Represents a page in the browsing history
 */
export interface BrowsingHistoryPage {
  url: string;
  title: string;
  visitTime: Date;
  summary: string;
  keywords: string[];
  parentUrl?: string;  // The URL of the page that led to this one
}

/**
 * Represents a browsing path from one page to another
 */
export interface BrowsingPath {
  startUrl: string;
  endUrl: string;
  intermediateUrls: string[];
  relevance: number;  // A score indicating the relevance of this path
}

/**
 * Represents a browsing session with history and context
 */
export interface BrowsingSession {
  id: string;
  startTime: Date;
  lastActivityTime: Date;
  topic?: string;
  currentUrl?: string;
  history: BrowsingHistoryPage[];
  bookmarks: string[];
  sessionSummary: string;
  researchQuestions: string[];
}

/**
 * Options for the contextual navigation
 */
export interface NavigationOptions {
  followLinks: boolean;
  maxDepth: number;
  relevanceThreshold: number;
  filterByKeywords?: string[];
  excludeDomains?: string[];
  includeDomains?: string[];
}

/**
 * Parameters for multi-source synthesis
 */
export interface EnhancedSynthesisParams {
  sources: EnhancedWebpageContent[];
  focus?: string;
  structure: string;
  compareBy?: string[];
  detectContradictions: boolean;
  includeSourceCredibility: boolean;
  visualizeRelationships: boolean;
}

/**
 * Result of a multi-source synthesis
 */
export interface EnhancedSynthesisResult {
  document: string;  // The synthesized document in markdown format
  contradictions?: {
    topic: string;
    sources: string[];
    statements: string[];
  }[];
  relationships: {
    type: string;
    sources: string[];
    description: string;
  }[];
  sourcesAssessment: {
    url: string;
    credibilityScore: number;
    bias?: string;
  }[];
}

/**
 * Parameters for the new "follow_links" tool
 */
export interface FollowLinksParams {
  url: string;
  keywords?: string[];
  maxLinksToFollow: number;
  depth: number;
  stayOnDomain?: boolean;
}

/**
 * Result of the "follow_links" operation
 */
export interface FollowLinksResult {
  startUrl: string;
  pagesVisited: {
    url: string;
    title: string;
    relevance: number;
    summary: string;
  }[];
  navigationPath: string[];
  relatedTopics: string[];
}