import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type StockManifest = { items: MediaItem[] };

/**
 * StockMediaProvider - loads local stock media manifest and filters by type/query.
 */
export class StockMediaProvider extends BaseProvider {
  readonly name = 'StockMedia';
  readonly mediaType: MediaType = 'files';
  private manifestCache: StockManifest | null = null;

  private async loadManifest(): Promise<StockManifest> {
    if (this.manifestCache) return this.manifestCache;
    let url: string | null = null;
    try {
      // Prefer Vite-resolved asset URL (works in build and dev)
      url = new URL('../../../assets/stock_media/manifest.json', import.meta.url).href;
      let res = await fetch(url);
      if (!res.ok) throw new Error('primary fetch failed');
      const data = await res.json();
      this.manifestCache = data;
      return data;
    } catch {
      try {
        // Fallback to absolute /src path for dev servers
        url = '/src/assets/stock_media/manifest.json';
        const res2 = await fetch(url);
        if (!res2.ok) throw new Error('fallback fetch failed');
        const data2 = await res2.json();
        this.manifestCache = data2;
        return data2;
      } catch {
        // Final fallback: minimal inline stock entries using resolved icon
        const icon = new URL('../../../assets/logo/octopus-logo.png', import.meta.url).href;
        const data3: StockManifest = {
          items: [
            { id: 'img-fallback', type: 'images', title: 'Fallback Image', thumbnailUrl: icon, previewUrl: icon, contentUrl: icon, author: 'Stock' },
            { id: 'txt-fallback', type: 'text', title: 'Sample text item', author: 'Stock' }
          ]
        };
        this.manifestCache = data3;
        return data3;
      }
    }
  }

  async search(query: string, options: SearchQueryOptions & { type?: MediaType } = {}): Promise<SearchResult> {
    const type = (options as any).type as MediaType | undefined;
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 24;
    const q = (query || '').toLowerCase();

    const data = await this.loadManifest();
    let items = data.items.slice();
    // Treat 'files' as aggregate (all types)
    if (type && type !== 'files') items = items.filter(i => i.type === type);
    if (q) items = items.filter(i => (i.title || '').toLowerCase().includes(q));

    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    return {
      items: paged,
      page,
      pageSize,
      total: items.length,
      hasMore: start + pageSize < items.length,
    };
  }
}
