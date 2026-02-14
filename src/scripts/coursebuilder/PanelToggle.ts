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
    this.toggleButtons = document.querySelectorAll<HTMLElement>('[data-engine-panel-toggle-btn]');
    this.panelViews = document.querySelectorAll<HTMLElement>('[data-engine-panel-view]');

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

    const initial = Array.from(this.toggleButtons).find((button) =>
      button.getAttribute('aria-pressed') === 'true' ||
      button.getAttribute('aria-pressed') === 'true'
    );
    const initialView = initial?.getAttribute('data-panel-view') ?? this.toggleButtons[0]?.getAttribute('data-panel-view');
    if (initialView) {
      this.switchPanel(initialView);
    }
  }

  private switchPanel(viewName: string): void {
    if (!this.toggleButtons || !this.panelViews) {
      return;
    }

    // Update button active states
    this.toggleButtons.forEach(button => {
      const isActive = button.getAttribute('data-panel-view') === viewName;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.classList.toggle('hover:bg-neutral-50', !isActive);
      button.classList.toggle('hover:text-neutral-900', !isActive);
      button.classList.toggle('hover:bg-primary-700', isActive);
      button.classList.toggle('hover:text-white', isActive);
      button.classList.toggle('bg-primary-600', isActive);
      button.classList.toggle('text-white', isActive);
      button.classList.toggle('border-primary-600', isActive);
      button.classList.toggle('bg-white', !isActive);
      button.classList.toggle('text-neutral-700', !isActive);
      button.classList.toggle('border-neutral-300', !isActive);
    });

    // Update panel view visibility
    this.panelViews.forEach(view => {
      const isActive = view.getAttribute('data-view') === viewName;
      if (isActive) {
        view.classList.remove('hidden');
        view.setAttribute('aria-hidden', 'false');
      } else {
        view.classList.add('hidden');
        view.setAttribute('aria-hidden', 'true');
      }
    });
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  new PanelToggle();
}
