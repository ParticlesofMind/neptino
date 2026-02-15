"use client";

import { useCallback, useState } from "react";

type PanelView = "layers" | "navigation";

/**
 * React hook replacing src/scripts/coursebuilder/PanelToggle.ts
 * Manages active panel state (Layers vs Navigation) with React state
 * instead of DOM classList manipulation.
 */
export function usePanelToggle(initialView: PanelView = "layers") {
  const [activePanel, setActivePanel] = useState<PanelView>(initialView);

  const switchPanel = useCallback((view: PanelView) => {
    setActivePanel(view);
  }, []);

  const getPanelButtonProps = useCallback(
    (view: PanelView) => {
      const isActive = activePanel === view;
      return {
        "aria-pressed": isActive,
        className: `flex-1 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
          isActive
            ? "text-white bg-primary-400"
            : "text-neutral-700 bg-white hover:bg-neutral-50"
        }`,
        onClick: () => switchPanel(view),
        type: "button" as const,
      };
    },
    [activePanel, switchPanel],
  );

  const isPanelVisible = useCallback(
    (view: PanelView) => activePanel === view,
    [activePanel],
  );

  return { activePanel, switchPanel, getPanelButtonProps, isPanelVisible };
}
