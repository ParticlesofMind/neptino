export type MediaType = 'audio' | 'images' | 'videos' | 'text' | 'files' | 'plugins' | 'links';

export interface SearchQueryOptions {
  page?: number;
  pageSize?: number;
  // Audio specific
  minDurationSec?: number;
  maxDurationSec?: number;
  format?: 'mp3' | 'ogg' | 'wav' | string;
  license?: string;
  // Advanced audio
  minBitrateKbps?: number;
  maxBitrateKbps?: number;
  minSamplerateHz?: number;
  maxSamplerateHz?: number;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  previewUrl?: string; // audio/image preview
  contentUrl?: string; // original or download URL
  author?: string;
  license?: string;
  durationSec?: number;
  filesize?: number;
  metadata?: Record<string, any>;
}

export interface SearchResult {
  items: MediaItem[];
  page: number;
  pageSize: number;
  total?: number;
  hasMore: boolean;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  rateLimitPerMinute?: number; // simple rate limiter
}

export interface MediaProvider {
  readonly name: string;
  readonly mediaType: MediaType;
  search(query: string, options?: SearchQueryOptions): Promise<SearchResult>;
}
