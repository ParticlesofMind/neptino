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

    // Bind range sliders
    const equalSpacingBias = this.menu.querySelector('#equalSpacingBias') as HTMLInputElement;
    if (equalSpacingBias) {
      this.settings.set('equalSpacingBias', equalSpacingBias);
      const valueDisplay = this.menu.querySelector('.snap-menu__range-value');
      
      equalSpacingBias.addEventListener('input', () => {
        const value = parseFloat(equalSpacingBias.value);
        if (valueDisplay) valueDisplay.textContent = `${value.toFixed(1)}x`;
        this.handleSettingChange('equalSpacingBias', value);
      });
    }

    // Bind select dropdown
    const guideExtendMode = this.menu.querySelector('#guideExtendMode') as HTMLSelectElement;
    if (guideExtendMode) {
      this.settings.set('guideExtendMode', guideExtendMode);
      guideExtendMode.addEventListener('change', () => {
        this.handleSettingChange('guideExtendMode', guideExtendMode.value);
      });
    }
  }

  private loadSettings(): void {
    const prefs = snapManager.getPrefs();
    
    // Load checkbox settings
    this.setCheckboxValue('showDistToAll', prefs.showDistToAll);
    this.setCheckboxValue('enableResizeGuides', prefs.enableResizeGuides);
    this.setCheckboxValue('enableSmartSelection', prefs.enableSmartSelection);
    this.setCheckboxValue('enableColorCoding', prefs.enableColorCoding);

    // Load range settings
    this.setRangeValue('equalSpacingBias', prefs.equalSpacingBias);

    // Load select settings
    this.setSelectValue('guideExtendMode', prefs.guideExtendMode);
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
      const valueDisplay = this.menu?.querySelector('.snap-menu__range-value');
      if (valueDisplay) valueDisplay.textContent = `${value.toFixed(1)}x`;
    }
  }

  private setSelectValue(setting: string, value: string): void {
    const element = this.settings.get(setting) as HTMLSelectElement;
    if (element && element.tagName === 'SELECT') {
      element.value = value;
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
    document.addEventListener('snap:mode-changed', (e: any) => {
      const isSmartMode = e.detail?.mode === 'smart';
      this.toggleAdvancedSettings(isSmartMode);
    });

    // Listen for external setting updates
    document.addEventListener('snap:prefs-updated', () => {
      this.loadSettings();
    });
  }

  private toggleAdvancedSettings(show: boolean): void {
    if (!this.menu) return;
    
    const advancedSection = this.menu.querySelector('.snap-menu__section');
    if (advancedSection) {
      (advancedSection as HTMLElement).style.display = show ? 'flex' : 'none';
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
      guideExtendMode: prefs.guideExtendMode
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
      guideExtendMode: 'selection'
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