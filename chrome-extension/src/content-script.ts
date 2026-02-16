import './content-script.css';

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

interface ElementInfo {
  tag: string;
  classes: string[];
  id: string | null;
  selector: string;
  fullPath: string;
}

class SelectorInspector {
  private isActive = false;
  private currentElement: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private settings: Settings | null = null;
  private hotkeyPressed = false;

  constructor() {
    this.init();
  }

  private async init() {
    this.settings = await getSettings();
    this.createTooltip();
    this.createHighlightOverlay();
    this.setupEventListeners();
    this.listenForSettingsChanges();
  }

  private createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'css-selector-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      display: none;
      max-width: 400px;
      word-break: break-all;
      line-height: 1.4;
    `;
    document.body.appendChild(this.tooltip);
  }

  private createHighlightOverlay() {
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'css-selector-highlight';
    this.highlightOverlay.style.cssText = `
      position: absolute;
      border: 2px solid ${this.settings?.highlightColor || '#3b82f6'};
      pointer-events: none;
      z-index: 2147483646;
      box-sizing: border-box;
      display: none;
    `;
    document.body.appendChild(this.highlightOverlay);
  }

  private setupEventListeners() {
    // Listen for hotkey press from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TOGGLE_INSPECTOR') {
        this.toggleInspector();
      }
      return true;
    });

    // Mouse move handler
    document.addEventListener('mousemove', (e) => {
      if (this.isActive && this.hotkeyPressed) {
        this.handleMouseMove(e);
      }
    }, { passive: true });

    // Click handler
    document.addEventListener('click', (e) => {
      if (this.isActive && this.hotkeyPressed) {
        e.preventDefault();
        e.stopPropagation();
        // Get the element at the click position
        const clickedElement = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
        if (clickedElement && clickedElement !== this.tooltip && clickedElement !== this.highlightOverlay) {
          this.copyElementHTML(clickedElement);
          this.deactivate();
        }
      }
    }, { capture: true });

    // Hotkey detection
    document.addEventListener('keydown', (e) => {
      const hotkey = this.settings?.hotkey || 'Alt';
      if (this.isHotkeyPressed(e, hotkey)) {
        this.hotkeyPressed = true;
        if (!this.isActive) {
          this.activate();
          // Prevent default browser behavior for the hotkey
          e.preventDefault();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      const hotkey = this.settings?.hotkey || 'Alt';
      if (this.isHotkeyReleased(e, hotkey)) {
        this.hotkeyPressed = false;
        if (this.isActive) {
          this.deactivate();
        }
      }
    });

    // Prevent default behavior when inspector is active
    document.addEventListener('keydown', (e) => {
      if (this.isActive && this.hotkeyPressed) {
        const hotkey = this.settings?.hotkey || 'Alt';
        // Prevent default browser behavior for hotkey
        if (this.isHotkeyPressed(e, hotkey)) {
          e.preventDefault();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          this.deactivate();
        }
      }
    });
  }

  private isHotkeyPressed(e: KeyboardEvent, hotkey: string): boolean {
    switch (hotkey) {
      case 'Alt':
        return e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
      case 'Ctrl':
        return e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;
      case 'Meta':
        return e.metaKey && !e.altKey && !e.ctrlKey && !e.shiftKey;
      case 'Shift':
        return e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
      default:
        return false;
    }
  }

  private isHotkeyReleased(e: KeyboardEvent, hotkey: string): boolean {
    switch (hotkey) {
      case 'Alt':
        return !e.altKey;
      case 'Ctrl':
        return !e.ctrlKey;
      case 'Meta':
        return !e.metaKey;
      case 'Shift':
        return !e.shiftKey;
      default:
        return false;
    }
  }

  private listenForSettingsChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' || areaName === 'local') {
        getSettings().then(settings => {
          this.settings = settings;
          if (this.highlightOverlay) {
            this.highlightOverlay.style.borderColor = settings.highlightColor;
          }
        });
      }
    });
  }

  private activate() {
    this.isActive = true;
    document.body.style.cursor = 'crosshair';
  }

  private deactivate() {
    this.isActive = false;
    this.hotkeyPressed = false;
    this.currentElement = null;
    document.body.style.cursor = '';
    this.hideTooltip();
    this.hideHighlight();
  }

  private toggleInspector() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
      this.hotkeyPressed = true;
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    
    if (!element || element === this.tooltip || element === this.highlightOverlay) {
      return;
    }

    this.currentElement = element;
    this.updateHighlight(element);
    this.updateTooltip(element, e);
  }

  private updateHighlight(element: HTMLElement) {
    if (!this.highlightOverlay) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    this.highlightOverlay.style.display = 'block';
    this.highlightOverlay.style.left = `${rect.left + scrollX}px`;
    this.highlightOverlay.style.top = `${rect.top + scrollY}px`;
    this.highlightOverlay.style.width = `${rect.width}px`;
    this.highlightOverlay.style.height = `${rect.height}px`;
  }

  private hideHighlight() {
    if (this.highlightOverlay) {
      this.highlightOverlay.style.display = 'none';
    }
  }

  private updateTooltip(element: HTMLElement, e: MouseEvent) {
    if (!this.tooltip) return;

    const info = this.getElementInfo(element);
    const displayFormat = this.settings?.displayFormat || 'class';

    let content = '';
    
    if (displayFormat === 'full') {
      content = `
        <div><strong>Tag:</strong> ${info.tag}</div>
        ${info.classes.length > 0 ? `<div><strong>Classes:</strong> ${info.classes.map(c => `.${c}`).join(' ')}</div>` : ''}
        ${info.id ? `<div><strong>ID:</strong> #${info.id}</div>` : ''}
        <div><strong>Selector:</strong> ${info.selector}</div>
        <div style="margin-top: 4px; font-size: 11px; opacity: 0.8;"><strong>Path:</strong> ${info.fullPath}</div>
      `;
    } else if (displayFormat === 'selector') {
      content = `<div><strong>Selector:</strong> ${info.selector}</div>`;
    } else {
      // Default: class
      if (info.classes.length > 0) {
        content = `<div><strong>Class:</strong> ${info.classes.map(c => `.${c}`).join(' ')}</div>`;
      } else if (info.id) {
        content = `<div><strong>ID:</strong> #${info.id}</div>`;
      } else {
        content = `<div><strong>Tag:</strong> ${info.tag}</div>`;
      }
    }

    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';

    // Position tooltip near cursor
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const tooltipX = e.clientX + 15;
    const tooltipY = e.clientY + 15;

    // Adjust if tooltip goes off screen
    const finalX = tooltipX + tooltipRect.width > window.innerWidth
      ? e.clientX - tooltipRect.width - 15
      : tooltipX;
    const finalY = tooltipY + tooltipRect.height > window.innerHeight
      ? e.clientY - tooltipRect.height - 15
      : tooltipY;

    this.tooltip.style.left = `${finalX}px`;
    this.tooltip.style.top = `${finalY}px`;
  }

  private hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private getElementInfo(element: HTMLElement): ElementInfo {
    const tag = element.tagName.toLowerCase();
    const classes = Array.from(element.classList);
    const id = element.id || null;

    // Generate selector
    let selector = tag;
    if (id) {
      selector = `#${id}`;
    } else if (classes.length > 0) {
      selector = `.${classes[0]}`;
    }

    // Generate full path
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break; // ID is unique, no need to go further
      } else if (current.className && typeof current.className === 'string') {
        const classes = Array.from(current.classList).filter(c => c.trim());
        if (classes.length > 0) {
          selector += `.${classes[0]}`;
        }
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        const index = siblings.indexOf(current);
        if (siblings.length > 1) {
          selector += `:nth-child(${index + 1})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return {
      tag,
      classes,
      id,
      selector,
      fullPath: path.join(' > '),
    };
  }

  private async copyElementHTML(element: HTMLElement) {
    if (!element) return;

    // Ensure we have the actual HTMLElement (not a text node or other node type)
    let targetElement: HTMLElement = element;
    
    // If it's not an HTMLElement, try to get the parent
    if (!(element instanceof HTMLElement)) {
      targetElement = element.parentElement || element as HTMLElement;
    }

    // Copy the entire HTML of the element, including all attributes, classes, and nested content
    const htmlToCopy = targetElement.outerHTML;

    // Debug: log what we're copying (first 500 chars)
    console.log('Copying element:', targetElement.tagName, targetElement.className);
    console.log('HTML length:', htmlToCopy.length);
    console.log('HTML preview:', htmlToCopy.substring(0, 500) + (htmlToCopy.length > 500 ? '...' : ''));

    try {
      await navigator.clipboard.writeText(htmlToCopy);
      this.showCopyFeedback();
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      this.fallbackCopy(htmlToCopy);
    }
  }

  private fallbackCopy(text: string) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showCopyFeedback();
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textarea);
  }

  private showCopyFeedback() {
    if (!this.tooltip) return;
    
    const originalContent = this.tooltip.innerHTML;
    this.tooltip.innerHTML = '<div style="color: #4ade80;">✓ HTML Copied!</div>';
    this.tooltip.style.display = 'block';
    
    setTimeout(() => {
      if (this.tooltip) {
        this.tooltip.innerHTML = originalContent;
      }
    }, 1000);
  }
}

// Initialize inspector
new SelectorInspector();

