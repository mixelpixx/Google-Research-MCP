# Google Research MCP Server

A powerful Model Context Protocol (MCP) server that provides AI assistants with advanced web research capabilities, including Google search integration, intelligent content extraction, and multi-source synthesis.

## 🚀 **Features**

### **Core Research Capabilities**
- **Google Search Integration** - Programmatic access to Google's search results with advanced filtering
- **Intelligent Content Extraction** - Clean, structured extraction from web pages with fallback strategies
- **Multi-Source Synthesis** - Combine information from multiple sources into coherent reports
- **Contextual Navigation** - Smart web browsing that follows relevant links automatically
- **Research Workflow Automation** - Complete research pipelines from query to final report

### **Production-Ready Features**
- **Smart Caching** - Optimized performance with configurable cache strategies
- **Rate Limiting** - Built-in protection against API abuse
- **Health Monitoring** - Comprehensive system health checks and metrics
- **Structured Logging** - Production-grade logging with multiple output formats
- **Container Support** - Docker deployment with health checks and monitoring

### **Enhanced Content Processing**
- **Structure Preservation** - Maintains tables, lists, and hierarchical content
- **Multiple Output Formats** - Markdown, HTML, and plain text support
- **Metadata Extraction** - Captures publication dates, authors, and citation information
- **Content Summarization** - Automatic generation of content summaries
- **Image Context** - Extracts and describes images within content

## 📦 **Installation**

