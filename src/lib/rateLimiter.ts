interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.storage.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.storage.set(key, newEntry);
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.storage.delete(key);
    } else {
      this.storage.clear();
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key);
      }
    }
  }
}

// Create rate limiters for different operations
export const authRateLimiter = new RateLimiter(5, 60000); // 5 auth attempts per minute
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 API requests per minute
export const uploadRateLimiter = new RateLimiter(10, 300000); // 10 uploads per 5 minutes
export const exportRateLimiter = new RateLimiter(20, 3600000); // 20 exports per hour

// Cleanup expired entries every 5 minutes
setInterval(() => {
  authRateLimiter.cleanup();
  apiRateLimiter.cleanup();
  uploadRateLimiter.cleanup();
  exportRateLimiter.cleanup();
}, 300000);

// Rate limiting hook for React components
export function useRateLimit(limiter: RateLimiter, key: string) {
  const checkRateLimit = () => {
    return limiter.isAllowed(key);
  };

  return { checkRateLimit };
}

// Rate limiting middleware for API calls
export function withRateLimit<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  limiter: RateLimiter,
  getKey: (...args: T) => string
) {
  return async (...args: T): Promise<R> => {
    const key = getKey(...args);
    const { allowed, remaining, resetTime } = limiter.isAllowed(key);

    if (!allowed) {
      const error = new Error('Rate limit exceeded');
      (error as any).rateLimitInfo = { remaining, resetTime };
      throw error;
    }

    return fn(...args);
  };
}
