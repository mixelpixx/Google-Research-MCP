/**
 * @file research-mcp.ts
 * @description Compatibility entry point for the Google Research MCP.
 *
 * DEPRECATED: This file exists for backward compatibility only.
 * Please use the new modular implementation in src/server.ts directly.
 *
 * This compatibility layer will be removed in a future release.
 */

// Import the necessary functions from our modular structure
import { createServer, startServer as startMcpServer, registerToolListHandler, registerToolCallHandler } from './config/server-config.js';
import { GoogleSearchService } from './services/google-search.service.js';
import { ContentExtractor } from './services/content-extractor.service.js';
import { EnhancedContentExtractor } from './services/enhanced-content-extractor.service.js';
import { ResearchEnhancer } from './services/research-enhancer.service.js';
import { BrowsingSessionService } from './services/browsing-session.service.js';
import { NavigationService } from './services/navigation.service.js';
import { MultiSourceSynthesizer } from './services/multi-source-synthesizer.service.js';
import { SearchHandlers } from './handlers/search-handlers.js';
import { ContentHandlers } from './handlers/content-handlers.js';
import { NavigationHandlers } from './handlers/navigation-handlers.js';
import { SynthesisHandlers } from './handlers/synthesis-handlers.js';

// Log deprecation warning when this module is imported
console.warn(
  '\x1b[33m%s\x1b[0m',
  'WARNING: Importing from research-mcp.ts is deprecated. ' +
  'Please update your imports to use server.ts directly. ' +
  'This compatibility layer will be removed in a future release.'
);

/**
 * Compatibility function that initializes and starts the server
 */
export async function startServer(): Promise<void> {
  try {
    console.error('Initializing Google Research MCP Server (compatibility mode)...');
    
    // Initialize all services
    const searchService = new GoogleSearchService();
    const contentExtractor = new ContentExtractor();
    const enhancedContentExtractor = new EnhancedContentExtractor();
    const researchEnhancer = new ResearchEnhancer();
    
    // Initialize dependent services
    const browsingSessionService = new BrowsingSessionService(enhancedContentExtractor, searchService);
    const navigationService = new NavigationService(browsingSessionService, enhancedContentExtractor);
    const multiSourceSynthesizer = new MultiSourceSynthesizer(researchEnhancer, enhancedContentExtractor);
    
    // Initialize all handlers
    const searchHandlers = new SearchHandlers(searchService);
    const contentHandlers = new ContentHandlers(contentExtractor, enhancedContentExtractor);
    const navigationHandlers = new NavigationHandlers(navigationService, browsingSessionService);
    const synthesisHandlers = new SynthesisHandlers(
      researchEnhancer,
      contentExtractor,
      enhancedContentExtractor,
      searchService,
      multiSourceSynthesizer
    );
    
    // Create the MCP server
    const server = createServer();
    
    // Register tool list handler
    registerToolListHandler(server);
    
    // Combine all handlers into a single map
    const allHandlers = {
      ...searchHandlers.getHandlers(),
      ...contentHandlers.getHandlers(),
      ...navigationHandlers.getHandlers(),
      ...synthesisHandlers.getHandlers()
    };
    
    // Register the combined tool call handler
    registerToolCallHandler(server, allHandlers);
    
    // Start the server
    await startMcpServer(server);
    
    console.error('Google Research MCP Server started successfully (compatibility mode)');
  } catch (error) {
    console.error('Failed to start Google Research MCP Server:', error);
    process.exit(1);
  }
}

// Export as default for backward compatibility
export default startServer;

// If this file is executed directly, start the server
// In ES modules, we check if the current file URL ends with this filename
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  startServer().catch(error => {
    console.error('Unhandled error in compatibility layer:', error);
    process.exit(1);
  });
}