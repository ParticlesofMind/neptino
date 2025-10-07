/**
 * Enhanced Snap Menu Handler
 * Manages the UI for enhanced smart guides settings
 */

import { snapManager } from '../tools/SnapManager';

export class EnhancedSnapMenuHandler {
  private menu: HTMLElement | null = null;
  private settings: Map<string, HTMLElement> = new Map();

  public initialize(): void {
    this.menu = document.querySelector('[data-snap-menu]');
    if (!this.menu) return;

    this.bindSettingsControls();
    this.loadSettings();
    this.bindEvents();
    
    // Always show advanced settings initially since smart guides toggle is checked by default
    // Users should see what features are available
    this.toggleAdvancedSettings();
  }

  private bindSettingsControls(): void {
    if (!this.menu) return;

    // Bind checkbox toggles
    const toggles = this.menu.querySelectorAll('[data-smart-setting]');
    toggles.forEach(toggle => {
      const setting = toggle.getAttribute('data-smart-setting');
      const checkbox = toggle.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (setting && checkbox) {
        this.settings.set(setting, checkbox);
        checkbox.addEventListener('change', () => this.handleSettingChange(setting, checkbox.checked));
      }
    });

    // Bind range sliders - removed equal spacing bias
    // Bind reference mode buttons (Canvas, Object, Grid)
    const referenceModeButtons = this.menu.querySelectorAll('[data-reference-mode]');
    referenceModeButtons.forEach(button => {
      const mode = button.getAttribute('data-reference-mode');
      if (mode) {
        this.settings.set(`referenceMode_${mode}`, button as HTMLElement);
      }
    });

    // Bind grid options
    const showGridToggle = this.menu.querySelector('#show-grid') as HTMLInputElement;
    const gridSpacingInput = this.menu.querySelector('#grid-spacing') as HTMLInputElement;
    
    if (showGridToggle) {
      this.settings.set('showGrid', showGridToggle);
      showGridToggle.addEventListener('change', () => this.handleSettingChange('showGrid', showGridToggle.checked));
    }
    
    if (gridSpacingInput) {
      this.settings.set('gridSpacing', gridSpacingInput);
      gridSpacingInput.addEventListener('input', () => {
        const spacing = Math.max(1, Math.min(100, parseInt(gridSpacingInput.value) || 20));
        gridSpacingInput.value = String(spacing);
        this.handleSettingChange('gridSpacing', spacing);
      });
    }

    // Bind distribute buttons  
    const distributeButtons = this.menu.querySelectorAll('[data-distribute]');
    distributeButtons.forEach(button => {
      const mode = button.getAttribute('data-distribute');
      if (mode) {
        this.settings.set(`distribute_${mode}`, button as HTMLElement);
      }
    });
  }

  private loadSettings(): void {
    const prefs = snapManager.getPrefs();
    
    // Load checkbox settings
    this.setCheckboxValue('showDistToAll', prefs.showDistToAll);
    this.setCheckboxValue('enableResizeGuides', prefs.enableResizeGuides);
    this.setCheckboxValue('enableSmartSelection', prefs.enableSmartSelection);
    this.setCheckboxValue('enableColorCoding', prefs.enableColorCoding);

    // Load reference mode from preferences/localStorage
    this.loadReferenceMode();
    
    // Load grid settings
    this.loadGridSettings();
    
    // Load distribute mode from localStorage
    this.loadDistributeMode();
  }

  private setCheckboxValue(setting: string, value: boolean): void {
    const element = this.settings.get(setting) as HTMLInputElement;
    if (element && element.type === 'checkbox') {
      element.checked = value;
    }
  }

  private setRangeValue(setting: string, value: number): void {
    const element = this.settings.get(setting) as HTMLInputElement;
    if (element && element.type === 'range') {
      element.value = value.toString();
      // Update display value
      const valueDisplay = this.menu?.querySelector('.engine__snap-range-value');
      if (valueDisplay) valueDisplay.textContent = `${value.toFixed(1)}x`;
    }
  }

  private setSelectValue(setting: string, value: string): void {
    const element = this.settings.get(setting) as HTMLSelectElement;
    if (element && element.tagName === 'SELECT') {
      element.value = value;
    }
  }

  private loadReferenceMode(): void {
    if (!this.menu) return;
    
    try {
      const savedMode = localStorage.getItem('referenceMode') || 'canvas';
      
      // Remove active class from all reference mode items
      this.menu.querySelectorAll('[data-reference-mode]').forEach(item => {
        item.classList.remove('engine__snap-item--active');
      });
      
      // Add active class to saved mode
      const activeItem = this.menu.querySelector(`[data-reference-mode="${savedMode}"]`);
      if (activeItem) {
        activeItem.classList.add('engine__snap-item--active');
      }
      
      // Show/hide grid options based on loaded reference mode
      const gridOptions = document.getElementById('grid-options');
      if (gridOptions) {
        if (savedMode === 'grid') {
          gridOptions.style.display = 'block';
        } else {
          gridOptions.style.display = 'none';
        }
      }
    } catch (error) {
      console.warn('Failed to load reference mode:', error);
    }
  }

  private loadGridSettings(): void {
    try {
      // Load show grid setting
      const savedShowGrid = localStorage.getItem('showGrid');
      if (savedShowGrid !== null) {
        this.setCheckboxValue('showGrid', savedShowGrid === 'true');
      }
      
      // Load grid spacing
      const savedSpacing = localStorage.getItem('gridSpacing');
      if (savedSpacing !== null) {
        const gridSpacingInput = this.settings.get('gridSpacing') as HTMLInputElement;
        if (gridSpacingInput) {
          gridSpacingInput.value = savedSpacing;
        }
      }
    } catch (error) {
      console.warn('Failed to load grid settings:', error);
    }
  }

