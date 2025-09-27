export class PanelManager {
  private currentPanel: string;
  private tabs: NodeListOf<HTMLButtonElement>;
  private views: NodeListOf<HTMLElement>;

  constructor() {
    this.tabs = document.querySelectorAll('.engine__panel-tab');
    this.views = document.querySelectorAll('.engine__panel-view');
    
    // Load saved panel from localStorage or default to 'layers'
    this.currentPanel = localStorage.getItem('enginePanel:activePanel') || 'layers';
    
    this.initializePanels();
    this.bindEvents();
  }

  private initializePanels(): void {
    // Set initial active panel
    this.switchPanel(this.currentPanel);
  }

  private bindEvents(): void {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const panelName = (e.target as HTMLButtonElement).dataset.panel;
        if (panelName) {
          this.switchPanel(panelName);
        }
      });
    });
  }

  private switchPanel(panelName: string): void {
    // Update current panel
    this.currentPanel = panelName;

    // Update tab states
    this.tabs.forEach(tab => {
      if (tab.dataset.panel === panelName) {
        tab.classList.add('engine__panel-tab--active');
      } else {
        tab.classList.remove('engine__panel-tab--active');
      }
    });

    // Update view states
    this.views.forEach(view => {
      if (view.dataset.view === panelName) {
        view.classList.add('engine__panel-view--active');
      } else {
        view.classList.remove('engine__panel-view--active');
      }
    });

    // Save to localStorage
    localStorage.setItem('enginePanel:activePanel', panelName);

    // Trigger custom event for other components that might need to know
    document.dispatchEvent(new CustomEvent('panelChanged', {
      detail: { activePanel: panelName }
    }));

    console.log(`Panel switched to: ${panelName}`);
  }

  /**
   * Get the currently active panel
   */
  public getCurrentPanel(): string {
    return this.currentPanel;
  }

  /**
   * Programmatically switch to a panel
   */
  public setActivePanel(panelName: string): void {
    this.switchPanel(panelName);
  }
}