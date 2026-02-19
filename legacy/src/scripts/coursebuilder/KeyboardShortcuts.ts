const TOOL_SHORTCUTS: Record<string, string> = {
  v: "selection",
  p: "pen",
  b: "brush",
  t: "text",
  s: "shapes",
  c: "tables",
  g: "generate",
  e: "eraser",
};

const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA"]);

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (IGNORED_TAGS.has(target.tagName)) {
    return true;
  }
  return target.isContentEditable;
};

const activateTool = (toolId: string): void => {
  const button = document.querySelector<HTMLButtonElement>(`[data-engine-tools-selection] [data-tool="${toolId}"]`);
  if (button) {
    button.click();
    return;
  }

  window.dispatchEvent(
    new CustomEvent("engine:tool-change", {
      detail: {
        toolId,
      },
    }),
  );
};

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  if (isTypingTarget(event.target)) {
    return;
  }
  const key = event.key.toLowerCase();
  const toolId = TOOL_SHORTCUTS[key];
  if (!toolId) {
    return;
  }
  event.preventDefault();
  activateTool(toolId);
};

const registerShortcuts = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  document.addEventListener("keydown", handleKeyDown);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", registerShortcuts, { once: true });
} else {
  registerShortcuts();
}

export {};
