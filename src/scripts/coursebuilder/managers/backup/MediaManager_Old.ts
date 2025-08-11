/**
 * Media Manager
 * Manages media selection, search panels, and media-related UI interactions
 * Single Responsibility: Media handling and media UI management only
 */

export class MediaManager {
  private currentMediaType: string = 'images';
  private onMediaSelectionCallback: ((mediaType: string) => void) | null = null;

  constructor() {
    this.bindMediaEvents();
  }

  /**
   * Set callback for media selection changes
   */
  setOnMediaSelection(callback: (mediaType: string) => void): void {
    this.onMediaSelectionCallback = callback;
  }

  /**
   * Bind media-related events
   */
  private bindMediaEvents(): void {
    // Media button events
    document.querySelectorAll('[data-media-type]').forEach(button => {
      button.addEventListener('click', this.handleMediaSelection.bind(this));
    });

    // Media search events
    this.bindMediaSearchEvents();
  }

  /**
   * Bind media search panel events
   */
  private bindMediaSearchEvents(): void {
    const searchPanel = document.getElementById('media-search-panel');
    if (!searchPanel) return;

    // Search input events
    const searchInput = searchPanel.querySelector('.media-search__input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', this.handleMediaSearch.bind(this));
      searchInput.addEventListener('keypress', this.handleMediaSearchKeypress.bind(this));
    }

