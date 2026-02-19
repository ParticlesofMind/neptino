import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type PexelsVideo = {
  id: number;
  url: string;
  image: string;
  user?: { name?: string; url?: string };
  video_files: { link: string; quality: string; width: number; height: number; file_type: string }[];
};

export class PexelsVideoProvider extends BaseProvider {
  readonly name = 'Pexels';
  readonly mediaType: MediaType = 'videos';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const per_page = options.pageSize ?? 20;

    if (!this.config.apiKey || this.config.apiKey === 'YOUR_PEXELS_KEY') {
      throw new Error('Pexels API key missing. Set VITE_PEXELS_KEY in .env');
    }

    const url = new URL('/videos/search', this.config.baseUrl || 'https://api.pexels.com');
    url.searchParams.set('query', query || '');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(per_page));

    const res = await fetch(url.toString(), {
      headers: { Authorization: String(this.config.apiKey) },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Pexels request failed: ${res.status} ${res.statusText} ${body}`);
    }
    const data = await res.json();

    const items: MediaItem[] = (data?.videos || []).map((v: PexelsVideo) => {
      const file = v.video_files?.find(f => f.quality === 'sd') || v.video_files?.[0];
      return {
        id: String(v.id),
        type: 'videos',
        title: 'Pexels Video',
        author: v.user?.name,
        thumbnailUrl: v.image,
        previewUrl: file?.link,
        contentUrl: file?.link,
        metadata: { pageUrl: v.url },
        license: 'Pexels License',
      };
    });

    const total = data?.total_results || undefined;
    const hasMore = page * per_page < (data?.total_results || 0);
    return { items, page, pageSize: per_page, total, hasMore };
  }
}

