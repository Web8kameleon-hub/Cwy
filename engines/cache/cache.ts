import { GraphSnapshot } from "../../schema/types";
import { OverviewData } from "../overview/overview";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CWYCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5000; // 5 seconds default

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl;
  }
}

export const cache = new CWYCache();

// Helper functions for common cache operations
export function getCachedSnapshot(): GraphSnapshot | null {
  return cache.get<GraphSnapshot>("last_snapshot");
}

export function setCachedSnapshot(snapshot: GraphSnapshot, ttl: number = 10000): void {
  cache.set("last_snapshot", snapshot, ttl);
}

export function getCachedOverview(): OverviewData | null {
  return cache.get<OverviewData>("overview");
}

export function setCachedOverview(overview: OverviewData, ttl: number = 5000): void {
  cache.set("overview", overview, ttl);
}

export function invalidateCache(): void {
  cache.invalidateAll();
}
