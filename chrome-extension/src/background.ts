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

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-inspector') {
    // Send message to all tabs
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_INSPECTOR' });
        }
      });
    });
  }
});

// Set up default commands
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize default settings if not present
  chrome.storage.sync.get(['hotkey', 'highlightColor', 'displayFormat', 'copyFormat'], (items) => {
    const hasSettings = items.hotkey || items.highlightColor || items.displayFormat || items.copyFormat;
    if (!hasSettings) {
      chrome.storage.sync.set({
        hotkey: 'Alt',
        highlightColor: '#3b82f6',
        displayFormat: 'class',
        copyFormat: 'class',
      });
    }
  });
});

export {};

