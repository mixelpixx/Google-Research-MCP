# Multi-stage Docker build for production deployment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcpserver -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy environment example for reference
COPY .env.example ./

# Change ownership to non-root user
RUN chown -R mcpserver:nodejs /app

# Switch to non-root user
USER mcpserver

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "
    const { healthChecker } = require('./dist/utils/health-check.js');
    healthChecker.performHealthCheck()
      .then(result => process.exit(result.status === 'healthy' ? 0 : 1))
      .catch(() => process.exit(1));
  "

# Start the application
CMD ["node", "dist/server.js"]