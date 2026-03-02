// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Settings {
  hotkey: 'Alt' | 'Ctrl' | 'Meta' | 'Shift';
  highlightColor: string;
  displayFormat: 'class' | 'selector' | 'full';
  copyFormat: 'class' | 'selector' | 'full';
}

export const DEFAULT_SETTINGS: Settings = {
  hotkey: 'Alt',
  highlightColor: '#3b82f6',
  displayFormat: 'class',
  copyFormat: 'class',
};

export function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve(items as Settings);
    });
  });
}

export interface ElementInfo {
  tag: string;
  classes: string[];
  id: string | null;
  selector: string;
  fullPath: string;
}

// ─── DOM helpers ───────────────────────────────────────────────────────────────

export function getElementInfo(element: HTMLElement): ElementInfo {
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
    let seg = current.tagName.toLowerCase();

    if (current.id) {
      seg += `#${current.id}`;
      path.unshift(seg);
      break; // ID is unique, no need to go further
    } else if (current.className && typeof current.className === 'string') {
      const cls = Array.from(current.classList).filter(c => c.trim());
      if (cls.length > 0) {
        seg += `.${cls[0]}`;
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current);
      if (siblings.length > 1) {
        seg += `:nth-child(${index + 1})`;
      }
    }

    path.unshift(seg);
    current = current.parentElement;
  }

  return { tag, classes, id, selector, fullPath: path.join(' > ') };
}
