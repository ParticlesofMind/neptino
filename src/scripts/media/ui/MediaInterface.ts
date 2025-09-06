import { mediaManager } from '../MediaManager';
import { resolveConfig } from '../config';
import { MediaItem, MediaType, SearchResult } from '../types';

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

class MediaInterface {
  private currentType: MediaType = 'files';
  private query = '';
  private page = 1;
  private pageSize = 24;
  private loading = false;
  private hasMore = false;
  private container!: HTMLElement;
  private resultsEl!: HTMLElement;
  private filtersEl!: HTMLElement;
  private loadMoreBtn!: HTMLButtonElement;
  private audioFilters = { minDurationSec: undefined as number | undefined, maxDurationSec: undefined as number | undefined, format: '', license: '' };
  private audioAdvanced = { minBitrateKbps: undefined as number | undefined, maxBitrateKbps: undefined as number | undefined, minSamplerateHz: undefined as number | undefined, maxSamplerateHz: undefined as number | undefined };
  private providerSelect!: HTMLSelectElement;
  private selectedProviderKey: string | null = null;
  private localUploadWrap!: HTMLElement;
  private connectPanel!: HTMLElement;

  init() {
    mediaManager.init();

    const searchBox = document.getElementById('media-search-input') as HTMLInputElement | null;
    const host = document.querySelector('.engine__search');
    if (!searchBox || !host) return;

    // Build UI container
    this.container = document.createElement('div');
    this.container.className = 'search__panel';
    this.container.style.width = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '8px';

    // filters removed per request (keep node to maintain layout hooks)
    this.filtersEl = document.createElement('div');
    this.filtersEl.className = 'search__filters';
    this.filtersEl.style.display = 'none';

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'search__results';
    this.resultsEl.style.display = 'grid';
    this.resultsEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
    this.resultsEl.style.gap = '10px';
    this.resultsEl.style.maxHeight = '380px';
    this.resultsEl.style.overflowY = 'auto';
    this.resultsEl.style.padding = '4px';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.alignItems = 'center';
    actions.style.gap = '8px';

    this.loadMoreBtn = document.createElement('button');
    this.loadMoreBtn.className = 'button button--outline button--small';
    this.loadMoreBtn.textContent = 'Load More';
    this.loadMoreBtn.style.display = 'none';
    this.loadMoreBtn.addEventListener('click', () => {
      if (this.loading || !this.hasMore) return;
      this.page += 1;
      this.search(false);
    });

    actions.appendChild(this.loadMoreBtn);

    // Provider/Connect/Upload removed per request (stock provider is used behind the scenes)
    this.container.appendChild(this.filtersEl);
    this.container.appendChild(this.resultsEl);
    this.container.appendChild(actions);
    host.appendChild(this.container);

    // Listen media tab clicks
    document.querySelectorAll('[data-media]').forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        let val = (target.dataset.media || 'files');
        // Normalize plugin -> plugins
        if (val === 'plugin') val = 'plugins';
        this.setType(val as MediaType);
      });
    });

    // Sync with ToolStateManager-driven selection (on reload/init)
    document.addEventListener('media:selected', (e: any) => {
      let val = (e?.detail || 'files');
      if (val === 'plugin') val = 'plugins';
      this.setType(val as MediaType);
    });

    // Try to read initial selection from ToolStateManager if present
    const toolState = (window as any).toolStateManager;
    if (toolState && typeof toolState.getSelectedMedia === 'function') {
      this.currentType = toolState.getSelectedMedia() || 'files';
    } else {
      this.currentType = 'files';
    }
    // Default to stock provider per type; initial render shows current type content
    this.selectedProviderKey = `${this.currentType}:stock`;
    this.search(true, true);

    // As a fallback, resync once after a short delay in case ToolState initializes later
    setTimeout(() => {
      const ts = (window as any).toolStateManager;
      if (ts && typeof ts.getSelectedMedia === 'function') {
        let m = ts.getSelectedMedia() || 'files';
        if (m === 'plugin') m = 'plugins';
        this.setType(m as MediaType);
      }
    }, 150);

    // Search box
    const doSearch = debounce(() => {
      this.query = searchBox.value.trim();
      this.page = 1;
      this.search(true);
    }, 400);
    searchBox.addEventListener('input', doSearch);

    // Scrolling pagination
    this.resultsEl.addEventListener('scroll', () => {
      if (this.loading || !this.hasMore) return;
      const nearBottom = this.resultsEl.scrollTop + this.resultsEl.clientHeight >= this.resultsEl.scrollHeight - 40;
      if (nearBottom) {
        this.page += 1;
        this.search(false);
      }
    });
  }

  private setType(t: MediaType) {
    this.currentType = t;
    this.resultsEl.innerHTML = '';
    this.page = 1;
    this.hasMore = false;
    this.selectedProviderKey = `${this.currentType}:stock`;
    this.search(true, true);
  }


  // Filters removed intentionally. Only search query and media type are used.

  private async search(clear: boolean, allowEmpty = false) {
    if (!this.query && !allowEmpty && this.selectedProviderKey !== 'files:local' && !(this.selectedProviderKey || '').includes(':stock')) {
      this.resultsEl.innerHTML = '';
      this.loadMoreBtn.style.display = 'none';
      return;
    }
    if (this.loading) return;
    this.loading = true;

    const loader = document.createElement('div');
    loader.textContent = 'Searching...';
    loader.style.gridColumn = '1 / -1';
    if (clear) {
      this.resultsEl.innerHTML = '';
    }
    this.resultsEl.appendChild(loader);

    try {
      const opts: any = { page: this.page, pageSize: this.pageSize };
      // Inject type hint for stock provider so it can filter (skip 'files' to aggregate)
      if ((this.selectedProviderKey || '').includes(':stock')) {
        if (this.currentType !== 'files') (opts as any).type = this.currentType;
      }
      const result = this.selectedProviderKey
        ? await mediaManager.searchWithProvider(this.selectedProviderKey, this.query, opts)
        : await mediaManager.search(this.currentType, this.query, opts);
      this.hasMore = result.hasMore;
      this.renderResults(result, clear);
      this.loadMoreBtn.style.display = this.hasMore ? 'inline-flex' : 'none';
    } catch (e: any) {
      this.renderErrorWithConnect(e?.message || String(e));
    } finally {
      loader.remove();
      this.loading = false;
    }
  }

  private handleConnect() {
    const cfg = resolveConfig();
    const base = location.origin;
    const fallbackRedirect = `${base}/src/pages/shared/oauth-callback.html`;
    if (this.selectedProviderKey === 'files:google-drive') {
      const clientId = (cfg as any).googleDrive.clientId;
      const redirect = (cfg as any).googleDrive.redirectUri || fallbackRedirect;
      const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly');
      if (!clientId) { alert('Missing Google Drive client ID'); return; }
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${scope}&include_granted_scopes=true&state=googledrive`; 
      window.open(url, 'oauth', 'width=520,height=640');
    } else if (this.selectedProviderKey === 'files:dropbox') {
      const clientId = (cfg as any).dropbox.clientId;
      const redirect = (cfg as any).dropbox.redirectUri || fallbackRedirect;
      if (!clientId) { alert('Missing Dropbox client ID'); return; }
      const url = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&token_access_type=online&state=dropbox`;
      window.open(url, 'oauth', 'width=520,height=640');
    }
    // Listen for storage signal
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'OAUTH_DONE_TIME') {
        window.removeEventListener('storage', onStorage);
        this.page = 1;
        this.search(true, true);
      }
    };
    window.addEventListener('storage', onStorage);
  }

  private handleDisconnect() {
    if (this.selectedProviderKey === 'files:google-drive') {
      localStorage.removeItem('GOOGLE_DRIVE_TOKEN');
      (window as any).GOOGLE_DRIVE_TOKEN = undefined;
    } else if (this.selectedProviderKey === 'files:dropbox') {
      localStorage.removeItem('DROPBOX_TOKEN');
      (window as any).DROPBOX_TOKEN = undefined;
    }
    this.page = 1;
    this.search(true);
  }

  private renderErrorWithConnect(message: string) {
    const wrap = document.createElement('div');
    wrap.style.gridColumn = '1 / -1';
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '6px';

    const msg = document.createElement('div');
    msg.textContent = `Error: ${message}`;
    msg.style.color = 'var(--color-danger-600)';
    wrap.appendChild(msg);

    if (this.selectedProviderKey === 'files:google-drive' || this.selectedProviderKey === 'files:dropbox') {
      const hint = document.createElement('div');
      hint.style.fontSize = '12px';
      hint.style.color = 'var(--color-text-secondary)';
      hint.textContent = 'Paste an access token to connect:';
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '6px';
      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'input';
      input.placeholder = 'Access token';
      const btn = document.createElement('button');
      btn.className = 'button button--primary button--small';
      btn.textContent = 'Save Token';
      btn.addEventListener('click', () => {
        const token = input.value.trim();
        if (!token) return;
        if (this.selectedProviderKey === 'files:google-drive') {
          localStorage.setItem('GOOGLE_DRIVE_TOKEN', token);
          (window as any).GOOGLE_DRIVE_TOKEN = token;
        } else if (this.selectedProviderKey === 'files:dropbox') {
          localStorage.setItem('DROPBOX_TOKEN', token);
          (window as any).DROPBOX_TOKEN = token;
        }
        // Retry search
        this.page = 1;
        this.search(true, true);
      });
      row.appendChild(input);
      row.appendChild(btn);
      wrap.appendChild(hint);
      wrap.appendChild(row);
    }

    this.resultsEl.appendChild(wrap);
  }

  private renderResults(result: SearchResult, clear: boolean) {
    if (clear) this.resultsEl.innerHTML = '';
    if (result.items.length === 0 && result.page === 1) {
      const empty = document.createElement('div');
      empty.textContent = 'No results.';
      empty.style.gridColumn = '1 / -1';
      this.resultsEl.appendChild(empty);
      return;
    }

    for (const item of result.items) {
      const card = this.renderItemCard(item);
      this.resultsEl.appendChild(card);
    }
  }

  private renderItemCard(item: MediaItem): HTMLElement {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '8px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '6px';
    card.style.borderRadius = '8px';

    if (item.type === 'images' && item.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = item.thumbnailUrl;
      img.alt = item.title || '';
      img.style.width = '100%';
      img.style.height = '100px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '6px';
      img.draggable = true;
      img.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));
      card.appendChild(img);
    }

    if (item.type === 'videos' && (item.previewUrl || item.thumbnailUrl)) {
      if (item.previewUrl) {
        const vid = document.createElement('video');
        vid.controls = true;
        vid.src = item.previewUrl;
        vid.style.width = '100%';
        vid.style.maxHeight = '120px';
        vid.style.objectFit = 'cover';
        vid.draggable = true;
        vid.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));
        card.appendChild(vid);
      } else if (item.thumbnailUrl) {
        const thumb = document.createElement('img');
        thumb.src = item.thumbnailUrl;
        thumb.alt = item.title || '';
        thumb.style.width = '100%';
        thumb.style.height = '100px';
        thumb.style.objectFit = 'cover';
        thumb.draggable = true;
        thumb.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));
        card.appendChild(thumb);
      }
    }

    if (item.type === 'audio' && item.previewUrl) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = item.previewUrl;
      audio.style.width = '100%';
      audio.draggable = true;
      audio.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));
      card.appendChild(audio);
    }

    const title = document.createElement('div');
    title.textContent = item.title || '(untitled)';
    title.style.fontSize = '12px';
    title.style.fontWeight = '600';
    title.style.lineHeight = '1.2';
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.style.fontSize = '11px';
    meta.style.color = 'var(--color-text-secondary)';
    meta.style.display = 'flex';
    meta.style.flexDirection = 'column';
    meta.style.gap = '2px';
    if (item.author) meta.appendChild(this.kv('By', item.author));
    if (item.license) meta.appendChild(this.kv('License', item.license));
    if (item.durationSec) meta.appendChild(this.kv('Duration', `${Math.round(item.durationSec)}s`));
    if (item.filesize) meta.appendChild(this.kv('Size', `${Math.round(item.filesize / 1024)} KB`));
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';
    const addBtn = document.createElement('button');
    addBtn.className = 'button button--primary button--small';
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => this.handleAdd(item));
    actions.appendChild(addBtn);
    if (item.contentUrl) {
      const openBtn = document.createElement('a');
      openBtn.className = 'button button--outline button--small';
      openBtn.textContent = 'Open';
      openBtn.href = item.contentUrl;
      openBtn.target = '_blank';
      actions.appendChild(openBtn);
    }
    card.appendChild(actions);
    return card;
  }

  private kv(k: string, v: string) {
    const el = document.createElement('div');
    el.textContent = `${k}: ${v}`;
    return el;
  }

  private handleAdd(item: MediaItem) {
    const canvasAPI = (window as any).canvasAPI;
    if (item.type === 'images' && item.contentUrl) {
      document.dispatchEvent(new CustomEvent('unsplashImageSelected', { detail: item }));
      if (canvasAPI && typeof canvasAPI.addImage === 'function') {
        canvasAPI.addImage(item.contentUrl);
      }
    } else if (item.type === 'audio') {
      document.dispatchEvent(new CustomEvent('freesoundAudioSelected', { detail: item }));
      if (canvasAPI && typeof canvasAPI.addAudioPlaceholder === 'function') {
        canvasAPI.addAudioPlaceholder(item.title || 'Audio');
      }
    } else if (item.type === 'videos') {
      document.dispatchEvent(new CustomEvent('pixabayVideoSelected', { detail: item }));
      if (canvasAPI && typeof canvasAPI.addText === 'function') {
        canvasAPI.addText(`📹 ${item.title || 'Video'}`);
      }
    } else if (item.type === 'text') {
      document.dispatchEvent(new CustomEvent('textSelected', { detail: item }));
      // Add simple text element on canvas if available
      if (canvasAPI && typeof canvasAPI.addText === 'function' && item.title) {
        try { canvasAPI.addText(item.title); } catch {}
      }
    }
  }

  private onDragStart(ev: DragEvent, item: any) {
    try {
      ev.dataTransfer?.setData('application/json', JSON.stringify(item));
      if (item.contentUrl) {
        ev.dataTransfer?.setData('text/uri-list', item.contentUrl);
      }
    } catch {}
  }
}

