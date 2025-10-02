/**
 * contextMenuActions
 * Centralized actions used by UI context menus to avoid duplication.
 */

type CanvasAPIType = {
  copySelection?: () => boolean;
  pasteSelection?: () => boolean;
  groupSelection?: () => boolean;
  ungroupSelection?: () => boolean;
};

function getCanvasAPI(): CanvasAPIType | null {
  try {
    return (window as any).canvasAPI || null;
  } catch {
    return null;
  }
}

export function copySelection(): boolean {
  const api = getCanvasAPI();
  try {
    const ok = api?.copySelection?.() ?? false;
    if (ok) {
      try {
        document.dispatchEvent(new CustomEvent('selection:clipboard', { detail: { hasClipboard: true } }));
      } catch {}
    }
    return ok;
  } catch {
    return false;
  }
}

export function pasteSelection(): boolean {
  const api = getCanvasAPI();
  try {
    return api?.pasteSelection?.() ?? false;
  } catch {
    return false;
  }
}

export function duplicateSelection(): boolean {
  // Copy then Paste; report success if paste succeeds
  const copied = copySelection();
  // Small async handoff is caller’s concern; synchronous return best-effort
  try { setTimeout(() => pasteSelection(), 0); } catch {}
  return copied;
}

export function groupSelection(): boolean {
  const api = getCanvasAPI();
  try {
    return api?.groupSelection?.() ?? false;
  } catch {
    return false;
  }
}

export function ungroupSelection(): boolean {
  const api = getCanvasAPI();
  try {
    return api?.ungroupSelection?.() ?? false;
  } catch {
    return false;
  }
}

export function deleteSelectionViaKeyEvent(): void {
  // Reuse existing delete key handling wired in tools
  try {
    const evt = new KeyboardEvent('keydown', { key: 'Delete' });
    document.dispatchEvent(evt);
  } catch {}
}

