import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type UnsplashPhoto = {
  id: string;
  description?: string;
  alt_description?: string;
  user?: { name?: string; username?: string };
  urls: { raw: string; full: string; regular: string; small: string; thumb: string };
  links?: { html?: string };
};

export class UnsplashProvider extends BaseProvider {
  readonly name = 'Unsplash';
  readonly mediaType: MediaType = 'images';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const per_page = options.pageSize ?? 24;

    const headers: Record<string, string> = {};
    if (this.config.apiKey && this.config.apiKey !== 'YOUR_UNSPLASH_API_KEY') {
      headers['Authorization'] = `Client-ID ${this.config.apiKey}`;
    }

    const data = await this.getJson(
      '/search/photos',
      { query, page, per_page },
      headers,
    );

    const items: MediaItem[] = (data?.results || []).map((p: UnsplashPhoto) => ({
      id: p.id,
      type: 'images',
      title: p.description || p.alt_description || 'Unsplash Image',
      author: p.user?.name || p.user?.username,
      thumbnailUrl: p.urls.thumb,
      previewUrl: p.urls.small,
      contentUrl: p.urls.regular,
      metadata: { pageUrl: p.links?.html },
      license: 'Unsplash License',
    }));

    const total = data?.total || undefined;
    const hasMore = page * per_page < (data?.total || 0);
    return { items, page, pageSize: per_page, total, hasMore };
  }
}

