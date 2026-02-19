import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchResult } from '../types';

export class DropboxProvider extends BaseProvider {
  readonly name = 'Dropbox';
  readonly mediaType: MediaType = 'files';

  private getToken(): string | undefined {
    return (window as any).DROPBOX_TOKEN || localStorage.getItem('DROPBOX_TOKEN') || undefined;
  }

  async search(query: string): Promise<SearchResult> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Dropbox token missing. Paste a token to connect.');
    }
    const body = {
      query: query || '',
      options: { filename_only: false, file_status: 'active' },
    };
    const res = await fetch(`${this.config.baseUrl}/2/files/search_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Dropbox request failed: ${res.status} ${res.statusText} ${t}`);
    }
    const data = await res.json();
    const matches = data?.matches || [];
    const items: MediaItem[] = matches.map((m: any) => {
      const md = m?.metadata?.metadata || m?.metadata;
      const name = md?.name;
      const path = md?.path_display || md?.path_lower;
      const mime = md?.['.tag'] || 'file';
      const type: MediaType = mime.includes('image') ? 'images' : mime.includes('audio') ? 'audio' : mime.includes('video') ? 'videos' : 'files';
      return {
        id: md?.id || path || name,
        type,
        title: name,
        metadata: { path },
      } as MediaItem;
    });
    return { items, page: 1, pageSize: items.length || 20, hasMore: false };
  }
}

