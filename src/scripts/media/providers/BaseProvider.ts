import { MediaProvider, MediaType, ProviderConfig, SearchQueryOptions, SearchResult } from '../types';
import { MediaCache } from '../cache/MediaCache';
import { RateLimitManager } from '../RateLimitManager';

export abstract class BaseProvider implements MediaProvider {
  abstract readonly name: string;
  abstract readonly mediaType: MediaType;

  protected config: ProviderConfig;
  protected cache: MediaCache<SearchResult>;
  protected rateLimiter: RateLimitManager;
  protected providerKey: string;

  constructor(providerKey: string, config: ProviderConfig, cache: MediaCache<SearchResult>, rateLimiter: RateLimitManager) {
    this.providerKey = providerKey;
    this.config = config;
    this.cache = cache;
    this.rateLimiter = rateLimiter;
    if (config.rateLimitPerMinute) {
      this.rateLimiter.configure(providerKey, config.rateLimitPerMinute);
    }
  }

  abstract search(query: string, options?: SearchQueryOptions): Promise<SearchResult>;

  protected makeCacheKey(path: string, params?: Record<string, any>) {
    const normalized = JSON.stringify(params || {});
    return `${this.providerKey}:${path}:${normalized}`;
  }

  protected async getJson(path: string, params: Record<string, any>, headers?: Record<string, string>, cacheTtlMs?: number): Promise<any> {
    // Robust path join to preserve base path segments (e.g., /apiv2)
    const base = (this.config.baseUrl || '').replace(/\/$/, '');
    const normalizedPath = (path || '').replace(/^\//, '');
    const full = base ? `${base}/${normalizedPath}` : normalizedPath;
    const url = new URL(full);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });

    const cacheKey = this.makeCacheKey(url.pathname, Object.fromEntries(url.searchParams.entries()));
    const cached = this.cache.get(cacheKey);
    if (cached) return cached as any;

    const req = async () => {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${this.name} request failed: ${res.status} ${res.statusText} ${body}`);
      }
      return res.json();
    };

    // Use rate limiter for the provider
    const data = await this.rateLimiter.request(this.providerKey, req);
    return data;
  }
}
