/**
 * Health check utility for monitoring system status
 */

import { GoogleSearchService } from '../services/google-search.service.js';
import { ContentExtractor } from '../services/content-extractor.service.js';
import { logger } from './logger.js';
import { getEnvironmentConfig } from '../config/environment.js';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      responseTime?: number;
      message?: string;
      details?: any;
    };
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export class HealthChecker {
  private static instance: HealthChecker;
  private startTime: number;
  private googleSearchService: GoogleSearchService;
  private contentExtractor: ContentExtractor;

  private constructor() {
    this.startTime = Date.now();
    this.googleSearchService = new GoogleSearchService();
    this.contentExtractor = new ContentExtractor();
  }

  public static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const config = getEnvironmentConfig();
    const checks: HealthCheckResult['checks'] = {};
    
    // Environment check
    const envCheck = await this.checkEnvironment();
    checks.environment = envCheck;

    // Google Search API check
    const searchCheck = await this.checkGoogleSearchAPI();
    checks.googleSearch = searchCheck;

    // Content extraction check
    const contentCheck = await this.checkContentExtraction();
    checks.contentExtraction = contentCheck;

    // Memory check
    const memoryCheck = this.checkMemoryUsage();
    checks.memory = memoryCheck;

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    const warnChecks = Object.values(checks).filter(check => check.status === 'warn');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const memory = process.memoryUsage();
    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0', // Should come from package.json
      environment: config.nodeEnv,
      checks,
      uptime: Date.now() - this.startTime,
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      }
    };

    logger.info('Health check completed', { status: overallStatus });
    return result;
  }

  private async checkEnvironment(): Promise<HealthCheckResult['checks'][string]> {
    try {
      const config = getEnvironmentConfig();
      const requiredVars = ['googleApiKey', 'googleSearchEngineId'];
      const missing = requiredVars.filter(key => !config[key as keyof typeof config]);
      
      if (missing.length > 0) {
        return {
          status: 'fail',
          message: `Missing required environment variables: ${missing.join(', ')}`
        };
      }

      return {
        status: 'pass',
        message: 'All required environment variables are present'
      };
    } catch (error) {
      return {
        status: 'fail',
        message: `Environment check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkGoogleSearchAPI(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();
    
    try {
      // Perform a simple search to test API connectivity
      const result = await this.googleSearchService.search('test', 1);
      const responseTime = Date.now() - startTime;
      
      if (result.results.length >= 0) { // Even 0 results is OK, means API is working
        return {
          status: 'pass',
          responseTime,
          message: 'Google Search API is responsive'
        };
      } else {
        return {
          status: 'warn',
          responseTime,
          message: 'Google Search API responded but returned unexpected results'
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'fail',
        responseTime,
        message: `Google Search API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkContentExtraction(): Promise<HealthCheckResult['checks'][string]> {
    const startTime = Date.now();
    
    try {
      // Test content extraction with a reliable URL
      const testUrl = 'https://example.com';
      const result = await this.contentExtractor.extractContent(testUrl, 'text');
      const responseTime = Date.now() - startTime;
      
      if (result.content && result.content.length > 0) {
        return {
          status: 'pass',
          responseTime,
          message: 'Content extraction is working'
        };
      } else {
        return {
          status: 'warn',
          responseTime,
          message: 'Content extraction responded but returned empty content'
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'fail',
        responseTime,
        message: `Content extraction check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private checkMemoryUsage(): HealthCheckResult['checks'][string] {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / (1024 * 1024);
    const heapTotalMB = memory.heapTotal / (1024 * 1024);
    const percentage = (memory.heapUsed / memory.heapTotal) * 100;
    
    let status: 'pass' | 'warn' | 'fail';
    let message: string;
    
    if (percentage > 90) {
      status = 'fail';
      message = `Memory usage critically high: ${percentage.toFixed(2)}%`;
    } else if (percentage > 75) {
      status = 'warn';
      message = `Memory usage high: ${percentage.toFixed(2)}%`;
    } else {
      status = 'pass';
      message = `Memory usage normal: ${percentage.toFixed(2)}%`;
    }
    
    return {
      status,
      message,
      details: {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        percentage: percentage.toFixed(2)
      }
    };
  }
}

// Export singleton instance
export const healthChecker = HealthChecker.getInstance();