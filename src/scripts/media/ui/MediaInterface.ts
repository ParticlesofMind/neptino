import { mediaManager } from '../MediaManager';
import { MediaItem, MediaType, SearchResult } from '../types';
import { courseContextService } from '../../backend/courses/context/CourseContextService';
import {
  filterByFingerprint as filterEncyclopediaByFingerprint,
  type KnowledgeItem,
  type ScoredKnowledgeItem,
} from '../../encyclopedia/encyclopediaFilter';
import {
  filterByFingerprint as filterMarketplaceByFingerprint,
  type ForgeAsset,
  type ScoredForgeAsset,
} from '../../marketplace/marketplaceFilter';

/** Extended media type that includes knowledge-source tabs. */
type ExtendedMediaType = MediaType | 'encyclopedia' | 'marketplace';

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function createLocalTestImage(idSuffix: string, title: string, filename: string): MediaItem {
  const assetUrl = `/assets/drawingTests/${filename}`;
  return {
    id: `local-test-${idSuffix}`,
    type: 'images',
    title,
    thumbnailUrl: assetUrl,
    previewUrl: assetUrl,
    contentUrl: assetUrl,
    author: 'Local Test Assets',
  };
}

const LOCAL_TEST_IMAGES: MediaItem[] = [
  createLocalTestImage('elephant', 'Elephant Test', 'elephant-test.svg'),
  createLocalTestImage('bee', 'Bee Test', 'bee-test.svg'),
  createLocalTestImage('flower', 'Flower Test', 'flower-test.svg'),
  createLocalTestImage('werewolf', 'Werewolf Test', 'werewolf-test.svg'),
];

class MediaInterface {
  private currentType: ExtendedMediaType = 'files';
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

  // ── Knowledge-source state ──────────────────────────────────────────
  private encyclopediaData: KnowledgeItem[] | null = null;
  private marketplaceData: ForgeAsset[] | null = null;
  /** Unsubscribe from CourseContextService.onChange; called on cleanup. */
  private fingerprintUnsub: (() => void) | null = null;

  destroy() {
    this.fingerprintUnsub?.();
    this.fingerprintUnsub = null;
  }

