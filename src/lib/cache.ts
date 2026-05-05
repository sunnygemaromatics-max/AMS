interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    this.cache.set(key, entry);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Set multiple entries at once
  setMany<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => this.set(key, data, ttl));
  }

  // Get multiple entries at once
  getMany<T>(keys: string[]): Array<{ key: string; data: T | null }> {
    return keys.map(key => ({
      key,
      data: this.get<T>(key),
    }));
  }
}

// Create cache instances for different purposes
export const apiCache = new RequestCache(5 * 60 * 1000); // 5 minutes for API calls
export const staticCache = new RequestCache(60 * 60 * 1000); // 1 hour for static data
export const userCache = new RequestCache(10 * 60 * 1000); // 10 minutes for user data

// Cleanup expired entries every 5 minutes
setInterval(() => {
  apiCache.cleanup();
  staticCache.cleanup();
  userCache.cleanup();
}, 5 * 60 * 1000);

// Enhanced fetch with caching
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  cache: RequestCache = apiCache,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    // If fetch fails, try to return stale cached data if available
    const staleData = cache.get<T>(`${key}_stale`);
    if (staleData !== null) {
      console.warn(`Using stale cache data for ${key} due to fetch error:`, error);
      return staleData;
    }
    throw error;
  }
}

// React Query cache configuration
export const queryCacheConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
};

// Cache invalidation utilities
export const cacheKeys = {
  assets: 'assets',
  assetsList: 'assets-list',
  employees: 'employees',
  employeesList: 'employees-list',
  locations: 'locations',
  locationsList: 'locations-list',
  licenses: 'licenses',
  licensesList: 'licenses-list',
  dashboard: 'dashboard',
  user: (id: string) => `user-${id}`,
  userProfile: (id: string) => `user-profile-${id}`,
  asset: (id: string) => `asset-${id}`,
  employee: (id: string) => `employee-${id}`,
};

// Cache invalidation helper
export function invalidateCache(pattern: string | string[]): void {
  const patterns = Array.isArray(pattern) ? pattern : [pattern];
  
  patterns.forEach(pattern => {
    if (pattern.includes('*')) {
      // Wildcard pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      apiCache.keys().forEach(key => {
        if (regex.test(key)) {
          apiCache.delete(key);
        }
      });
    } else {
      // Exact match
      apiCache.delete(pattern);
    }
  });
}

// Prefetching utility
export async function prefetchData<T>(
  keys: string[],
  fetcher: (key: string) => Promise<T>,
  cache: RequestCache = apiCache
): Promise<void> {
  const uncachedKeys = keys.filter(key => !cache.has(key));
  
  const prefetchPromises = uncachedKeys.map(async (key) => {
    try {
      const data = await fetcher(key);
      cache.set(key, data);
    } catch (error) {
      console.warn(`Failed to prefetch data for ${key}:`, error);
    }
  });

  await Promise.allSettled(prefetchPromises);
}

// Cache warming for common queries
export function warmCache(): void {
  // This can be called on app startup to warm up cache with common data
  console.log('Warming up cache...');
  
  // Common dashboard data
  const commonKeys = [
    cacheKeys.assetsList,
    cacheKeys.employeesList,
    cacheKeys.locationsList,
    cacheKeys.dashboard,
  ];

  // Prefetch can be called with actual fetchers in components
  console.log('Cache warmed with keys:', commonKeys);
}

// Cache monitoring and analytics
export function getCacheStats() {
  return {
    api: {
      size: apiCache.size(),
      keys: apiCache.keys(),
    },
    static: {
      size: staticCache.size(),
      keys: staticCache.keys(),
    },
    user: {
      size: userCache.size(),
      keys: userCache.keys(),
    },
  };
}

// Export cache utilities for use in components
export { RequestCache };
