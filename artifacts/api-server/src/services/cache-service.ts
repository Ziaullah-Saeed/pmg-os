interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class LRUCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (this.cache.has(key)) this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + "%"
        : "0%",
    };
  }
}

const TTL = {
  AI_RESPONSE: 5 * 60 * 1000,
  ENRICHMENT: 15 * 60 * 1000,
  KNOWLEDGE: 10 * 60 * 1000,
  DASHBOARD: 30 * 1000,
  TEMPLATE: 30 * 60 * 1000,
  USER: 5 * 60 * 1000,
} as const;

const globalCache = new LRUCache(1000);

export function cacheGet<T>(key: string): T | undefined {
  return globalCache.get<T>(key);
}

export function cacheSet<T>(key: string, value: T, ttlMs?: number): void {
  globalCache.set(key, value, ttlMs ?? TTL.DASHBOARD);
}

export function cacheInvalidate(key: string): boolean {
  return globalCache.invalidate(key);
}

export function cacheInvalidatePattern(pattern: string): number {
  return globalCache.invalidatePattern(pattern);
}

export function cacheClear(): void {
  globalCache.clear();
}

export function cacheStats() {
  return globalCache.stats();
}

export async function cacheWrap<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = globalCache.get<T>(key);
  if (cached !== undefined) return cached;
  const result = await fn();
  globalCache.set(key, result, ttlMs);
  return result;
}

export { TTL };