### **Prerequisites**
- Node.js 18+ and npm 8+
- Google Custom Search API key ([Get one here](https://developers.google.com/custom-search/v1/introduction))
- Google Custom Search Engine ID ([Create one here](https://cse.google.com/cse/))

### **Quick Start (Unified Server)**

The Google Research MCP Server now provides **both search and research capabilities in a single unified server** - no need to run separate instances!

#### **Option 1: Direct Installation (No Docker Required)**

1. **Clone and Install**
   ```bash
   git clone https://github.com/your-org/google-research-mcp-server.git
   cd google-research-mcp-server
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env file with your Google API credentials
   nano .env  # or use your preferred editor
   ```

3. **Validate Configuration**
   ```bash
   npm run validate-config
   ```

4. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

5. **Verify Server is Running**
   ```bash
   npm run health-check
   ```

#### **Option 2: Docker Installation (Recommended for Production)**

```bash
# 1. Clone repository
git clone https://github.com/your-org/google-research-mcp-server.git
cd google-research-mcp-server

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Deploy with Docker
docker-compose up -d

# 4. Verify deployment
docker-compose logs -f google-research-mcp
npm run docker:health
```

#### **Option 3: Development Mode**

For development with auto-rebuild:
```bash
# Terminal 1: Watch for changes and rebuild
npm run dev

# Terminal 2: Start server (after initial build)
npm start
```

## ⚙️ **Configuration**

### **Required Environment Variables**
```bash
# Google API Configuration (Required)
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Server Configuration (Optional)
NODE_ENV=production
LOG_LEVEL=info
```

### **Optional Configuration**
```bash
# Performance Tuning
SEARCH_CACHE_TTL_MINUTES=5        # Search result cache duration
CONTENT_CACHE_TTL_MINUTES=30      # Content extraction cache duration
MAX_CACHE_ENTRIES=100             # Maximum cache entries

# Request Limits
REQUEST_TIMEOUT_MS=30000          # Request timeout
MAX_CONTENT_SIZE_MB=50            # Maximum content size
CONCURRENT_REQUEST_LIMIT=10       # Concurrent request limit

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # Rate limit window
RATE_LIMIT_MAX_REQUESTS=100       # Max requests per window
```

### **Validate Configuration**
```bash
npm run validate-config
```

## 🔧 **Usage**

### **MCP Client Integration**

The server provides **unified search and research capabilities** in a single MCP server. Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "google-research": {
      "command": "node",
      "args": ["path/to/google-research-mcp-server/dist/server.js"],
      "env": {
        "GOOGLE_API_KEY": "your_api_key",
        "GOOGLE_SEARCH_ENGINE_ID": "your_search_engine_id"
      }
    }
  }
}
```

**Alternative Configuration (with environment file):**
```json
{
  "mcpServers": {
    "google-research": {
      "command": "npm",
      "args": ["start"],
      "cwd": "path/to/google-research-mcp-server"
    }
  }
}
```
*Note: This assumes you have a `.env` file configured in the project directory.*

### **Available Tools**

#### **Search Tools**
- **`google_search`** - Search Google with advanced filtering options
  ```
  Query: "climate change effects"
  Options: site filter, date restrictions, language, result type
  ```

#### **Content Extraction Tools**
- **`extract_webpage_content`** - Extract clean content from web pages
- **`extract_multiple_webpages`** - Batch extract from multiple URLs
- **`structured_content_extraction`** - Enhanced extraction with structure preservation
- **`summarize_webpage`** - Generate webpage summaries

#### **Research & Synthesis Tools**
- **`research_topic`** - Comprehensive topic research with multiple sources
- **`synthesize_content`** - Combine multiple sources into coherent reports
- **`enhanced_synthesis`** - Advanced synthesis with contradiction detection

#### **Navigation Tools**
- **`contextual_navigation`** - Smart web browsing following relevant links

### **Example Usage Scenarios**

#### **Basic Research**
```
1. Search: google_search("renewable energy trends 2024")
2. Extract: extract_webpage_content(top_result_url)
3. Analyze: Multiple sources for comprehensive view
```

#### **Comprehensive Research Report**
```
1. Research: research_topic("artificial intelligence in healthcare")
2. Synthesis: enhanced_synthesis(multiple_sources)
3. Export: Formatted report with citations
```

#### **Competitive Analysis**
```
1. Search: Multiple queries for competitor information
2. Navigate: contextual_navigation(competitor_websites)
3. Synthesize: Compare and contrast findings
```

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **🔴 API Authentication Errors**
```
Error: Missing required environment variables: GOOGLE_API_KEY
```
**Solution:**
1. Verify API key is correctly set in `.env` file
2. Ensure Google Custom Search API is enabled in Google Cloud Console
3. Check API key has proper permissions and quotas
4. Validate configuration: `npm run validate-config`

#### **🔴 Rate Limiting Issues**
```
Error: Rate limit exceeded for search requests
```
**Solution:**
1. Check your Google API quota in Google Cloud Console
2. Adjust rate limiting settings in environment variables
3. Implement request queuing for high-volume usage
4. Consider upgrading your Google API plan

#### **🔴 Content Extraction Failures**
```
Error: Failed to extract content from webpage
```
**Solution:**
1. Verify the target URL is accessible
2. Check if the website blocks automated requests
3. Ensure proper User-Agent headers are configured
4. Try different extraction methods (structured vs. standard)

#### **🔴 Memory Issues**
```
Warning: Memory usage high: 85%
```
**Solution:**
1. Reduce cache sizes in configuration
2. Lower concurrent request limits
3. Monitor content extraction sizes
4. Consider scaling horizontally

#### **🔴 Docker Deployment Issues**
```
Container health check failing
```
**Solution:**
1. Check container logs: `docker-compose logs -f google-research-mcp`
2. Verify environment variables are properly set
3. Ensure API connectivity from container
4. Run manual health check: `npm run docker:health`

#### **🔴 Non-Docker Deployment Issues**
```
Error: Cannot find module 'dist/server.js'
```
**Solution:**
1. Ensure you've built the project: `npm run build`
2. Check that `dist/` directory exists and contains compiled files
3. Verify TypeScript compilation: `npx tsc --noEmit`
4. Clear and rebuild: `rm -rf dist/ && npm run build`

```
Error: EACCES permission denied
```
**Solution:**
1. Check file permissions: `ls -la dist/server.js`
2. Make executable if needed: `chmod +x dist/server.js`
3. Run with explicit node: `node dist/server.js`

### **Debug Mode**
```bash
# Enable detailed logging (Non-Docker)
export LOG_LEVEL=debug
npm start

# Enable detailed logging (Docker)
docker-compose exec google-research-mcp sh -c "LOG_LEVEL=debug npm start"

# Check system health
npm run health-check

# Monitor performance (Docker)
docker-compose exec google-research-mcp npm run health-check
```

### **Non-Docker Production Deployment**

For production deployment without Docker:

#### **Using PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name "google-research-mcp"

# Monitor
pm2 status
pm2 logs google-research-mcp

# Auto-restart on system reboot
pm2 startup
pm2 save
```

#### **Using systemd (Linux)**
Create `/etc/systemd/system/google-research-mcp.service`:
```ini
[Unit]
Description=Google Research MCP Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/google-research-mcp-server
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/path/to/google-research-mcp-server/.env

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable google-research-mcp
sudo systemctl start google-research-mcp
sudo systemctl status google-research-mcp
```

#### **Direct Node.js (Development)**
```bash
# Simple start
npm start

# With specific environment
NODE_ENV=production LOG_LEVEL=info npm start

# Background process
nohup npm start > server.log 2>&1 &
```

### **Performance Optimization**

#### **Cache Tuning**
```bash
# For high-volume usage
SEARCH_CACHE_TTL_MINUTES=10
CONTENT_CACHE_TTL_MINUTES=60
MAX_CACHE_ENTRIES=200

# For memory-constrained environments
SEARCH_CACHE_TTL_MINUTES=2
CONTENT_CACHE_TTL_MINUTES=15
MAX_CACHE_ENTRIES=50
```

#### **Request Optimization**
```bash
# For faster responses
REQUEST_TIMEOUT_MS=15000
MAX_CONTENT_SIZE_MB=25
CONCURRENT_REQUEST_LIMIT=5

# For comprehensive extraction
REQUEST_TIMEOUT_MS=60000
MAX_CONTENT_SIZE_MB=100
CONCURRENT_REQUEST_LIMIT=15
```

## 📊 **Monitoring & Health Checks**

### **Built-in Health Monitoring**
```bash
# Check overall system health
npm run health-check

# Monitor with Docker
docker-compose exec google-research-mcp npm run health-check
```

### **Health Check Response**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production",
  "uptime": 3600000,
  "checks": {
    "googleSearch": { "status": "pass", "responseTime": 245 },
    "contentExtraction": { "status": "pass", "responseTime": 567 },
    "memory": { "status": "pass", "percentage": 45.2 }
  }
}
```

### **Monitoring Integration**
- **Prometheus metrics** available at `/metrics` (if enabled)
- **Structured logging** compatible with ELK stack
- **Docker health checks** for container orchestration

## 🔄 **Maintenance**

### **Regular Maintenance Tasks**
```bash
# Update dependencies
npm audit
npm update

# Security audit
npm run audit:security

# Dependency analysis
npm run audit:dependencies

# Container updates
docker-compose pull
docker-compose up -d
```

### **Log Management**
```bash
# View logs
docker-compose logs -f google-research-mcp

# Log rotation (configure in docker-compose.yml)
docker-compose exec google-research-mcp logrotate -f /etc/logrotate.conf
```

## 🚀 **Advanced Usage**

### **Scaling Considerations**
- **Horizontal Scaling**: Deploy multiple instances behind load balancer
- **Caching Strategy**: Consider Redis for shared caching across instances
- **Rate Limiting**: Implement distributed rate limiting for multi-instance deployments

### **Custom Configurations**
- **Research Templates**: Create custom research workflow templates
- **Content Filters**: Implement custom content filtering rules
- **Export Formats**: Add custom export format handlers

### **Integration Examples**
- **CI/CD Pipeline**: Automated research report generation
- **Slack Bot**: Real-time research queries from team chat
- **Web Dashboard**: Research workflow management interface

## 📝 **Development**

### **Development Setup**
```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build
```

### **Project Structure**
```
src/
├── config/          # Configuration management
├── handlers/        # Tool request handlers
├── services/        # Core service implementations
├── tools/           # Tool definitions and schemas
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── server.ts        # Main server entry point
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### **Getting Help**
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check `PRODUCTION_DEPLOYMENT.md` for detailed deployment guide
- **Health Checks**: Use built-in diagnostics for troubleshooting

### **Common Support Scenarios**
1. **API Setup**: Verify Google API credentials and permissions
2. **Performance Issues**: Check cache configuration and system resources
3. **Deployment Problems**: Review Docker logs and health checks
4. **Integration Questions**: Consult MCP client documentation

---

**Built with ❤️ for AI-powered research workflows**
