// Inline settings to avoid code splitting issues with IIFE format
interface Settings {
  hotkey: 'Alt' | 'Ctrl' | 'Meta' | 'Shift';
  highlightColor: string;
  displayFormat: 'class' | 'selector' | 'full';
  copyFormat: 'class' | 'selector' | 'full';
}

const DEFAULT_SETTINGS: Settings = {
  hotkey: 'Alt',
  highlightColor: '#3b82f6',
  displayFormat: 'class',
  copyFormat: 'class',
};

function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as Settings);
    });
  });
}

function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

class PopupController {
  private settings: Settings | null = null;

  async init() {
    this.settings = await getSettings();
    this.render();
    this.setupEventListeners();
  }

  private render() {
    if (!this.settings) return;

    const container = document.getElementById('settings-container');
    if (!container) return;

    container.innerHTML = `
      <div class="setting-group">
        <label for="hotkey">Activation Hotkey:</label>
        <select id="hotkey">
          <option value="Alt" ${this.settings.hotkey === 'Alt' ? 'selected' : ''}>Alt</option>
          <option value="Ctrl" ${this.settings.hotkey === 'Ctrl' ? 'selected' : ''}>Ctrl</option>
          <option value="Meta" ${this.settings.hotkey === 'Meta' ? 'selected' : ''}>Meta (Cmd)</option>
          <option value="Shift" ${this.settings.hotkey === 'Shift' ? 'selected' : ''}>Shift</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="highlightColor">Highlight Color:</label>
        <input type="color" id="highlightColor" value="${this.settings.highlightColor}">
      </div>

      <div class="setting-group">
        <label for="displayFormat">Display Format:</label>
        <select id="displayFormat">
          <option value="class" ${this.settings.displayFormat === 'class' ? 'selected' : ''}>Class Name</option>
          <option value="selector" ${this.settings.displayFormat === 'selector' ? 'selected' : ''}>CSS Selector</option>
          <option value="full" ${this.settings.displayFormat === 'full' ? 'selected' : ''}>Full Info</option>
        </select>
      </div>

      <div class="setting-group">
        <label for="copyFormat">Copy Format:</label>
        <select id="copyFormat">
          <option value="class" ${this.settings.copyFormat === 'class' ? 'selected' : ''}>Class Name</option>
          <option value="selector" ${this.settings.copyFormat === 'selector' ? 'selected' : ''}>CSS Selector</option>
          <option value="full" ${this.settings.copyFormat === 'full' ? 'selected' : ''}>Full Path</option>
        </select>
      </div>

      <div class="info">
        <p><strong>Usage:</strong></p>
        <p>Hold <strong>${this.settings.hotkey}</strong> and hover over elements to inspect them. Click to copy the selector.</p>
        <p>Press <strong>Escape</strong> to exit inspector mode.</p>
      </div>

      <div class="actions">
        <button id="saveBtn" class="btn-primary">Save Settings</button>
      </div>
    `;
  }

  private setupEventListeners() {
    document.getElementById('saveBtn')?.addEventListener('click', () => {
      this.saveSettings();
    });

    // Auto-save on change
    ['hotkey', 'highlightColor', 'displayFormat', 'copyFormat'].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.saveSettings();
        });
      }
    });
  }

  private async saveSettings() {
    const hotkey = (document.getElementById('hotkey') as HTMLSelectElement)?.value as Settings['hotkey'];
    const highlightColor = (document.getElementById('highlightColor') as HTMLInputElement)?.value;
    const displayFormat = (document.getElementById('displayFormat') as HTMLSelectElement)?.value as Settings['displayFormat'];
    const copyFormat = (document.getElementById('copyFormat') as HTMLSelectElement)?.value as Settings['copyFormat'];

    const newSettings: Partial<Settings> = {
      hotkey,
      highlightColor,
      displayFormat,
      copyFormat,
    };

    await saveSettings(newSettings);
    this.settings = { ...this.settings!, ...newSettings };
    
    // Show feedback
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Saved!';
      saveBtn.style.backgroundColor = '#4ade80';
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 1000);
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController().init();
});

export {};

