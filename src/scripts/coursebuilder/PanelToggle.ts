/**
 * Panel Toggle Handler
 * Handles switching between Layers and Navigation panels in the engine
 */

export class PanelToggle {
  private toggleButtons: NodeListOf<HTMLElement> | null = null;
  private panelViews: NodeListOf<HTMLElement> | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupToggle());
    } else {
      this.setupToggle();
    }
  }

  private setupToggle(): void {
    this.toggleButtons = document.querySelectorAll<HTMLElement>('[data-panel-view]');
    this.panelViews = document.querySelectorAll<HTMLElement>('.engine__panel-view');

    if (!this.toggleButtons || this.toggleButtons.length === 0) {
      return;
    }

    // Add click handlers to toggle buttons
    this.toggleButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const viewName = button.getAttribute('data-panel-view');
        if (viewName) {
          this.switchPanel(viewName);
        }
      });
    });
  }

  private switchPanel(viewName: string): void {
    if (!this.toggleButtons || !this.panelViews) {
      return;
    }

    // Update button active states
    this.toggleButtons.forEach(button => {
      const isActive = button.getAttribute('data-panel-view') === viewName;
      if (isActive) {
        button.classList.add('engine__panel-toggle-btn--active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('engine__panel-toggle-btn--active');
        button.setAttribute('aria-pressed', 'false');
      }
    });

    // Update panel view visibility
    this.panelViews.forEach(view => {
      const isActive = view.getAttribute('data-view') === viewName;
      if (isActive) {
        view.classList.add('engine__panel-view--active');
      } else {
        view.classList.remove('engine__panel-view--active');
      }
    });
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  new PanelToggle();
}
