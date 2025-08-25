/**
 * Manages adaptive search placeholders and preview instances
 */
export class AdaptiveSearchManager {
  private searchInput: HTMLInputElement | null = null;
  private mediaItems: NodeListOf<Element> | null = null;
  private navCourseItems: NodeListOf<Element> | null = null;
  private previewContainers: NodeListOf<Element> | null = null;
  
  private placeholders: { [key: string]: string } = {
    'video': 'Search video content...',
    'audio': 'Search audio files...',
    'image': 'Search images...',
    'text': 'Search text content...',
    'quiz': 'Search quiz questions...',
    'document': 'Search documents...',
    'default': 'Search media...'
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Get DOM elements
    this.searchInput = document.getElementById('engine__search') as HTMLInputElement;
    this.mediaItems = document.querySelectorAll('.media__item');
    this.navCourseItems = document.querySelectorAll('.nav-course__item');
    this.previewContainers = document.querySelectorAll('[id^="preview-"]');

    if (this.searchInput && this.mediaItems.length > 0) {
      this.setupMediaItemListeners();
    }

    if (this.navCourseItems.length > 0) {
      this.setupNavCourseListeners();
      // Show the first preview by default (since first nav item is already selected)
      this.initializeDefaultPreview();
    }
  }

  private initializeDefaultPreview(): void {
    // Find the first nav-course item that's already active
    const activeNavItem = document.querySelector('.nav-course__item.active') as HTMLElement;
    if (activeNavItem) {
      const previewId = activeNavItem.getAttribute('data-preview');
      if (previewId) {
        this.showPreview(previewId);
      }
    } else if (this.navCourseItems && this.navCourseItems.length > 0) {
      // If no active item, use the first one
      const firstNavItem = this.navCourseItems[0] as HTMLElement;
      const previewId = firstNavItem.getAttribute('data-preview');
      if (previewId) {
        firstNavItem.classList.add('active');
        this.showPreview(previewId);
      }
    }
  }

  private setupMediaItemListeners(): void {
    this.mediaItems?.forEach(item => {
      item.addEventListener('click', () => {
        const mediaType = item.getAttribute('data-media-type') || 'default';
        this.updateSearchPlaceholder(mediaType);
        
        // Add active class to clicked item
        this.mediaItems?.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  private setupNavCourseListeners(): void {
    this.navCourseItems?.forEach(item => {
      item.addEventListener('click', () => {
        const previewId = item.getAttribute('data-preview');
        if (previewId) {
          this.showPreview(previewId);
          
          // Add active class to clicked item
          this.navCourseItems?.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
        }
      });
    });
  }

  private updateSearchPlaceholder(mediaType: string): void {
    if (this.searchInput) {
      const placeholder = this.placeholders[mediaType] || this.placeholders['default'];
      this.searchInput.setAttribute('placeholder', placeholder);
    }
  }

  private showPreview(previewId: string): void {
    // Hide all preview containers
    this.previewContainers?.forEach(container => {
      container.classList.remove('active');
    });

    // Show the selected preview container
    const targetPreview = document.getElementById(`preview-${previewId}`);
    if (targetPreview) {
      targetPreview.classList.add('active');
      
      // If this is the outline preview, fetch curriculum data
      if (previewId === 'outline') {
        this.loadCurriculumData(targetPreview);
      }
    }
  }

  private async loadCurriculumData(previewContainer: Element): Promise<void> {
    try {
      // Get the actual curriculum data from the CurriculumManager
      const courseBuilderInstance = (window as any).courseBuilderCanvasInstance;
      if (courseBuilderInstance && courseBuilderInstance.curriculumManager) {
        const curriculumData = courseBuilderInstance.curriculumManager.getCurrentCurriculum();
        
        if (curriculumData && curriculumData.length > 0) {
          this.renderCurriculumOutline(previewContainer, { lessons: curriculumData });
        } else {
          // No curriculum data available
          previewContainer.innerHTML = '<p class="no-curriculum">No curriculum available for this course yet.</p>';
        }
      } else {
        // Fallback when CurriculumManager is not available
        previewContainer.innerHTML = '<p class="loading">Loading curriculum...</p>';
      }
    } catch (error) {
      console.error('Failed to load curriculum data:', error);
      previewContainer.innerHTML = '<p class="error">Failed to load curriculum outline</p>';
    }
  }

  private renderCurriculumOutline(container: Element, data: any): void {
    const outlineHTML = data.lessons.map((lesson: any) => `
      <div class="lesson">
        <h4>${lesson.title}</h4>
        <ul class="topics">
          ${lesson.topics.map((topic: any) => `<li>${topic.title || topic}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="outline-preview">
        ${outlineHTML}
      </div>
    `;
  }
}
