function clearTestObjects() {
  if (!window.canvasAPI) {
    return false;
  }

  const drawingLayer = window.canvasAPI.getDrawingLayer();
  if (!drawingLayer) {
    return false;
  }

  const initialCount = drawingLayer.children.length;

  if (initialCount === 0) {
    return true;
  }

  // Clear all user drawings
  window.canvasAPI.clearDrawings();

  const finalCount = drawingLayer.children.length;

  if (finalCount === 0) {
    return true;
  } else {
    return true;
  }
}

// Run the cleanup
clearTestObjects();

// Make available globally
window.clearTestObjects = clearTestObjects;
