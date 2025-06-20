/**
 * Environment configuration and validation
 */

export interface EnvironmentConfig {
  // Google API
  googleApiKey: string;
  googleSearchEngineId: string;
  
  // Server
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  serverPort: number;
  
  // Cache
  searchCacheTtlMinutes: number;
  contentCacheTtlMinutes: number;
  maxCacheEntries: number;
  
  // Request Configuration
  requestTimeoutMs: number;
  maxContentSizeMb: number;
  concurrentRequestLimit: number;
  
  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  public getConfig(): EnvironmentConfig {
    if (!this.config) {
      this.config = this.validateAndLoadConfig();
    }
    return this.config;
  }

  private validateAndLoadConfig(): EnvironmentConfig {
    const requiredVars = ['GOOGLE_API_KEY', 'GOOGLE_SEARCH_ENGINE_ID'];
    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return {
      // Google API - Required
      googleApiKey: process.env.GOOGLE_API_KEY!,
      googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID!,
      
      // Server Configuration
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      serverPort: parseInt(process.env.SERVER_PORT || '3000', 10),
      
      // Cache Configuration
      searchCacheTtlMinutes: parseInt(process.env.SEARCH_CACHE_TTL_MINUTES || '5', 10),
      contentCacheTtlMinutes: parseInt(process.env.CONTENT_CACHE_TTL_MINUTES || '30', 10),
      maxCacheEntries: parseInt(process.env.MAX_CACHE_ENTRIES || '100', 10),
      
      // Request Configuration
      requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
      maxContentSizeMb: parseInt(process.env.MAX_CONTENT_SIZE_MB || '50', 10),
      concurrentRequestLimit: parseInt(process.env.CONCURRENT_REQUEST_LIMIT || '10', 10),
      
      // Rate Limiting
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    };
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const config = this.getConfig();
      
      // Validate Google API credentials format
      if (!config.googleApiKey || config.googleApiKey.length < 20) {
        errors.push('GOOGLE_API_KEY appears to be invalid (too short)');
      }
      
      if (!config.googleSearchEngineId || !/^[a-f0-9]{10,}$/.test(config.googleSearchEngineId)) {
        errors.push('GOOGLE_SEARCH_ENGINE_ID appears to be invalid format');
      }
      
      // Validate numeric ranges
      if (config.serverPort < 1000 || config.serverPort > 65535) {
        errors.push('SERVER_PORT must be between 1000 and 65535');
      }
      
      if (config.searchCacheTtlMinutes < 1 || config.searchCacheTtlMinutes > 1440) {
        errors.push('SEARCH_CACHE_TTL_MINUTES must be between 1 and 1440 (24 hours)');
      }
      
      if (config.maxCacheEntries < 10 || config.maxCacheEntries > 1000) {
        errors.push('MAX_CACHE_ENTRIES must be between 10 and 1000');
      }
      
      if (config.requestTimeoutMs < 5000 || config.requestTimeoutMs > 300000) {
        errors.push('REQUEST_TIMEOUT_MS must be between 5000 and 300000 (5 minutes)');
      }
      
    } catch (error) {
      errors.push(`Configuration validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const environmentConfig = EnvironmentValidator.getInstance();

// Helper function for easy access
export function getEnvironmentConfig(): EnvironmentConfig {
  return environmentConfig.getConfig();
}

// Validation helper
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  return environmentConfig.validateConfig();
}