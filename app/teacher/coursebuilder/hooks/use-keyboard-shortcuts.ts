"use client";

import { useEffect } from "react";

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

/**
 * React hook replacing src/scripts/coursebuilder/KeyboardShortcuts.ts
 * Registers keyboard shortcuts for canvas tool switching.
 * Only active when `enabled` is true (i.e., when the Create tab is active).
 */
export function useKeyboardShortcuts(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        if (IGNORED_TAGS.has(target.tagName) || target.isContentEditable) {
          return;
        }
      }

      const key = event.key.toLowerCase();
      const toolId = TOOL_SHORTCUTS[key];
      if (!toolId) return;

      event.preventDefault();

      // Try clicking the tool button directly
      const button = document.querySelector<HTMLButtonElement>(
        `[data-engine-tools-selection] [data-tool="${toolId}"]`,
      );
      if (button) {
        button.click();
        return;
      }

      // Fallback: dispatch custom event for the engine
      window.dispatchEvent(
        new CustomEvent("engine:tool-change", { detail: { toolId } }),
      );
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
