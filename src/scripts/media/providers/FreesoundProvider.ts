import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

type FreesoundItem = {
  id: number;
  name: string;
  duration: number;
  filesize?: number;
  license?: string;
  type?: string;
  username?: string;
  user?: { username?: string };
  previews?: Record<string, string>;
  images?: Record<string, string>;
  download?: string;
};

export class FreesoundProvider extends BaseProvider {
  readonly name = 'Freesound';
  readonly mediaType: MediaType = 'audio';

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const page = options.page ?? 1;
    const page_size = options.pageSize ?? 20;

    // Build Freesound filter string
    const filters: string[] = [];
    if (options.minDurationSec !== undefined || options.maxDurationSec !== undefined) {
      const min = options.minDurationSec ?? 0;
      const max = options.maxDurationSec ?? 99999;
      // Only add filter if the range is valid
      if (min <= max) {
        filters.push(`duration:[${min} TO ${max}]`);
      }
    }
    if (options.format) {
      // Freesound uses type: ("wav" | "aiff" | "mp3" | etc.)
      filters.push(`type:${options.format}`);
    }
    if (options.license) {
      // license:"Attribution" or full CC url; accept raw string passthrough
      filters.push(`license:\"${options.license}\"`);
    }
    if (options.minBitrateKbps !== undefined || options.maxBitrateKbps !== undefined) {
      const min = options.minBitrateKbps ?? 0;
      const max = options.maxBitrateKbps ?? 100000;
      // Only add filter if the range is valid
      if (min <= max) {
        filters.push(`bitrate:[${min} TO ${max}]`);
      }
    }
    if (options.minSamplerateHz !== undefined || options.maxSamplerateHz !== undefined) {
      const min = options.minSamplerateHz ?? 0;
      const max = options.maxSamplerateHz ?? 384000;
      // Only add filter if the range is valid
      if (min <= max) {
        filters.push(`samplerate:[${min} TO ${max}]`);
      }
    }
    const filter = filters.join(' ');

    const fields = [
      'id',
      'name',
      'duration',
      'filesize',
      'license',
      'type',
      'username',
      'user',
      'previews',
      'images',
      'download',
    ].join(',');

    // Freesound API uses token parameter, not Authorization header
    const params: Record<string, any> = {
      query,
      fields,
      page,
      page_size,
      filter: filter || undefined,
    };

    if (this.config.apiKey && this.config.apiKey !== 'YOUR_FREESOUND_API_KEY') {
      params.token = this.config.apiKey;
    }

    const res = await this.getJson('/search/text/', params);

    const items: MediaItem[] = (res?.results || []).map((it: FreesoundItem) => {
      // Prefer HQ MP3 preview if available
      const previews = it.previews || {};
      const previewUrl =
        previews['preview-hq-mp3'] ||
        previews['preview-lq-mp3'] ||
        previews['preview-hq-ogg'] ||
        previews['preview-lq-ogg'] ||
        undefined;

      const author = it.username || it.user?.username;

      const item: MediaItem = {
        id: String(it.id),
        type: 'audio',
        title: it.name,
        durationSec: it.duration,
        filesize: it.filesize,
        license: it.license,
        author,
        previewUrl,
        contentUrl: it.download, // Note: might require OAuth2 to download
        thumbnailUrl: it.images?.waveform_l || it.images?.spectral_l,
        metadata: {
          type: it.type,
          waveform: it.images?.waveform_m || undefined,
        },
      };
      return item;
    });

    const count: number | undefined = res?.count;
    const hasMore = Boolean(res?.next);
    return { items, page, pageSize: page_size, total: count, hasMore };
  }
}
