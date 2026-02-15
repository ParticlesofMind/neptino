"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * React hook replacing src/scripts/navigation/CanvasScrollNav.ts
 * Manages canvas scroll navigation state with React instead of direct DOM manipulation.
 * Exposes a window.canvasScrollNav shim for backward compatibility with CurriculumPageBridge.
 */
export function useCanvasScrollNav(initialTotal = 225) {
  const [currentCanvas, setCurrentCanvas] = useState(1);
  const [totalCanvases, setTotalCanvases] = useState(initialTotal);
  const onNavigateRef = useRef<((canvasIndex: number) => void) | null>(null);

  const navigateToCanvas = useCallback(
    (canvasNumber: number) => {
      const clamped = Math.max(1, Math.min(canvasNumber, totalCanvases));
      setCurrentCanvas(clamped);

      if (onNavigateRef.current) {
        onNavigateRef.current(clamped - 1);
      }

      window.dispatchEvent(
        new CustomEvent("canvas-navigate", {
          detail: { canvasIndex: clamped - 1, canvasNumber: clamped },
        }),
      );
    },
    [totalCanvases],
  );

  const goToFirst = useCallback(() => navigateToCanvas(1), [navigateToCanvas]);

  const goToPrevious = useCallback(
    () => navigateToCanvas(currentCanvas - 1),
    [currentCanvas, navigateToCanvas],
  );

  const goToNext = useCallback(
    () => navigateToCanvas(currentCanvas + 1),
    [currentCanvas, navigateToCanvas],
  );

  const goToLast = useCallback(
    () => navigateToCanvas(totalCanvases),
    [totalCanvases, navigateToCanvas],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      if (isNaN(value) || value < 1 || value > totalCanvases) {
        e.target.value = currentCanvas.toString();
        return;
      }
      navigateToCanvas(value);
    },
    [currentCanvas, totalCanvases, navigateToCanvas],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToNext();
      }
    },
    [goToPrevious, goToNext],
  );

  const setOnNavigate = useCallback(
    (callback: (canvasIndex: number) => void) => {
      onNavigateRef.current = callback;
    },
    [],
  );

  const safeSetCurrentCanvas = useCallback(
    (n: number) => setCurrentCanvas(Math.max(1, Math.min(n, totalCanvases))),
    [totalCanvases],
  );

  // Expose window.canvasScrollNav shim for backward compatibility
  // CurriculumPageBridge accesses this to call setCurrentCanvas / setTotalCanvases
  useEffect(() => {
    const shim = {
      setCurrentCanvas: (n: number) => safeSetCurrentCanvas(n),
      setTotalCanvases: (n: number) => setTotalCanvases(n),
      getCurrentCanvas: () => currentCanvas,
      getTotalCanvases: () => totalCanvases,
      setOnNavigate: (cb: (i: number) => void) => setOnNavigate(cb),
    };
    (window as any).canvasScrollNav = shim;
    window.dispatchEvent(
      new CustomEvent("canvas-scroll-nav-ready", { detail: { instance: shim } }),
    );

    return () => {
      if ((window as any).canvasScrollNav === shim) {
        delete (window as any).canvasScrollNav;
      }
    };
  }, [currentCanvas, totalCanvases, safeSetCurrentCanvas, setOnNavigate]);

  return {
    currentCanvas,
    totalCanvases,
    setCurrentCanvas: safeSetCurrentCanvas,
    setTotalCanvases,
    goToFirst,
    goToPrevious,
    goToNext,
    goToLast,
    navigateToCanvas,
    handleInputChange,
    handleInputKeyDown,
    setOnNavigate,
  };
}