// Initialize after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const iface = new MediaInterface();
  iface.init();
  (window as any).mediaInterface = iface;

  // Enable drop on canvas container
  const canvasHost = document.getElementById('canvas-container');
  if (canvasHost) {
    canvasHost.addEventListener('dragover', (e) => { e.preventDefault(); });
    canvasHost.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      try {
        const json = e.dataTransfer?.getData('application/json');
        if (!json) return;
        const item = JSON.parse(json);
        const canvasAPI = (window as any).canvasAPI;
        if (!canvasAPI) return;
        // Always create a styled HTML card overlay at drop point
        const hostRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = (e.clientX - hostRect.left);
        const y = (e.clientY - hostRect.top);
        const card = document.createElement('div');
        const type = (item.type || 'files');
        card.className = `card card--floating card--${type}`;
        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        card.style.width = '180px';
        card.style.transform = 'translate(-50%, -50%)';
        card.innerHTML = '';
        // Embed the media itself inside the card
        if (item.type === 'images') {
          const img = document.createElement('img');
          img.src = item.contentUrl || item.previewUrl || item.thumbnailUrl || '';
          img.alt = item.title || '';
          img.className = 'card__thumb';
          card.appendChild(img);
        } else if (item.type === 'videos') {
          const vid = document.createElement('video');
          vid.controls = true;
          vid.src = item.previewUrl || item.contentUrl || '';
          vid.style.width = '100%';
          vid.style.maxHeight = '140px';
          vid.style.objectFit = 'cover';
          card.appendChild(vid);
        } else if (item.type === 'audio') {
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = item.previewUrl || item.contentUrl || '';
          audio.style.width = '100%';
          card.appendChild(audio);
        } else if (item.type === 'text') {
          const p = document.createElement('div');
          p.textContent = item.title || 'Text';
          p.className = 'card__title';
          card.appendChild(p);
        } else if (item.type === 'plugins' || item.type === 'links') {
          const p = document.createElement('div');
          p.textContent = item.title || (item.type === 'plugins' ? 'Plugin' : 'Link');
          p.className = 'card__title';
          card.appendChild(p);
        }
        const title = document.createElement('div');
        title.className = 'card__title';
        title.textContent = item.title || type;
        card.appendChild(title);
        (e.currentTarget as HTMLElement).appendChild(card);

        // Also add to canvas in basic form (optional)
        if (item.type === 'images' && item.contentUrl) {
          canvasAPI.addImage(item.contentUrl, x, y);
        } else if (item.type === 'audio') {
          canvasAPI.addAudioPlaceholder(item.title || 'Audio');
        } else if (item.type === 'videos') {
          canvasAPI.addText(`📹 ${item.title || 'Video'}`, x, y);
        } else if (item.type === 'text' && item.title) {
          canvasAPI.addText(item.title, x, y);
        }
      } catch {}
    });
  }
});
