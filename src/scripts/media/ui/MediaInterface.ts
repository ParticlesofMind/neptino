import { mediaManager } from '../MediaManager';
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
  private selectedProviderKey: string | null = null;
  private infoOverlay: HTMLElement | null = null;
  private lastFocusedElement: HTMLElement | null = null;
  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  init() {
    mediaManager.init();

    const searchBox = document.getElementById('media-search-input') as HTMLInputElement | null;
    const host = document.querySelector('.engine__search');
    if (!searchBox || !host) return;

    // Build UI container (CSS handles all layout)
    this.container = document.createElement('div');
    this.container.className = 'search__panel';
    
    // filters removed per request (keep node to maintain layout hooks)
    this.filtersEl = document.createElement('div');
    this.filtersEl.className = 'search__filters search__filters--hidden';

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'search__results';

    // Provider/Connect/Upload removed per request (stock provider is used behind the scenes)
    this.container.appendChild(this.filtersEl);
    this.container.appendChild(this.resultsEl);
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
      return;
    }
    if (this.loading) return;
    this.loading = true;

    const loader = document.createElement('div');
    loader.className = 'search__loader';
    loader.textContent = 'Searching...';
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
        ? await mediaManager.searchWithProvider(this.selectedProviderKey, this.query)
        : await mediaManager.search(this.currentType, this.query, opts);
    this.hasMore = result.hasMore;
      this.renderResults(result, clear);
    } catch (e: any) {
      this.renderErrorWithConnect(e?.message || String(e));
    } finally {
      loader.remove();
      this.loading = false;
    }
  }


  private renderErrorWithConnect(message: string) {
    const wrap = document.createElement('div');
    wrap.className = 'search__error';

    const msg = document.createElement('div');
    msg.textContent = `Error: ${message}`;
    msg.className = 'search__error-message';
    wrap.appendChild(msg);

    if (this.selectedProviderKey === 'files:google-drive' || this.selectedProviderKey === 'files:dropbox') {
      const hint = document.createElement('div');
      hint.className = 'search__error-hint';
      hint.textContent = 'Paste an access token to connect:';
      const row = document.createElement('div');
      row.className = 'search__error-controls';
      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'input search__error-input';
      input.placeholder = 'Access token';
      const btn = document.createElement('button');
      btn.className = 'button button--primary button--small search__error-button';
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
      empty.className = 'search__empty';
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
    const typeModifier = (item.type || 'files').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'files';
    card.className = `card card--${typeModifier}`;

    // Make the entire card draggable for all media types
    card.draggable = true;
    card.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));

    if (item.type === 'images' && item.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = item.thumbnailUrl;
      img.alt = item.title || '';
      img.className = 'card__preview card__preview--image';
      img.draggable = false; // Prevent nested drag
      card.appendChild(img);
    }

    if (item.type === 'videos' && (item.previewUrl || item.thumbnailUrl)) {
      if (item.previewUrl) {
        const videoPreview = document.createElement('video');
        videoPreview.controls = false; // custom overlay controls
        videoPreview.muted = true; // allow autoplay on user click in some browsers
        videoPreview.src = item.previewUrl;
        videoPreview.className = 'card__preview card__preview--video';
        videoPreview.draggable = false; // Prevent nested drag
        card.appendChild(videoPreview);
      } else if (item.thumbnailUrl) {
        const videoThumb = document.createElement('img');
        videoThumb.src = item.thumbnailUrl;
        videoThumb.alt = item.title || '';
        videoThumb.className = 'card__preview card__preview--video-thumbnail';
        videoThumb.draggable = false; // Prevent nested drag
        card.appendChild(videoThumb);
      }
      // No in-card overlay controls (keep previews simple)
    }

    if (item.type === 'audio') {
      // Create visual representation for audio items
      const audioWrapper = document.createElement('div');
      audioWrapper.className = 'card__preview card__preview--audio';

      const audioIcon = document.createElement('div');
      audioIcon.innerHTML = '🔊';
      audioIcon.className = 'card__icon card__icon--audio';
      audioWrapper.appendChild(audioIcon);

      card.appendChild(audioWrapper);
      // Add audio element; no overlay controls (keep preview simple)
      if (item.previewUrl) {
        const audio = document.createElement('audio');
        audio.controls = false;
        audio.src = item.previewUrl;
        audio.className = 'card__audio';
        audio.draggable = false; // Prevent nested drag
        card.appendChild(audio);
      }
    }

    // Add visual indicators for non-media types
    if (item.type === 'text') {
      const textWrapper = document.createElement('div');
      textWrapper.className = 'card__preview card__preview--text';

      const textIcon = document.createElement('div');
      textIcon.innerHTML = '📝';
      textIcon.className = 'card__icon card__icon--text';
      textWrapper.appendChild(textIcon);

      card.appendChild(textWrapper);
    }

    if (item.type === 'plugins') {
      const pluginWrapper = document.createElement('div');
      pluginWrapper.className = 'card__preview card__preview--plugin';

      const pluginIcon = document.createElement('div');
      pluginIcon.innerHTML = '🔌';
      pluginIcon.className = 'card__icon card__icon--plugin';
      pluginWrapper.appendChild(pluginIcon);

      card.appendChild(pluginWrapper);
    }

    if (item.type === 'links') {
      const linkWrapper = document.createElement('div');
      linkWrapper.className = 'card__preview card__preview--link';

      const linkIcon = document.createElement('div');
      linkIcon.innerHTML = '🔗';
      linkIcon.className = 'card__icon card__icon--link';
      linkWrapper.appendChild(linkIcon);

      card.appendChild(linkWrapper);
    }

    if (item.type === 'files' && !item.thumbnailUrl) {
      const fileWrapper = document.createElement('div');
      fileWrapper.className = 'card__preview card__preview--file';

      const fileIcon = document.createElement('div');
      fileIcon.innerHTML = '📄';
      fileIcon.className = 'card__icon card__icon--file';
      fileWrapper.appendChild(fileIcon);

      card.appendChild(fileWrapper);
    }

    const title = document.createElement('div');
    title.textContent = item.title || '(untitled)';
    title.className = 'card__title';
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'card__meta';
    if (item.author) meta.appendChild(this.kv('By', item.author));
    if (item.license) meta.appendChild(this.kv('License', item.license));
    if (item.durationSec) meta.appendChild(this.kv('Duration', `${Math.round(item.durationSec)}s`));
    if (item.filesize) meta.appendChild(this.kv('Size', `${Math.round(item.filesize / 1024)} KB`));
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card__actions';

    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'card__info-button';
    infoButton.textContent = 'Info';
    infoButton.setAttribute('aria-label', `View details for ${item.title || 'media item'}`);
    infoButton.draggable = false;
    infoButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showInfoPopup(item);
    });
    infoButton.addEventListener('pointerdown', (event) => event.stopPropagation());
    infoButton.addEventListener('dragstart', (event) => event.preventDefault());

    actions.appendChild(infoButton);
    card.appendChild(actions);

    // Remove Add/Open buttons – drag-and-drop only
    return card;
  }

  private showInfoPopup(item: MediaItem) {
    this.hideInfoPopup();

    this.lastFocusedElement = document.activeElement as HTMLElement | null;

    const overlay = this.buildInfoOverlay(item);
    this.infoOverlay = overlay;
    document.body.appendChild(overlay);
    document.body.classList.add('media-info-overlay-open');

    const closeButton = overlay.querySelector<HTMLElement>('.card__close');
    closeButton?.focus({ preventScroll: true });

    this.keydownListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.hideInfoPopup();
      }
    };

    document.addEventListener('keydown', this.keydownListener);
  }

  private hideInfoPopup() {
    if (this.infoOverlay) {
      this.infoOverlay.remove();
      this.infoOverlay = null;
    }

    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }

    document.body.classList.remove('media-info-overlay-open');

    if (this.lastFocusedElement) {
      try {
        this.lastFocusedElement.focus({ preventScroll: true });
      } catch {
        // ignore focus errors
      }
      this.lastFocusedElement = null;
    }
  }

  private buildInfoOverlay(item: MediaItem): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'media-info-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.hideInfoPopup();
      }
    });

    const card = document.createElement('div');
    card.className = 'card card--media-info media-info';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', `${item.title || 'Media item'} details`);
    overlay.appendChild(card);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'card__close';
    closeButton.setAttribute('aria-label', 'Close media details');
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => this.hideInfoPopup());
    closeButton.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hideInfoPopup();
      }
    });
    card.appendChild(closeButton);

    const layout = document.createElement('div');
    layout.className = 'media-info__layout';
    card.appendChild(layout);

    const details = document.createElement('div');
    details.className = 'media-info__details';
    layout.appendChild(details);

    const detailList = document.createElement('div');
    detailList.className = 'media-info__list';
    details.appendChild(detailList);

    const metadata = item.metadata || {};
    const placeholderUrl = 'https://example.com/media-resource';
    const description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.';
    const ageRating = (metadata.ageRating as string) || 'Not rated';
    const creator = item.author || (metadata.creator as string) || 'Unknown';
    const duration = (item.type === 'videos' || item.type === 'audio') ? this.formatDuration(item.durationSec) : 'Not applicable';
    const fileSize = this.formatFileSize(item.filesize);
    const format = this.inferFormat(item);
    const license = item.license || (metadata.license as string) || 'Not provided';
    const source = (metadata.source as string) || 'Stock library';
    const tagsValue = this.formatTags(metadata.tags);
    const uploadDate = this.formatDate(metadata.uploadDate);

    this.appendDetail(detailList, 'URL', placeholderUrl);
    this.appendDetail(detailList, 'Description', description);
    this.appendDetail(detailList, 'Age Rating', ageRating);
    this.appendDetail(detailList, 'Title', item.title || '(untitled)');
    this.appendDetail(detailList, 'Author / Creator', creator);
    this.appendDetail(detailList, 'Duration', duration);
    this.appendDetail(detailList, 'File Size', fileSize);
    this.appendDetail(detailList, 'Format', format);
    this.appendDetail(detailList, 'License / Copyright', license);
    this.appendDetail(detailList, 'Source', source);
    this.appendDetail(detailList, 'Tags / Keywords', tagsValue);
    this.appendDetail(detailList, 'Upload Date', uploadDate);

    const preview = document.createElement('div');
    preview.className = 'media-info__preview';
    layout.appendChild(preview);

    const previewFrame = document.createElement('div');
    previewFrame.className = 'media-info__preview-frame';
    const previewContent = this.buildPreviewContent(item);
    previewFrame.appendChild(previewContent);
    preview.appendChild(previewFrame);

    const previewNote = document.createElement('div');
    previewNote.className = 'media-info__preview-note';
    previewNote.textContent = 'Preview is for reference only. Drag to the canvas to add this media.';
    preview.appendChild(previewNote);

    return overlay;
  }

  private buildPreviewContent(item: MediaItem): HTMLElement {
    if (item.type === 'videos' && (item.previewUrl || item.contentUrl)) {
      const video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = item.previewUrl || item.contentUrl || '';
      return video;
    }

    if (item.type === 'audio' && (item.previewUrl || item.contentUrl)) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = item.previewUrl || item.contentUrl || '';
      return audio;
    }

    if ((item.previewUrl || item.thumbnailUrl) && item.type !== 'audio') {
      const img = document.createElement('img');
      img.src = item.previewUrl || item.thumbnailUrl || '';
      img.alt = item.title || 'Media preview';
      return img;
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'media-info__preview-fallback';
    placeholder.textContent = 'Preview not available for this media type.';
    return placeholder;
  }

  private appendDetail(container: HTMLElement, label: string, value: string) {
    const item = document.createElement('div');
    item.className = 'media-info__item';

    const labelEl = document.createElement('span');
    labelEl.className = 'media-info__label';
    labelEl.textContent = label;
    item.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'media-info__value';
    valueEl.textContent = value;
    item.appendChild(valueEl);

    container.appendChild(item);
  }

  private formatDuration(seconds?: number): string {
    if (!seconds && seconds !== 0) {
      return 'Unknown';
    }

    const totalSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    if (minutes === 0) {
      return `${remainder}s`;
    }
    return `${minutes}m ${remainder.toString().padStart(2, '0')}s`;
  }

  private formatFileSize(bytes?: number): string {
    if (!bytes) {
      return 'Unknown';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  private inferFormat(item: MediaItem): string {
    const metadataFormat = item.metadata?.format as string | undefined;
    if (metadataFormat) {
      return metadataFormat;
    }
    const url = item.contentUrl || item.previewUrl;
    if (!url) {
      return 'Unknown';
    }
    const match = url.split('.').pop();
    return match ? match.toUpperCase() : 'Unknown';
  }

  private formatTags(tags: unknown): string {
    if (Array.isArray(tags)) {
      return tags.length ? tags.join(', ') : 'No keywords provided';
    }
    if (typeof tags === 'string' && tags.trim().length > 0) {
      return tags;
    }
    return 'No keywords provided';
  }

  private formatDate(value: unknown): string {
    if (typeof value === 'number') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    if (typeof value === 'string' || value instanceof Date) {
      const date = value instanceof Date ? value : new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    return 'Unknown';
  }

  private kv(k: string, v: string) {
    const el = document.createElement('div');
    el.className = 'card__meta-item';
    el.textContent = `${k}: ${v}`;
    return el;
  }

  private onDragStart(ev: DragEvent, item: any) {
    try {
      ev.dataTransfer?.setData('application/json', JSON.stringify(item));
      if (item.contentUrl || item.previewUrl) {
        ev.dataTransfer?.setData('text/uri-list', item.contentUrl || item.previewUrl);
      }
      
      // Add visual feedback during drag
      const target = ev.target as HTMLElement;
      const card = target.closest('.card') as HTMLElement;
      if (card) {
        card.classList.add('card--dragging');
        
        // Remove the class after drag ends
        const removeDragClass = () => {
          card.classList.remove('card--dragging');
          document.removeEventListener('dragend', removeDragClass);
        };
        document.addEventListener('dragend', removeDragClass);
      }
    } catch (error) {
      console.warn('Failed to setup media drag behavior:', error);
    }
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
    canvasHost.addEventListener('dragover', (e) => { 
      e.preventDefault();
      try { (e as DragEvent).dataTransfer!.dropEffect = 'copy'; } catch {}
      // Add visual feedback when dragging over canvas
      canvasHost.classList.add('drag-over');
    });
    
    canvasHost.addEventListener('dragleave', (e) => {
      // Only remove the class if we're actually leaving the canvas area
      if (!canvasHost.contains(e.relatedTarget as Node)) {
        canvasHost.classList.remove('drag-over');
      }
    });
    
    canvasHost.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      canvasHost.classList.remove('drag-over');

      try {
        const json = e.dataTransfer?.getData('application/json');
        if (!json) return;
        const item = JSON.parse(json);
        const canvasAPI = (window as any).canvasAPI;
        if (!canvasAPI) return;

        // Compute drop point precisely under cursor, accounting for CSS zoom/pan and DPR
        const app = canvasAPI.getApp?.();
        const drawingLayer = typeof canvasAPI.getLayer === 'function' ? canvasAPI.getLayer('drawing') : null;
        let x = 50, y = 50;
        if (app && (app as any).renderer?.events && drawingLayer && app.canvas) {
          try {
            // Map client coordinates to PIXI global, then to drawing layer local coords
            const global: any = { x: 0, y: 0 };
            (app as any).renderer.events.mapPositionToPoint(global, e.clientX, e.clientY);
            const local = (drawingLayer as any).toLocal(global);
            x = local.x;
            y = local.y;
          } catch {
            // Fallback to rect mapping if anything fails
            const rect = app.canvas.getBoundingClientRect();
            const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
            const cssX = clamp(e.clientX, rect.left, rect.right);
            const cssY = clamp(e.clientY, rect.top, rect.bottom);
            const screenW = (app as any).screen?.width ?? rect.width;
            const screenH = (app as any).screen?.height ?? rect.height;
            const scaleX = screenW / rect.width;
            const scaleY = screenH / rect.height;
            x = (cssX - rect.left) * scaleX;
            y = (cssY - rect.top) * scaleY;
          }
        } else {
          // Final fallback: relative to host without offsets
          const hostRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          x = (e.clientX - hostRect.left);
          y = (e.clientY - hostRect.top);
        }

        // Add to canvas at computed coordinates (no offsets, no clamping to content)
        if (item.type === 'images' && (item.contentUrl || item.previewUrl || item.thumbnailUrl)) {
          (async () => {
            const id = await canvasAPI.addImage(item.contentUrl || item.previewUrl || item.thumbnailUrl, x, y);
            if (id) canvasAPI.showSnapHintForId(id);
          })();
        } else if (item.type === 'videos') {
          if (typeof canvasAPI.addVideoElement === 'function') {
            const id = canvasAPI.addVideoElement(
              item.previewUrl || item.contentUrl || '',
              item.title || 'Video',
              x,
              y,
              item.thumbnailUrl || undefined,
            );
            if (id) canvasAPI.showSnapHintForId(id);
          } else {
            canvasAPI.addText(`📹 ${item.title || 'Video'}`, x, y);
          }
        } else if (item.type === 'audio') {
          if (typeof canvasAPI.addAudioElement === 'function') {
            const id = canvasAPI.addAudioElement(item.previewUrl || item.contentUrl || '', item.title || 'Audio', x, y);
            if (id) canvasAPI.showSnapHintForId(id);
          } else {
            canvasAPI.addAudioPlaceholder(item.title || 'Audio');
          }
        } else if (item.type === 'text' && item.title) {
          const id = canvasAPI.addText(item.title, x, y);
          if (id) canvasAPI.showSnapHintForId(id);
        } else if (item.type === 'plugins' && item.title) {
          const id = canvasAPI.addText(`🔌 ${item.title}`, x, y);
          if (id) canvasAPI.showSnapHintForId(id);
        } else if (item.type === 'links' && item.title) {
          const id = canvasAPI.addText(`🔗 ${item.title}`, x, y);
          if (id) canvasAPI.showSnapHintForId(id);
        }
      } catch (error) {
        console.warn('Failed to add media item to canvas:', error);
      }
    });
  }
});
