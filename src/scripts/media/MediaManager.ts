import { MediaProvider, MediaType, SearchQueryOptions, SearchResult } from './types';
import { MediaCache } from './cache/MediaCache';
import { RateLimitManager } from './RateLimitManager';
import { resolveConfig } from './config';
import { FreesoundProvider } from './providers/FreesoundProvider';
import { UnsplashProvider } from './providers/UnsplashProvider';
import { VideoProvider } from './providers/VideoProvider';
import { PixabayVideoProvider } from './providers/PixabayVideoProvider';
import { PexelsVideoProvider } from './providers/PexelsVideoProvider';
import { TextProvider } from './providers/TextProvider';
import { LocalFilesProvider } from './providers/LocalFilesProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';
import { DropboxProvider } from './providers/DropboxProvider';

export class MediaManager {
  private providers = new Map<string, MediaProvider>();
  private cache = new MediaCache<SearchResult>(1000 * 60 * 5);
  private rateLimiter = new RateLimitManager();
  private initialized = false;

  constructor() {}

  init() {
    if (this.initialized) return;
    const env = resolveConfig();

    // Lazy provider factories (registered but initialized when used)
    this.register('audio:freesound', () => new FreesoundProvider('freesound', env.freesound, this.cache, this.rateLimiter));
    this.register('images:unsplash', () => new UnsplashProvider('unsplash', env.unsplash, this.cache, this.rateLimiter));
    this.register('videos:pixabay', () => new PixabayVideoProvider('pixabay', env.pixabay as any, this.cache, this.rateLimiter));
    this.register('videos:pexels', () => new PexelsVideoProvider('pexels', env.pexels as any, this.cache, this.rateLimiter));
    this.register('videos:default', () => new VideoProvider('videos', { rateLimitPerMinute: 60 }, this.cache, this.rateLimiter));
    this.register('text:quotable', () => new TextProvider('quotable', {}, this.cache, this.rateLimiter));
    this.register('files:local', () => new LocalFilesProvider('localfiles', {}, this.cache, this.rateLimiter));
    this.register('files:google-drive', () => new GoogleDriveProvider('googledrive', env.googleDrive as any, this.cache, this.rateLimiter));
    this.register('files:dropbox', () => new DropboxProvider('dropbox', env.dropbox as any, this.cache, this.rateLimiter));
    this.initialized = true;
  }

  private factories = new Map<string, () => MediaProvider>();

  private register(key: string, factory: () => MediaProvider) {
    this.factories.set(key, factory);
  }

  private getProvider(key: string): MediaProvider {
    let p = this.providers.get(key);
    if (!p) {
      const factory = this.factories.get(key);
      if (!factory) throw new Error(`Provider not registered: ${key}`);
      p = factory();
      this.providers.set(key, p);
    }
    return p;
  }

  // Map media type to default provider keys
  private resolveDefaultProvider(mediaType: MediaType): string | null {
    switch (mediaType) {
      case 'audio': return 'audio:freesound';
      case 'images': return 'images:unsplash';
      case 'videos': return 'videos:pixabay';
      case 'text': return 'text:quotable';
      default: return null;
    }
  }

  async search(mediaType: MediaType, query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    if (!this.initialized) this.init();
    const key = this.resolveDefaultProvider(mediaType);
    if (!key) return { items: [], page: options.page ?? 1, pageSize: options.pageSize ?? 20, hasMore: false };
    const provider = this.getProvider(key);
    return provider.search(query, options);
  }

  async searchAll(query: string): Promise<{ provider: string; result: SearchResult }[]> {
    if (!this.initialized) this.init();
    const keys = Array.from(this.factories.keys());
    const providers = keys.map(k => ({ k, p: this.getProvider(k) }));
    const promises = providers.map(({ k, p }) => p.search(query).then(result => ({ provider: k, result })).catch(err => ({ provider: k, result: { items: [], page: 1, pageSize: 20, hasMore: false } })));
    return Promise.all(promises);
  }

  async searchWithProvider(providerKey: string, query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    if (!this.initialized) this.init();
    const provider = this.getProvider(providerKey);
    return provider.search(query, options);
  }

  listProvidersFor(mediaType: MediaType): { key: string; label: string }[] {
    const entries: { key: string; label: string }[] = [];
    const add = (key: string, label: string) => entries.push({ key, label });
    switch (mediaType) {
      case 'audio':
        add('audio:freesound', 'Freesound');
        break;
      case 'images':
        add('images:unsplash', 'Unsplash');
        break;
      case 'videos':
        add('videos:pixabay', 'Pixabay');
        add('videos:pexels', 'Pexels');
        add('videos:default', 'Generic');
        break;
      case 'text':
        add('text:quotable', 'Quotable');
        break;
      case 'files':
        add('files:local', 'Local Upload');
        add('files:google-drive', 'Google Drive');
        add('files:dropbox', 'Dropbox');
        break;
    }
    return entries;
  }

  ingestLocalFiles(files: File[] | FileList) {
    if (!this.initialized) this.init();
    const provider = this.getProvider('files:local') as unknown as LocalFilesProvider;
    provider.ingestFiles(Array.from(files as any));
  }
}

export const mediaManager = new MediaManager();
