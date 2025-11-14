import { canvasEngine } from "./canvasInit";

const ZOOM_FACTOR = 1.2;

const formatZoomLabel = (scale: number): string => {
  if (!Number.isFinite(scale) || scale <= 0) {
    return "100%";
  }

  const percentage = scale * 100;
  const rounded = percentage >= 10 ? Math.round(percentage) : Math.round(percentage * 10) / 10;
  return `${rounded}%`;
};

const initializePerspectiveControls = (): void => {
  const perspective = document.querySelector<HTMLElement>(".engine__perspective");
  if (!perspective) {
    return;
  }

  const zoomIndicator = perspective.querySelector<HTMLElement>(".engine__perspective-zoom");
  const zoomInButton = perspective.querySelector<HTMLButtonElement>('[data-perspective="zoom-in"]');
  const zoomOutButton = perspective.querySelector<HTMLButtonElement>('[data-perspective="zoom-out"]');
  const resetButton = perspective.querySelector<HTMLButtonElement>('[data-perspective="reset"]');
  const grabButton = perspective.querySelector<HTMLButtonElement>('[data-perspective="grab"]');

  const setGrabActive = (active: boolean): void => {
    if (!grabButton) return;
    grabButton.classList.toggle("button--active", active);
    grabButton.setAttribute("aria-pressed", String(active));
  };

  const updateZoomDisplay = (scale: number): void => {
    if (!zoomIndicator) return;
    zoomIndicator.textContent = formatZoomLabel(scale);
  };

  const bindEvents = (): void => {
    const unsubscribeZoom = canvasEngine.onZoomChange(updateZoomDisplay);

    zoomInButton?.addEventListener("click", (event) => {
      event.preventDefault();
      canvasEngine.zoomByFactor(ZOOM_FACTOR);
    });

    zoomOutButton?.addEventListener("click", (event) => {
      event.preventDefault();
      canvasEngine.zoomByFactor(1 / ZOOM_FACTOR);
    });

    resetButton?.addEventListener("click", (event) => {
      event.preventDefault();
      canvasEngine.disableGrabMode();
      setGrabActive(false);
      canvasEngine.resetZoom();
    });

    grabButton?.addEventListener("click", (event) => {
      event.preventDefault();
      const nextState = !canvasEngine.isGrabModeActive();
      if (nextState) {
        canvasEngine.enableGrabMode();
      } else {
        canvasEngine.disableGrabMode();
      }
      setGrabActive(nextState);
    });

    window.addEventListener(
      "beforeunload",
      () => {
        unsubscribeZoom();
        grabButton?.classList.remove("button--active");
      },
      { once: true },
    );

    updateZoomDisplay(canvasEngine.getCurrentZoom());
    setGrabActive(canvasEngine.isGrabModeActive());
  };

  canvasEngine.onReady(bindEvents);
};

const bootstrapPerspectiveControls = (): void => {
  if (typeof document === "undefined") {
    return;
  }

  const start = (): void => {
    initializePerspectiveControls();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
};

bootstrapPerspectiveControls();