  private loadDistributeMode(): void {
    if (!this.menu) return;
    
    try {
      const savedMode = localStorage.getItem('distributeMode') || 'horizontal';
      
      // Remove active class from all distribute items
      this.menu.querySelectorAll('[data-distribute]').forEach(item => {
        item.classList.remove('engine__snap-item--active');
      });
      
      // Add active class to saved mode
      const activeItem = this.menu.querySelector(`[data-distribute="${savedMode}"]`);
      if (activeItem) {
        activeItem.classList.add('engine__snap-item--active');
      }
    } catch (error) {
      console.warn('Failed to load distribute mode:', error);
    }
  }

  private handleSettingChange(setting: string, value: any): void {
    const currentPrefs = snapManager.getPrefs();
    const newPrefs = { ...currentPrefs, [setting]: value };
    
    snapManager.setPrefs(newPrefs);
    
    // Emit custom event for other components to react
    this.emitSettingChangeEvent(setting, value);
  }

  private emitSettingChangeEvent(setting: string, value: any): void {
    const event = new CustomEvent('smart-guides:setting-changed', {
      detail: { setting, value }
    });
    document.dispatchEvent(event);
  }

  private bindEvents(): void {
    // Listen for snap mode changes to show/hide advanced settings
    document.addEventListener('snap:mode-changed', () => {
      // Always show advanced settings - users should see what features are available
      this.toggleAdvancedSettings();
    });

    // Listen for external setting updates
    document.addEventListener('snap:prefs-updated', () => {
      this.loadSettings();
    });
  }

  private toggleAdvancedSettings(): void {
    if (!this.menu) return;
    
    const advancedSection = this.menu.querySelector('.engine__snap-section');
    if (advancedSection) {
      // Always show the advanced settings when the menu is open
      // Users should be able to see and configure these settings regardless of current mode
      (advancedSection as HTMLElement).style.display = 'grid';
      (advancedSection as HTMLElement).style.visibility = 'visible';
      (advancedSection as HTMLElement).style.opacity = '1';
    }
  }

  /**
   * Public API for programmatic settings updates
   */
  public updateSetting(setting: string, value: any): void {
    this.handleSettingChange(setting, value);
    
    // Update UI to reflect the change
    switch (typeof value) {
      case 'boolean':
        this.setCheckboxValue(setting, value);
        break;
      case 'number':
        this.setRangeValue(setting, value);
        break;
      case 'string':
        this.setSelectValue(setting, value);
        break;
    }
  }

  public getSettings(): Record<string, any> {
    const prefs = snapManager.getPrefs();
    return {
      showDistToAll: prefs.showDistToAll,
      enableResizeGuides: prefs.enableResizeGuides,
      enableSmartSelection: prefs.enableSmartSelection,
      enableColorCoding: prefs.enableColorCoding,
      equalSpacingBias: prefs.equalSpacingBias,
      referenceMode: prefs.referenceMode || 'canvas',
      showGrid: prefs.showGrid,
      gridSpacing: prefs.gridSpacing || 20
    };
  }

  /**
   * Reset all enhanced settings to defaults
   */
  public resetToDefaults(): void {
    const defaults = {
      showDistToAll: true,
      enableResizeGuides: true,
      enableSmartSelection: true,
      enableColorCoding: true,
      equalSpacingBias: 1.5,
      referenceMode: 'canvas',
      showGrid: true,
      gridSpacing: 20
    };

    Object.entries(defaults).forEach(([setting, value]) => {
      this.updateSetting(setting, value);
    });
  }

  /**
   * Show/hide the smart guides tooltip with current settings
   */
  public showSettingsTooltip(): void {
    const settings = this.getSettings();
    const tooltip = this.createSettingsTooltip(settings);
    
    if (this.menu) {
      // Position tooltip near the menu
      const rect = this.menu.getBoundingClientRect();
      tooltip.style.left = `${rect.right + 10}px`;
      tooltip.style.top = `${rect.top}px`;
      
      document.body.appendChild(tooltip);
      
      // Auto-remove after 3 seconds
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip);
        }
      }, 3000);
    }
  }

  private createSettingsTooltip(settings: Record<string, any>): HTMLElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'smart-guides-tooltip';
    tooltip.innerHTML = `
      <div class="smart-guides-tooltip__header">
        <strong>Smart Guides Active</strong>
      </div>
      <div class="smart-guides-tooltip__content">
        <div class="tooltip-feature ${settings.enableColorCoding ? 'enabled' : 'disabled'}">
          🎨 Color Coding: ${settings.enableColorCoding ? 'ON' : 'OFF'}
        </div>
        <div class="tooltip-feature ${settings.showDistToAll ? 'enabled' : 'disabled'}">
          📏 Distance Labels: ${settings.showDistToAll ? 'ON' : 'OFF'}
        </div>
        <div class="tooltip-feature ${settings.enableResizeGuides ? 'enabled' : 'disabled'}">
          📐 Resize Guides: ${settings.enableResizeGuides ? 'ON' : 'OFF'}
        </div>
        <div class="tooltip-feature ${settings.enableSmartSelection ? 'enabled' : 'disabled'}">
          🎯 Smart Selection: ${settings.enableSmartSelection ? 'ON' : 'OFF'}
        </div>
        <div class="tooltip-feature">
          ⚡ Equal Spacing: ${settings.equalSpacingBias}x sensitivity
        </div>
      </div>
    `;

    // Add styles
    Object.assign(tooltip.style, {
      position: 'fixed',
      zIndex: '10000',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '250px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      pointerEvents: 'none'
    });

    return tooltip;
  }
}

// Export singleton instance
export const enhancedSnapMenuHandler = new EnhancedSnapMenuHandler();
