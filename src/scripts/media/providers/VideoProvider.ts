import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

/**
 * Placeholder video provider. Integrate Pexels/Pixabay/Archive as needed.
 */
export class VideoProvider extends BaseProvider {
  readonly name = 'Videos';
  readonly mediaType: MediaType = 'videos';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    console.warn('VideoProvider: No video API configured. Returning empty results.');
    return { items: [], page: options.page ?? 1, pageSize: options.pageSize ?? 20, hasMore: false };
  }
}

