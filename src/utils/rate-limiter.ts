/**
 * Rate limiting utility for production deployment
 */

import { getEnvironmentConfig } from '../config/environment.js';
import { logger } from './logger.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private requestCounts: Map<string, RateLimitEntry> = new Map();
  private windowMs: number;
  private maxRequests: number;

  private constructor() {
    const config = getEnvironmentConfig();
    this.windowMs = config.rateLimitWindowMs;
    this.maxRequests = config.rateLimitMaxRequests;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requestCounts.entries()) {
      if (now - entry.windowStart > this.windowMs) {
        this.requestCounts.delete(key);
      }
    }
  }

  public checkLimit(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const entry = this.requestCounts.get(identifier);

    if (!entry) {
      // First request in this window
      this.requestCounts.set(identifier, {
        count: 1,
        windowStart: now
      });
      return { allowed: true };
    }

    // Check if we're in a new window
    if (now - entry.windowStart > this.windowMs) {
      // Reset for new window
      this.requestCounts.set(identifier, {
        count: 1,
        windowStart: now
      });
      return { allowed: true };
    }

    // Check if we've exceeded the limit
    if (entry.count >= this.maxRequests) {
      const resetTime = entry.windowStart + this.windowMs;
      logger.warn(`Rate limit exceeded for ${identifier}`, {
        count: entry.count,
        limit: this.maxRequests,
        resetTime: new Date(resetTime).toISOString()
      });
      return { allowed: false, resetTime };
    }

    // Increment counter
    entry.count++;
    return { allowed: true };
  }

  public getRemainingRequests(identifier: string): number {
    const entry = this.requestCounts.get(identifier);
    if (!entry) return this.maxRequests;
    
    const now = Date.now();
    if (now - entry.windowStart > this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - entry.count);
  }

  public getStats(): { totalTracked: number; windowMs: number; maxRequests: number } {
    return {
      totalTracked: this.requestCounts.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests
    };
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();