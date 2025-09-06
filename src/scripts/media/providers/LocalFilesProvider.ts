import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

function detectType(mime: string): MediaType {
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'videos';
  return 'files';
}

export class LocalFilesProvider extends BaseProvider {
  readonly name = 'LocalFiles';
  readonly mediaType: MediaType = 'files';
  private items: MediaItem[] = [];

  ingestFiles(files: File[]) {
    const newItems: MediaItem[] = Array.from(files).map((f, idx) => {
      const url = URL.createObjectURL(f);
      const type = detectType(f.type);
      const item: MediaItem = {
        id: `${Date.now()}_${idx}_${f.name}`,
        type,
        title: f.name,
        filesize: f.size,
        previewUrl: url,
        contentUrl: url,
        metadata: { mime: f.type, lastModified: f.lastModified },
      };
      return item;
    });
    // Append to existing (keeps session results)
    this.items.push(...newItems);
  }

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 24;
    const q = (query || '').toLowerCase();
    const filtered = q ? this.items.filter(i => (i.title || '').toLowerCase().includes(q)) : this.items.slice();
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    const hasMore = start + pageSize < filtered.length;
    return { items, page, pageSize, total: filtered.length, hasMore };
  }
}

