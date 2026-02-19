import { canvasEngine } from "./CanvasEngine";

const initializeCanvas = (): void => {
  void canvasEngine.init();
};

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCanvas, { once: true });
  } else {
    initializeCanvas();
  }
}

export { canvasEngine };
