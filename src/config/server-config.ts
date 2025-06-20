/**
 * Server configuration for the Google Research MCP Server
 * 
 * This file contains the configuration and setup for the MCP server,
 * including server creation, transport configuration, and request handlers registration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ALL_TOOL_DEFINITIONS } from '../tools/tool-definitions.js';

/**
 * Create and configure the MCP server
 */
export function createServer(
  name: string = 'google-research',
  version: string = '1.0.0'
): Server {
  // Create a new server with basic metadata
  const server = new Server(
    {
      name,
      version
    },
    {
      capabilities: {
        tools: ALL_TOOL_DEFINITIONS.reduce((acc, tool) => {
          acc[tool.name] = {
            description: tool.description,
            inputSchema: tool.inputSchema
          };
          return acc;
        }, {} as Record<string, any>)
      }
    }
  );

  return server;
}

/**
 * Start the server with a transport
 */
export async function startServer(server: Server): Promise<void> {
  try {
    // Create a stdio transport for the server
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    console.error('Google Research MCP server running');
    
    // Add a no-op interval to keep the Node.js event loop active
    setInterval(() => {}, 60000);
    
    // Handle SIGINT to gracefully shut down the server
    process.on('SIGINT', () => {
      server.close().catch(console.error);
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

/**
 * Register tool list handler
 */
export function registerToolListHandler(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOL_DEFINITIONS.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }));
}

/**
 * Register tool call handler that dispatches to appropriate tool handlers
 */
export function registerToolCallHandler(
  server: Server,
  handlers: Record<string, (args: any) => Promise<any>>
): void {
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const toolName = request.params.name;
    const handler = handlers[toolName];
    
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    try {
      return await handler(request.params.arguments);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error executing tool ${toolName}: ${error.message}`);
      }
      throw new Error(`Unknown error executing tool ${toolName}`);
    }
  });
}