    // Close panel events
    const closeBtn = searchPanel.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.closeMediaSearchPanel.bind(this));
    }
  }

  /**
   * Handle media type selection
   */
  private handleMediaSelection(event: Event): void {
    const button = event.currentTarget as HTMLElement;
    const mediaType = button.dataset.mediaType;
    
    if (!mediaType) return;

    // Update active state
    document.querySelectorAll('.media-btn').forEach(m => m.classList.remove('media-btn--selected'));
    button.classList.add('media-btn--selected');

    // Update current media type
    this.currentMediaType = mediaType;
    
    // Update search panel
    this.updateMediaSearchPanel(mediaType);
    
    console.log(`🎬 Media type selected: ${mediaType}`);

    // Trigger callback
    if (this.onMediaSelectionCallback) {
      this.onMediaSelectionCallback(mediaType);
    }
  }

  /**
   * Update media search panel content
   */
  private updateMediaSearchPanel(mediaType: string): void {
    const searchPanel = document.getElementById('media-search-panel');
    if (!searchPanel) return;

    const mediaTypeCapitalized = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);
    
    searchPanel.innerHTML = `
      <div class="media-search">
        <h3 class="media-search__title">${mediaTypeCapitalized}</h3>
        <input type="search" class="media-search__input" placeholder="Search ${mediaType}...">
        <div class="media-search__content">
          <p class="media-search__placeholder">Search for ${mediaType} to see results</p>
        </div>
        <button class="close-btn" aria-label="Close search panel">×</button>
      </div>
    `;

    // Re-bind events for new elements
    this.bindMediaSearchEvents();
  }

  /**
   * Handle media search input
   */
  private handleMediaSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    
    if (query.length < 2) {
      this.showSearchPlaceholder();
      return;
    }

    console.log(`🔍 Searching ${this.currentMediaType}: ${query}`);
    this.performMediaSearch(query);
  }

  /**
   * Handle search input keypress
   */
  private handleMediaSearchKeypress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const input = event.target as HTMLInputElement;
      const query = input.value.trim();
      
      if (query.length >= 2) {
        this.performMediaSearch(query);
      }
    }
  }

  /**
   * Perform media search
   */
  private performMediaSearch(query: string): void {
    const contentArea = document.querySelector('.media-search__content');
    if (!contentArea) return;

    // Show loading state
    contentArea.innerHTML = '<p class="media-search__loading">Searching...</p>';

    // Simulate search results (replace with actual API call)
    setTimeout(() => {
      this.displaySearchResults(query);
    }, 500);
  }

  /**
   * Display search results
   */
  private displaySearchResults(query: string): void {
    const contentArea = document.querySelector('.media-search__content');
    if (!contentArea) return;

    // Mock results based on media type
    const results = this.generateMockResults(query, this.currentMediaType);
    
    if (results.length === 0) {
      contentArea.innerHTML = `<p class="media-search__no-results">No ${this.currentMediaType} found for "${query}"</p>`;
      return;
    }

    const resultsHTML = results.map(result => `
      <div class="media-item" data-media-url="${result.url}">
        <img src="${result.thumbnail}" alt="${result.title}" class="media-item__thumbnail">
        <div class="media-item__info">
          <h4 class="media-item__title">${result.title}</h4>
          <p class="media-item__description">${result.description}</p>
        </div>
      </div>
    `).join('');

    contentArea.innerHTML = resultsHTML;

    // Bind click events to results
    contentArea.querySelectorAll('.media-item').forEach(item => {
      item.addEventListener('click', this.handleMediaItemSelection.bind(this));
    });
  }

  /**
   * Handle media item selection
   */
  private handleMediaItemSelection(event: Event): void {
    const mediaItem = event.currentTarget as HTMLElement;
    const mediaUrl = mediaItem.dataset.mediaUrl;
    
    if (!mediaUrl) return;

    console.log(`📁 Media selected: ${mediaUrl}`);
    
    // Close search panel
    this.closeMediaSearchPanel();
    
    // Add media to canvas (implement as needed)
    this.addMediaToCanvas(mediaUrl);
  }

  /**
   * Add media to canvas
   */
  private addMediaToCanvas(mediaUrl: string): void {
    // This would integrate with the canvas system
    console.log(`➕ Adding media to canvas: ${mediaUrl}`);
    
    // Emit custom event for canvas integration
    const event = new CustomEvent('addMediaToCanvas', {
      detail: { url: mediaUrl, type: this.currentMediaType }
    });
    document.dispatchEvent(event);
  }

  /**
   * Show search placeholder
   */
  private showSearchPlaceholder(): void {
    const contentArea = document.querySelector('.media-search__content');
    if (contentArea) {
      contentArea.innerHTML = `<p class="media-search__placeholder">Search for ${this.currentMediaType} to see results</p>`;
    }
  }

  /**
   * Close media search panel
   */
  private closeMediaSearchPanel(): void {
    const searchPanel = document.getElementById('media-search-panel');
    if (searchPanel) {
      searchPanel.style.display = 'none';
    }
  }

  /**
   * Open media search panel
   */
  openMediaSearchPanel(): void {
    const searchPanel = document.getElementById('media-search-panel');
    if (searchPanel) {
      searchPanel.style.display = 'block';
      
      // Focus search input
      const searchInput = searchPanel.querySelector('.media-search__input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }

  /**
   * Generate mock search results
   */
  private generateMockResults(query: string, mediaType: string): Array<{url: string, thumbnail: string, title: string, description: string}> {
    // Mock data - replace with actual API integration
    const mockData = {
      images: [
        { url: 'https://example.com/image1.jpg', thumbnail: 'https://example.com/thumb1.jpg', title: `${query} Image 1`, description: 'High quality image' },
        { url: 'https://example.com/image2.jpg', thumbnail: 'https://example.com/thumb2.jpg', title: `${query} Image 2`, description: 'Professional photo' }
      ],
      videos: [
        { url: 'https://example.com/video1.mp4', thumbnail: 'https://example.com/video-thumb1.jpg', title: `${query} Video 1`, description: 'HD video content' },
        { url: 'https://example.com/video2.mp4', thumbnail: 'https://example.com/video-thumb2.jpg', title: `${query} Video 2`, description: 'Educational video' }
      ],
      audio: [
        { url: 'https://example.com/audio1.mp3', thumbnail: 'https://example.com/audio-thumb1.jpg', title: `${query} Audio 1`, description: 'Background music' },
        { url: 'https://example.com/audio2.mp3', thumbnail: 'https://example.com/audio-thumb2.jpg', title: `${query} Audio 2`, description: 'Sound effect' }
      ]
    };

    return mockData[mediaType as keyof typeof mockData] || [];
  }

  /**
   * Get current media type
   */
  getCurrentMediaType(): string {
    return this.currentMediaType;
  }

  /**
   * Set current media type
   */
  setCurrentMediaType(mediaType: string): void {
    this.currentMediaType = mediaType;
    this.updateMediaSearchPanel(mediaType);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.onMediaSelectionCallback = null;
    // Additional cleanup as needed
  }
}
