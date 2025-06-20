# Production Deployment Guide

## Overview

This guide covers deploying the **Unified Google Research MCP Server** in a production environment. The server now provides both search and research capabilities in a single instance with proper security, monitoring, and scalability considerations.

## Prerequisites

### Required
- Node.js 18+ 
- Docker and Docker Compose (recommended)
- Google Custom Search API key
- Google Custom Search Engine ID

### Recommended
- Reverse proxy (nginx/Apache)
- Process manager (PM2)
- Log aggregation system
- Monitoring solution (Prometheus/Grafana)

## Environment Setup

1. **Copy environment template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure required variables**:
   ```bash
   # Required - Get from Google Cloud Console
   GOOGLE_API_KEY=your_google_api_key_here
   GOOGLE_SEARCH_ENGINE_ID=your_custom_search_engine_id_here
   
   # Production settings
   NODE_ENV=production
   LOG_LEVEL=info
   ```

3. **Validate configuration**:
   ```bash
   npm run validate-config
   ```

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Build and start**:
   ```bash
   docker-compose up -d
   ```

2. **Monitor logs**:
   ```bash
   docker-compose logs -f google-research-mcp
   ```

3. **Health check**:
   ```bash
   docker-compose exec google-research-mcp npm run health-check
   ```

### Option 2: Direct Node.js Deployment

1. **Install dependencies**:
   ```bash
   npm ci --only=production
   ```

2. **Build application**:
   ```bash
   npm run build
   ```

3. **Start unified server**:
   ```bash
   # Simple start
   npm start
   
   # Or with PM2 (recommended for production)
   pm2 start dist/server.js --name "google-research-mcp-unified"
   
   # Or with systemd (Linux production)
   sudo systemctl start google-research-mcp
   ```

### Option 3: Development Mode

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start in development**:
   ```bash
   # Watch mode with auto-rebuild
   npm run dev
   
   # In another terminal, start server
   npm start
   ```

## Security Considerations

### API Key Management
- Store API keys in environment variables, never in code
- Use secrets management systems (AWS Secrets Manager, HashiCorp Vault)
- Rotate API keys regularly
- Monitor API usage and set up alerts

### Rate Limiting
- Built-in rate limiting is configured (100 requests/minute by default)
- Consider additional reverse proxy rate limiting
- Monitor for abuse patterns

### Network Security
- Run behind reverse proxy with SSL termination
- Use Docker networks to isolate services
- Implement proper firewall rules
- Consider VPN access for sensitive deployments

## Monitoring and Observability

### Health Checks
- Built-in health check endpoint
- Monitors Google API connectivity
- Tracks memory usage and performance
- Docker health checks configured

### Logging
- Structured JSON logging in production
- Log rotation configured
- Separate log levels (error, warn, info, debug)
- Integration with log aggregation systems

### Metrics
- Response time tracking
- Cache hit/miss ratios
- Rate limiting metrics
- Error rate monitoring

## Performance Optimization

### Caching Strategy
- Search results cached for 5 minutes
- Content extraction cached for 30 minutes
- Configurable cache sizes and TTL
- Memory-based caching (consider Redis for scale)

### Resource Limits
- Memory usage monitoring
- Request timeout controls
- Concurrent request limiting
- Content size restrictions

## Scaling Considerations

### Horizontal Scaling
- Stateless design allows multiple instances
- Load balancer configuration needed
- Shared cache consideration (Redis)
- Session affinity not required

### Vertical Scaling
- Monitor memory usage patterns
- CPU utilization tracking
- Adjust cache sizes based on usage
- Container resource limits

## Backup and Recovery

### Data Backup
- No persistent data storage required
- Configuration backup essential
- API key backup/rotation plan
- Cache can be rebuilt automatically

### Disaster Recovery
- Container image versioning
- Configuration as code
- Automated deployment scripts
- Health check based recovery

## Maintenance

### Updates
- Regular dependency updates
- Security patch management
- API version compatibility
- Rollback procedures

### Monitoring
- Set up alerts for:
  - API failures
  - High memory usage
  - Rate limit exceeded
  - Response time degradation

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   - Verify key in Google Cloud Console
   - Check API quotas and billing
   - Ensure Custom Search API is enabled

2. **High Memory Usage**
   - Adjust cache sizes
   - Monitor content extraction sizes
   - Consider memory leak detection

3. **Rate Limiting**
   - Monitor API usage patterns
   - Adjust rate limits if needed
   - Implement request queuing

4. **Content Extraction Failures**
   - Check target website accessibility
   - Verify user agent configuration
   - Monitor timeout settings

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
npm run start:modular
```

### Health Check
```bash
# Manual health check
curl http://localhost:3000/health
```

## Support

For production issues:
1. Check logs first
2. Verify environment configuration
3. Test API connectivity
4. Monitor resource usage
5. Review rate limiting status

Remember to never commit API keys or sensitive configuration to version control.