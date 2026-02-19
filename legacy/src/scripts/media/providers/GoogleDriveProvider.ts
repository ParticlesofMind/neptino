import { BaseProvider } from './BaseProvider';
import { MediaItem, MediaType, SearchQueryOptions, SearchResult } from '../types';

export class GoogleDriveProvider extends BaseProvider {
  readonly name = 'GoogleDrive';
  readonly mediaType: MediaType = 'files';

  private getToken(): string | undefined {
    return (window as any).GOOGLE_DRIVE_TOKEN || localStorage.getItem('GOOGLE_DRIVE_TOKEN') || undefined;
  }

  async search(query: string, options: SearchQueryOptions = {}): Promise<SearchResult> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Google Drive token missing. Paste a token to connect.');
    }
    const pageSize = options.pageSize ?? 25;
    const q = query ? `name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}'` : '';
    const fields = 'files(id,name,mimeType,owners,thumbnailLink,webContentLink,webViewLink,iconLink,videoMediaMetadata,imageMediaMetadata),nextPageToken';
    const url = new URL('/drive/v3/files', this.config.baseUrl);
    url.searchParams.set('q', q);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('fields', fields);
    url.searchParams.set('includeItemsFromAllDrives', 'true');
    url.searchParams.set('supportsAllDrives', 'true');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google Drive request failed: ${res.status} ${res.statusText} ${body}`);
    }
    const data = await res.json();
    const items: MediaItem[] = (data.files || []).map((f: any) => ({
      id: f.id,
      type: f.mimeType?.startsWith('image/') ? 'images' : f.mimeType?.startsWith('audio/') ? 'audio' : f.mimeType?.startsWith('video/') ? 'videos' : 'files',
      title: f.name,
      author: f.owners?.[0]?.displayName,
      thumbnailUrl: f.thumbnailLink || f.iconLink,
      previewUrl: f.thumbnailLink,
      contentUrl: f.webContentLink || f.webViewLink,
      metadata: { mimeType: f.mimeType },
    }));
    return { items, page: 1, pageSize, hasMore: false };
  }
}

