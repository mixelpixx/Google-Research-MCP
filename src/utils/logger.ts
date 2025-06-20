/**
 * Production-ready logging utility
 */

import { getEnvironmentConfig } from '../config/environment.js';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    const config = getEnvironmentConfig();
    this.isDevelopment = config.nodeEnv === 'development';
    this.logLevel = this.parseLogLevel(config.logLevel);
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      return `${baseMessage} ${JSON.stringify(meta)}`;
    }
    
    return baseMessage;
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any): void {
    if (level > this.logLevel) return;

    const formattedMessage = this.formatMessage(levelName, message, meta);
    
    // In production, use console.error for all logs to ensure they appear in stderr
    // In development, use appropriate console methods
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    } else {
      // In production, always use console.error to ensure logs go to stderr
      console.error(formattedMessage);
    }
  }

  public error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  public info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  // Convenience methods for common logging scenarios
  public logRequest(method: string, url: string, duration?: number): void {
    const meta = duration ? { duration: `${duration}ms` } : undefined;
    this.info(`${method} ${url}`, meta);
  }

  public logError(error: Error, context?: string): void {
    const meta = {
      error: error.message,
      stack: error.stack,
      context: context || 'unknown'
    };
    this.error(`Error occurred: ${error.message}`, meta);
  }

  public logCacheHit(key: string): void {
    this.debug(`Cache hit: ${key}`);
  }

  public logCacheMiss(key: string): void {
    this.debug(`Cache miss: ${key}`);
  }

  public logServiceCall(service: string, method: string, params?: any): void {
    const meta = params ? { params } : undefined;
    this.debug(`Service call: ${service}.${method}`, meta);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();