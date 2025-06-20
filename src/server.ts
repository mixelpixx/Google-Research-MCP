/**
 * Google Research MCP Server - Main Entry Point
 * 
 * This is the main entry point for the Google Research MCP Server.
 * It creates and configures the MCP server, initializes all services,
 * sets up handlers, and starts the server.
 */

// Import MCP server components
import { createServer, startServer, registerToolListHandler, registerToolCallHandler } from './config/server-config.js';

// Import services
import { GoogleSearchService } from './services/google-search.service.js';
import { ContentExtractor } from './services/content-extractor.service.js';
import { EnhancedContentExtractor } from './services/enhanced-content-extractor.service.js';
import { ResearchEnhancer } from './services/research-enhancer.service.js';
import { BrowsingSessionService } from './services/browsing-session.service.js';
import { NavigationService } from './services/navigation.service.js';
import { MultiSourceSynthesizer } from './services/multi-source-synthesizer.service.js';

// Import handlers
import { SearchHandlers } from './handlers/search-handlers.js';
import { ContentHandlers } from './handlers/content-handlers.js';
import { NavigationHandlers } from './handlers/navigation-handlers.js';
import { SynthesisHandlers } from './handlers/synthesis-handlers.js';

/**
 * Main function to create and start the MCP server
 */
async function main() {
  try {
    console.error('Initializing Google Research MCP Server...');
    
    // Initialize all services
    const searchService = new GoogleSearchService();
    const contentExtractor = new ContentExtractor();
    const enhancedContentExtractor = new EnhancedContentExtractor();
    const researchEnhancer = new ResearchEnhancer();
    
    // Initialize dependent services
    const browsingSessionService = new BrowsingSessionService(enhancedContentExtractor, searchService);
    const navigationService = new NavigationService(browsingSessionService, enhancedContentExtractor);
    const multiSourceSynthesizer = new MultiSourceSynthesizer(researchEnhancer, enhancedContentExtractor);
    
    console.error('Services initialized successfully');
    
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
    
    console.error('Handlers initialized successfully');
    
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
    
    console.error('Server configured successfully');
    
    // Start the server
    await startServer(server);
    
    console.error('Google Research MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start Google Research MCP Server:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main function:', error);
  process.exit(1);
});