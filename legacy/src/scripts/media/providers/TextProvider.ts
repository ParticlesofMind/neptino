import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type QuotableResult = { count: number; totalCount?: number; results: { _id: string; content: string; author: string }[] };

export class TextProvider extends BaseProvider {
  readonly name = 'Quotable';
  readonly mediaType: MediaType = 'text';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    // Quotable has CORS and doesn't require auth
    const url = `https://api.quotable.io/search/quotes`;
    const data: QuotableResult = await fetch(`${url}?query=${encodeURIComponent(query)}&page=${page}&limit=${pageSize}`)
      .then(r => r.json());

    const items: MediaItem[] = (data?.results || []).map(q => ({
      id: q._id,
      type: 'text',
      title: q.content,
      author: q.author,
      metadata: { source: 'Quotable' },
    }));

    const total = data?.totalCount ?? data?.count;
    const hasMore = (page * pageSize) < (total || 0);
    return { items, page, pageSize, total, hasMore };
  }
}

