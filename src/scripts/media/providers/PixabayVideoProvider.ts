import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type PixabayVideoHit = {
  id: number;
  pageURL: string;
  tags: string;
  user: string;
  videos: {
    large?: { url: string; width: number; height: number; size: number };
    medium?: { url: string; width: number; height: number; size: number };
    small?: { url: string; width: number; height: number; size: number };
    tiny?: { url: string; width: number; height: number; size: number };
  };
  picture_id?: string;
};

export class PixabayVideoProvider extends BaseProvider {
  readonly name = 'Pixabay';
  readonly mediaType: MediaType = 'videos';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const per_page = options.pageSize ?? 20;

    if (!this.config.apiKey || this.config.apiKey === 'YOUR_PIXABAY_KEY') {
      throw new Error('Pixabay API key missing. Set VITE_PIXABAY_KEY in .env');
    }

    const params = new URLSearchParams({
      key: String(this.config.apiKey),
      q: query || '',
      page: String(page),
      per_page: String(per_page),
      safesearch: 'true',
      video_type: 'all',
      pretty: 'false',
    });

    const url = `${this.config.baseUrl || 'https://pixabay.com'}/api/videos/?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Pixabay request failed: ${res.status} ${res.statusText} ${body}`);
    }
    const data = await res.json();

    const items: MediaItem[] = (data?.hits || []).map((h: PixabayVideoHit) => {
      const preview = h.videos?.tiny?.url || h.videos?.small?.url || h.videos?.medium?.url;
      const best = h.videos?.medium?.url || h.videos?.large?.url || h.videos?.small?.url || h.videos?.tiny?.url;
      return {
        id: String(h.id),
        type: 'videos',
        title: h.tags || 'Pixabay Video',
        author: h.user,
        previewUrl: preview,
        contentUrl: best,
        thumbnailUrl: h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg` : undefined,
        metadata: { pageUrl: h.pageURL },
        license: 'Pixabay License',
      };
    });

    const total = data?.totalHits || undefined;
    const hasMore = page * per_page < (data?.totalHits || 0);
    return { items, page, pageSize: per_page, total, hasMore };
  }
}