  init() {
    mediaManager.init();

    const searchBox = document.getElementById('media-search-input') as HTMLInputElement | null;
    const host = document.querySelector('[data-engine-search]');
    if (!searchBox || !host) return;

    // Build UI container (CSS handles all layout)
    this.container = document.createElement('div');
    this.container.className = 'flex flex-col flex-1 min-h-0 gap-3';
    
    // filters removed per request (keep node to maintain layout hooks)
    this.filtersEl = document.createElement('div');
    this.filtersEl.className = 'hidden';

    this.resultsEl = document.createElement('div');
    this.resultsEl.className = 'flex flex-1 min-h-0 flex-col gap-3 overflow-auto';

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
        this.setType(val as ExtendedMediaType);
      });
    });

    // Sync with ToolStateManager-driven selection (on reload/init)
    document.addEventListener('media:selected', (e: any) => {
      let val = (e?.detail || 'files');
      if (val === 'plugin') val = 'plugins';
      this.setType(val as ExtendedMediaType);
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
      // Knowledge-source tabs use their own search
      if (this.currentType === 'encyclopedia') {
        this.renderEncyclopedia();
        return;
      }
      if (this.currentType === 'marketplace') {
        this.renderMarketplace();
        return;
      }
      this.search(true);
    }, 400);
    searchBox.addEventListener('input', doSearch);

    // Subscribe to fingerprint changes — re-filter if showing knowledge tabs
    this.fingerprintUnsub = courseContextService.onChange(() => {
      if (this.currentType === 'encyclopedia') this.renderEncyclopedia();
      if (this.currentType === 'marketplace') this.renderMarketplace();
    });

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

  private setType(t: ExtendedMediaType) {
    this.currentType = t;
    this.resultsEl.innerHTML = '';
    this.page = 1;
    this.hasMore = false;

    // Knowledge-source tabs use their own render pipeline
    if (t === 'encyclopedia') {
      this.selectedProviderKey = null;
      this.renderEncyclopedia();
      return;
    }
    if (t === 'marketplace') {
      this.selectedProviderKey = null;
      this.renderMarketplace();
      return;
    }

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
    loader.className = 'text-xs text-neutral-500';
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
        : await mediaManager.search(this.currentType as MediaType, this.query, opts);
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
    wrap.className = 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700';

    const msg = document.createElement('div');
    msg.textContent = `Error: ${message}`;
    msg.className = 'text-sm font-medium';
    wrap.appendChild(msg);

    if (this.selectedProviderKey === 'files:google-drive' || this.selectedProviderKey === 'files:dropbox') {
      const hint = document.createElement('div');
      hint.className = 'mt-2 text-xs text-red-600';
      hint.textContent = 'Paste an access token to connect:';
      const row = document.createElement('div');
      row.className = 'mt-2 flex flex-wrap gap-2';
      const input = document.createElement('input');
      input.type = 'password';
      input.className = 'w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700';
      input.placeholder = 'Access token';
      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700';
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
    let injectedLocalTests = false;
    if (clear) {
      this.resultsEl.innerHTML = '';
      if (result.page === 1) {
        injectedLocalTests = this.appendLocalTestImages();
      }
    }
    if (result.items.length === 0 && result.page === 1 && !injectedLocalTests) {
      const empty = document.createElement('div');
      empty.textContent = 'No results.';
      empty.className = 'text-sm text-neutral-500';
      this.resultsEl.appendChild(empty);
      return;
    }

    for (const item of result.items) {
      const card = this.renderItemCard(item);
      this.resultsEl.appendChild(card);
    }
  }

  private appendLocalTestImages(): boolean {
    if (this.currentType !== 'images') return false;
    if (!LOCAL_TEST_IMAGES.length) return false;
    for (const item of LOCAL_TEST_IMAGES) {
      const card = this.renderItemCard(item);
      card.setAttribute('data-source', 'local-test');
      this.resultsEl.appendChild(card);
    }
    return true;
  }

  private renderItemCard(item: MediaItem): HTMLElement {
    const card = document.createElement('div');
    card.className = 'flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md';
    card.dataset.mediaCard = 'true';

    // Make the entire card draggable for all media types
    card.draggable = true;
    card.addEventListener('dragstart', (ev) => this.onDragStart(ev, item));

    if (item.type === 'images' && item.thumbnailUrl) {
      const img = document.createElement('img');
      img.src = item.thumbnailUrl;
      img.alt = item.title || '';
      img.className = 'h-24 w-full rounded-md object-cover';
      img.draggable = false; // Prevent nested drag
      card.appendChild(img);
    }

    if (item.type === 'videos' && (item.previewUrl || item.thumbnailUrl)) {
      if (item.previewUrl) {
        const videoPreview = document.createElement('video');
        videoPreview.controls = false;
        videoPreview.muted = true;
        videoPreview.src = item.previewUrl;
        videoPreview.className = 'h-24 w-full rounded-md object-cover';
        videoPreview.draggable = false;
        card.appendChild(videoPreview);
      } else if (item.thumbnailUrl) {
        const videoThumb = document.createElement('img');
        videoThumb.src = item.thumbnailUrl;
        videoThumb.alt = item.title || '';
        videoThumb.className = 'h-24 w-full rounded-md object-cover';
        videoThumb.draggable = false;
        card.appendChild(videoThumb);
      }
    }

    if (item.type === 'audio') {
      const audioWrapper = document.createElement('div');
      audioWrapper.className = 'flex h-24 items-center justify-center rounded-md bg-neutral-100';

      const audioIcon = document.createElement('div');
      audioIcon.innerHTML = '🔊';
      audioIcon.className = 'text-2xl';
      audioWrapper.appendChild(audioIcon);

      card.appendChild(audioWrapper);
      if (item.previewUrl) {
        const audio = document.createElement('audio');
        audio.controls = false;
        audio.src = item.previewUrl;
        audio.className = 'w-full';
        audio.draggable = false;
        card.appendChild(audio);
      }
    }

    if (item.type === 'text') {
      const textWrapper = document.createElement('div');
      textWrapper.className = 'flex h-24 items-center justify-center rounded-md bg-neutral-100';

      const textIcon = document.createElement('div');
      textIcon.innerHTML = '📝';
      textIcon.className = 'text-2xl';
      textWrapper.appendChild(textIcon);

      card.appendChild(textWrapper);
    }

    if (item.type === 'plugins') {
      const pluginWrapper = document.createElement('div');
      pluginWrapper.className = 'flex h-24 items-center justify-center rounded-md bg-neutral-100';

      const pluginIcon = document.createElement('div');
      pluginIcon.innerHTML = '🔌';
      pluginIcon.className = 'text-2xl';
      pluginWrapper.appendChild(pluginIcon);

      card.appendChild(pluginWrapper);
    }

    if (item.type === 'links') {
      const linkWrapper = document.createElement('div');
      linkWrapper.className = 'flex h-24 items-center justify-center rounded-md bg-neutral-100';

      const linkIcon = document.createElement('div');
      linkIcon.innerHTML = '🔗';
      linkIcon.className = 'text-2xl';
      linkWrapper.appendChild(linkIcon);

      card.appendChild(linkWrapper);
    }

    if (item.type === 'files' && !item.thumbnailUrl) {
      const fileWrapper = document.createElement('div');
      fileWrapper.className = 'flex h-24 items-center justify-center rounded-md bg-neutral-100';

      const fileIcon = document.createElement('div');
      fileIcon.innerHTML = '📄';
      fileIcon.className = 'text-2xl';
      fileWrapper.appendChild(fileIcon);

      card.appendChild(fileWrapper);
    }

    const title = document.createElement('div');
    title.textContent = item.title || '(untitled)';
    title.className = 'text-sm font-semibold text-neutral-900';
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'flex flex-col gap-1 text-xs text-neutral-500';
    if (item.author) meta.appendChild(this.kv('By', item.author));
    if (item.license) meta.appendChild(this.kv('License', item.license));
    if (item.durationSec) meta.appendChild(this.kv('Duration', `${Math.round(item.durationSec)}s`));
    if (item.filesize) meta.appendChild(this.kv('Size', `${Math.round(item.filesize / 1024)} KB`));
    card.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'flex justify-end';

    const infoButton = document.createElement('button');
    infoButton.type = 'button';
    infoButton.className = 'inline-flex items-center justify-center rounded-md border border-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50';
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

  // ═══════════════════════════════════════════════════════════════════
  // Encyclopedia rendering
  // ═══════════════════════════════════════════════════════════════════

  private async renderEncyclopedia() {
    this.resultsEl.innerHTML = '';

    // Lazy-load encyclopedia data
    if (!this.encyclopediaData) {
      const loader = document.createElement('div');
      loader.className = 'text-xs text-neutral-500';
      loader.textContent = 'Loading encyclopedia…';
      this.resultsEl.appendChild(loader);
      try {
        const res = await fetch('/data/encyclopedia/historical-figures.json');
        this.encyclopediaData = (await res.json()) as KnowledgeItem[];
      } catch (err) {
        loader.textContent = 'Failed to load encyclopedia data.';
        console.error('Encyclopedia load error:', err);
        return;
      }
      loader.remove();
    }

    const fingerprint = courseContextService.getFingerprint();

    let items: ScoredKnowledgeItem[];
    if (fingerprint.courseName) {
      // We have a course context — use fingerprint-driven filtering
      items = filterEncyclopediaByFingerprint(
        this.encyclopediaData,
        fingerprint,
        undefined,
        this.query || undefined,
      );
    } else {
      // No course loaded — simple text search only
      items = this.encyclopediaData
        .filter((item) => {
          if (!this.query) return true;
          const q = this.query.toLowerCase();
          return [item.title, item.summary, ...item.tags].join(' ').toLowerCase().includes(q);
        })
        .map((item) => ({ item, score: 0, matchReasons: [] }));
    }

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = this.query ? 'No matching encyclopedia entries.' : 'No encyclopedia entries available.';
      empty.className = 'text-sm text-neutral-500 p-2';
      this.resultsEl.appendChild(empty);
      return;
    }

    // Relevance summary when fingerprint-filtered
    if (fingerprint.courseName) {
      const hint = document.createElement('div');
      hint.className = 'text-xs text-primary-600 bg-primary-50 rounded-md px-3 py-1.5 mb-1';
      hint.textContent = `${items.length} entries ranked by course relevance`;
      this.resultsEl.appendChild(hint);
    }

    for (const scored of items) {
      const card = this.renderEncyclopediaCard(scored);
      this.resultsEl.appendChild(card);
    }
  }

  private renderEncyclopediaCard(scored: ScoredKnowledgeItem): HTMLElement {
    const item = scored.item;
    const card = document.createElement('div');
    card.className = 'flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md cursor-grab';
    card.dataset.mediaCard = 'true';
    card.dataset.sourceType = 'encyclopedia';
    card.draggable = true;

    card.addEventListener('dragstart', (ev) => {
      const payload = {
        sourceType: 'encyclopedia' as const,
        id: item.id,
        title: item.title,
        knowledgeType: item.knowledgeType,
        domain: item.domain,
        summary: item.summary,
        tags: item.tags,
        depth: item.depth,
        eraLabel: item.eraLabel,
        wikidataId: item.wikidataId,
      };
      ev.dataTransfer?.setData('application/json', JSON.stringify(payload));
      ev.dataTransfer?.setData('text/plain', item.title);
      card.classList.add('ring-2', 'ring-amber-300', 'opacity-70');
      const cleanup = () => {
        card.classList.remove('ring-2', 'ring-amber-300', 'opacity-70');
        document.removeEventListener('dragend', cleanup);
      };
      document.addEventListener('dragend', cleanup);
    });

    // Icon + type badge
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2';
    const icon = document.createElement('span');
    icon.className = 'text-base';
    icon.textContent = this.encyclopediaIcon(item.knowledgeType);
    header.appendChild(icon);
    const typeBadge = document.createElement('span');
    typeBadge.className = 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800';
    typeBadge.textContent = item.knowledgeType;
    header.appendChild(typeBadge);

    // Relevance score badge (only when filtered)
    if (scored.score > 0) {
      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'ml-auto rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700';
      scoreBadge.textContent = `${scored.score}`;
      scoreBadge.title = scored.matchReasons.join(', ') || 'relevance score';
      header.appendChild(scoreBadge);
    }
    card.appendChild(header);

    // Title
    const title = document.createElement('div');
    title.textContent = item.title;
    title.className = 'text-sm font-semibold text-neutral-900';
    card.appendChild(title);

    // Summary (truncated)
    const summary = document.createElement('div');
    summary.textContent = item.summary.length > 120 ? item.summary.slice(0, 117) + '…' : item.summary;
    summary.className = 'text-xs text-neutral-600 leading-relaxed';
    card.appendChild(summary);

    // Meta row
    const meta = document.createElement('div');
    meta.className = 'flex flex-wrap gap-1.5 text-[10px] text-neutral-500';
    meta.appendChild(this.pill(item.domain, 'bg-neutral-100'));
    meta.appendChild(this.pill(item.eraLabel, 'bg-blue-50 text-blue-700'));
    meta.appendChild(this.pill(item.depth, 'bg-green-50 text-green-700'));
    card.appendChild(meta);

    return card;
  }

  private encyclopediaIcon(type: string): string {
    const icons: Record<string, string> = {
      'Person': '👤',
      'Event': '📅',
      'Location': '📍',
      'Concept / Theory': '💡',
      'Invention / Technology': '⚙️',
      'Work': '📖',
      'Institution': '🏛️',
      'Movement / School': '✊',
      'Era / Period': '🕰️',
    };
    return icons[type] || '📚';
  }

  // ═══════════════════════════════════════════════════════════════════
  // Marketplace rendering
  // ═══════════════════════════════════════════════════════════════════

  private async renderMarketplace() {
    this.resultsEl.innerHTML = '';

    // Lazy-load marketplace data
    if (!this.marketplaceData) {
      const loader = document.createElement('div');
      loader.className = 'text-xs text-neutral-500';
      loader.textContent = 'Loading marketplace…';
      this.resultsEl.appendChild(loader);
      try {
        const res = await fetch('/data/marketplace/assets.json');
        this.marketplaceData = (await res.json()) as ForgeAsset[];
      } catch (err) {
        loader.textContent = 'Failed to load marketplace data.';
        console.error('Marketplace load error:', err);
        return;
      }
      loader.remove();
    }

    const fingerprint = courseContextService.getFingerprint();

    let items: ScoredForgeAsset[];
    if (fingerprint.courseName) {
      items = filterMarketplaceByFingerprint(
        this.marketplaceData,
        fingerprint,
        undefined,
        this.query || undefined,
      );
    } else {
      items = this.marketplaceData
        .filter((asset) => {
          if (!this.query) return true;
          const q = this.query.toLowerCase();
          return [asset.title, asset.description, ...asset.topicTags].join(' ').toLowerCase().includes(q);
        })
        .map((asset) => ({ asset, score: 0, matchReasons: [] }));
    }

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = this.query ? 'No matching marketplace assets.' : 'No marketplace assets available.';
      empty.className = 'text-sm text-neutral-500 p-2';
      this.resultsEl.appendChild(empty);
      return;
    }

    if (fingerprint.courseName) {
      const hint = document.createElement('div');
      hint.className = 'text-xs text-primary-600 bg-primary-50 rounded-md px-3 py-1.5 mb-1';
      hint.textContent = `${items.length} assets ranked by course relevance`;
      this.resultsEl.appendChild(hint);
    }

    for (const scored of items) {
      const card = this.renderMarketplaceCard(scored);
      this.resultsEl.appendChild(card);
    }
  }

  private renderMarketplaceCard(scored: ScoredForgeAsset): HTMLElement {
    const asset = scored.asset;
    const card = document.createElement('div');
    card.className = 'flex flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition hover:shadow-md cursor-grab';
    card.dataset.mediaCard = 'true';
    card.dataset.sourceType = 'marketplace';
    card.draggable = true;

    card.addEventListener('dragstart', (ev) => {
      const payload = {
        sourceType: 'marketplace' as const,
        id: asset.id,
        title: asset.title,
        description: asset.description,
        assetCategory: asset.assetCategory,
        assetType: asset.assetType,
        subjectDomains: asset.subjectDomains,
        topicTags: asset.topicTags,
        gradeLevel: asset.gradeLevel,
        difficulty: asset.difficulty,
        bloomLevel: asset.bloomLevel,
        pedagogicalApproach: asset.pedagogicalApproach,
        estimatedDuration: asset.estimatedDuration,
        learningObjectives: asset.learningObjectives,
        linkedEntities: asset.linkedEntities,
        interactivityType: asset.interactivityType,
        thumbnailUrl: asset.thumbnailUrl,
        creatorName: asset.creatorName,
        language: asset.language,
        price: asset.price,
        license: asset.license,
      };
      ev.dataTransfer?.setData('application/json', JSON.stringify(payload));
      ev.dataTransfer?.setData('text/plain', asset.title);
      card.classList.add('ring-2', 'ring-violet-300', 'opacity-70');
      const cleanup = () => {
        card.classList.remove('ring-2', 'ring-violet-300', 'opacity-70');
        document.removeEventListener('dragend', cleanup);
      };
      document.addEventListener('dragend', cleanup);
    });

    // Category badge + rating
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2';
    const catIcon = document.createElement('span');
    catIcon.className = 'text-base';
    catIcon.textContent = this.categoryIcon(asset.assetCategory);
    header.appendChild(catIcon);
    const catBadge = document.createElement('span');
    catBadge.className = 'rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800';
    catBadge.textContent = asset.assetCategory;
    header.appendChild(catBadge);

    // Rating stars
    if (asset.ratingAverage > 0) {
      const rating = document.createElement('span');
      rating.className = 'ml-auto text-[10px] text-amber-600 font-semibold';
      rating.textContent = `★ ${asset.ratingAverage.toFixed(1)}`;
      header.appendChild(rating);
    }

    // Relevance score
    if (scored.score > 0) {
      const scoreBadge = document.createElement('span');
      scoreBadge.className = 'rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700';
      scoreBadge.textContent = `${Math.round(scored.score)}`;
      scoreBadge.title = scored.matchReasons.join(', ') || 'relevance score';
      header.appendChild(scoreBadge);
    }
    card.appendChild(header);

    // Title
    const title = document.createElement('div');
    title.textContent = asset.title;
    title.className = 'text-sm font-semibold text-neutral-900';
    card.appendChild(title);

    // Description (truncated)
    const desc = document.createElement('div');
    desc.textContent = asset.description.length > 100 ? asset.description.slice(0, 97) + '…' : asset.description;
    desc.className = 'text-xs text-neutral-600 leading-relaxed';
    card.appendChild(desc);

    // Meta row 1: domains
    const domainRow = document.createElement('div');
    domainRow.className = 'flex flex-wrap gap-1 text-[10px]';
    for (const d of asset.subjectDomains.slice(0, 3)) {
      domainRow.appendChild(this.pill(d, 'bg-neutral-100'));
    }
    card.appendChild(domainRow);

    // Meta row 2: grade, difficulty, duration, price
    const metaRow = document.createElement('div');
    metaRow.className = 'flex flex-wrap gap-1.5 text-[10px] text-neutral-500';
    metaRow.appendChild(this.pill(asset.gradeLevel.join(', '), 'bg-blue-50 text-blue-700'));
    metaRow.appendChild(this.pill(asset.difficulty, 'bg-green-50 text-green-700'));
    metaRow.appendChild(this.pill(asset.estimatedDuration, 'bg-orange-50 text-orange-700'));
    if (asset.price == null || asset.price === 0) {
      metaRow.appendChild(this.pill('Free', 'bg-emerald-50 text-emerald-700'));
    } else {
      metaRow.appendChild(this.pill(`$${asset.price}`, 'bg-neutral-100'));
    }
    card.appendChild(metaRow);

    return card;
  }

  private categoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      'simulation': '🧪',
      'activity': '🎯',
      'explanation': '📝',
      'assessment': '📋',
      'planning': '📐',
    };
    return icons[cat] || '📦';
  }

  private pill(text: string, colorClass: string): HTMLElement {
    const el = document.createElement('span');
    el.className = `rounded-full px-2 py-0.5 text-[10px] font-medium ${colorClass}`;
    el.textContent = text;
    return el;
  }

  private showInfoPopup(item: MediaItem) {
    this.hideInfoPopup();

    this.lastFocusedElement = document.activeElement as HTMLElement | null;

    const overlay = this.buildInfoOverlay(item);
    this.infoOverlay = overlay;
    document.body.appendChild(overlay);
    document.body.classList.add('overflow-hidden');

    const closeButton = overlay.querySelector<HTMLElement>('[data-media-info-close]');
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

    document.body.classList.remove('overflow-hidden');

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
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4';
    overlay.dataset.mediaInfoOverlay = 'true';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this.hideInfoPopup();
      }
    });

    const card = document.createElement('div');
    card.className = 'w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl';
    card.dataset.mediaInfoCard = 'true';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', `${item.title || 'Media item'} details`);
    overlay.appendChild(card);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100';
    closeButton.dataset.mediaInfoClose = 'true';
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
    layout.className = 'grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]';
    layout.dataset.mediaInfoLayout = 'true';
    card.appendChild(layout);

    const details = document.createElement('div');
    details.className = 'flex flex-col gap-3';
    details.dataset.mediaInfoDetails = 'true';
    layout.appendChild(details);

    const detailList = document.createElement('div');
    detailList.className = 'grid gap-2';
    detailList.dataset.mediaInfoList = 'true';
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
    preview.className = 'flex flex-col gap-3';
    preview.dataset.mediaInfoPreview = 'true';
    layout.appendChild(preview);

    const previewFrame = document.createElement('div');
    previewFrame.className = 'rounded-lg border border-neutral-200 bg-neutral-50 p-3';
    previewFrame.dataset.mediaInfoPreviewFrame = 'true';
    const previewContent = this.buildPreviewContent(item);
    previewFrame.appendChild(previewContent);
    preview.appendChild(previewFrame);

    const previewNote = document.createElement('div');
    previewNote.className = 'text-xs text-neutral-500';
    previewNote.dataset.mediaInfoPreviewNote = 'true';
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
      video.className = 'w-full rounded-md';
      return video;
    }

    if (item.type === 'audio' && (item.previewUrl || item.contentUrl)) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = item.previewUrl || item.contentUrl || '';
      audio.className = 'w-full';
      return audio;
    }

    if ((item.previewUrl || item.thumbnailUrl) && item.type !== 'audio') {
      const img = document.createElement('img');
      img.src = item.previewUrl || item.thumbnailUrl || '';
      img.alt = item.title || 'Media preview';
      img.className = 'w-full rounded-md object-cover';
      return img;
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'flex h-40 items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-500';
    placeholder.textContent = 'Preview not available for this media type.';
    return placeholder;
  }

  private appendDetail(container: HTMLElement, label: string, value: string) {
    const item = document.createElement('div');
    item.className = 'flex flex-col gap-1';

    const labelEl = document.createElement('span');
    labelEl.className = 'text-xs font-semibold uppercase tracking-wide text-neutral-400';
    labelEl.textContent = label;
    item.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'text-sm text-neutral-700';
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
    el.className = 'text-xs text-neutral-500';
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
      const card = target.closest('[data-media-card]') as HTMLElement;
      if (card) {
        card.dataset.dragging = 'true';
        card.classList.add('ring-2', 'ring-primary-300', 'opacity-70');
        
        // Remove the class after drag ends
        const removeDragClass = () => {
          card.classList.remove('ring-2', 'ring-primary-300', 'opacity-70');
          delete card.dataset.dragging;
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
      try { (e as DragEvent).dataTransfer!.dropEffect = 'copy'; } catch { /* empty */ }
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

        // ── Knowledge-source drops ───────────────────────────────
        // These items use a `sourceType` discriminator instead of `type`.

        if (item.sourceType === 'encyclopedia') {
          const label = `📚 ${item.title}`;
          const id = canvasAPI.addText(label, x, y);
          if (id) canvasAPI.showSnapHintForId(id);
          // Dispatch event so other systems can react (e.g. auto-populate fields)
          window.dispatchEvent(new CustomEvent('encyclopediaItemDropped', {
            detail: { canvasElementId: id, item, x, y },
          }));
        }

        if (item.sourceType === 'marketplace') {
          const icon = item.assetCategory === 'simulation' ? '🧪'
            : item.assetCategory === 'activity' ? '🎯'
            : item.assetCategory === 'assessment' ? '📋'
            : item.assetCategory === 'explanation' ? '📝'
            : '📦';
          const label = `${icon} ${item.title}`;
          const id = canvasAPI.addText(label, x, y);
          if (id) canvasAPI.showSnapHintForId(id);
          window.dispatchEvent(new CustomEvent('marketplaceAssetDropped', {
            detail: { canvasElementId: id, item, x, y },
          }));
        }
      } catch (error) {
        console.warn('Failed to add media item to canvas:', error);
      }
    });
  }
});
