export interface Settings {
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

export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as Settings);
    });
  });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, () => {
      resolve();
    });
  });
}

