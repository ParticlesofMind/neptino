import { BaseProvider } from './BaseProvider';
import { MediaType, SearchResult } from '../types';

/**
 * Placeholder video provider. Integrate Pexels/Pixabay/Archive as needed.
 */
export class VideoProvider extends BaseProvider {
  readonly name = 'Videos';
  readonly mediaType: MediaType = 'videos';

  async search(_query: string): Promise<SearchResult> {
    // TODO: Implement video search for specific platform
    return { items: [], page: 1, pageSize: 20, hasMore: false };
  }
}

