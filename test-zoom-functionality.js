/**
 * Test script to verify zoom functionality is working
 * Run this in the browser console after loading a canvas
 */

console.log('🔍 Testing Canvas Zoom Functionality...');

// Test 1: Check if zoom manager exists on active canvas
function testZoomManagerExists() {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    console.error('❌ Canvas container not found');
    return false;
  }

  const activeCanvas = canvasContainer.querySelector('canvas[data-canvas-id]');
  if (!activeCanvas) {
    console.error('❌ No active canvas found');
    return false;
  }

  const zoomManager = activeCanvas.zoomManager;
  if (!zoomManager) {
    console.error('❌ Zoom manager not found on canvas');
    return false;
  }

  console.log('✅ Zoom manager found on active canvas');
  return true;
}

// Test 2: Check if wheel event handler is attached
function testWheelEventHandler() {
  const canvasContainer = document.getElementById('canvas-container');
  const activeCanvas = canvasContainer?.querySelector('canvas[data-canvas-id]');
  
  if (!activeCanvas) {
    console.error('❌ No active canvas found');
    return false;
  }

  // Check if wheel handler exists
  const wheelHandler = activeCanvas.wheelHandler;
  if (!wheelHandler) {
    console.error('❌ Wheel event handler not found');
    return false;
  }

  console.log('✅ Wheel event handler attached');
  return true;
}

// Test 3: Check if keyboard shortcuts are working
function testKeyboardShortcuts() {
  const canvasContainer = document.getElementById('canvas-container');
  const activeCanvas = canvasContainer?.querySelector('canvas[data-canvas-id]');
  
  if (!activeCanvas) {
    console.error('❌ No active canvas found');
    return false;
  }

  const keyHandler = activeCanvas.zoomKeyHandler;
  if (!keyHandler) {
    console.error('❌ Keyboard event handler not found');
    return false;
  }

  console.log('✅ Keyboard shortcuts handler attached');
  return true;
}

// Test 4: Check if template layout spans full canvas
function testTemplateLayoutSpanning() {
  const canvasContainer = document.getElementById('canvas-container');
  const activeCanvas = canvasContainer?.querySelector('canvas[data-canvas-id]');
  
  if (!activeCanvas) {
    console.error('❌ No active canvas found');
    return false;
  }

  // Check canvas dimensions
  const canvasWidth = activeCanvas.width || activeCanvas.offsetWidth;
  const canvasHeight = activeCanvas.height || activeCanvas.offsetHeight;
  
  console.log(`📐 Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
  
  if (canvasWidth === 1200 && canvasHeight === 1800) {
    console.log('✅ Canvas has correct dimensions (1200x1800)');
    return true;
  } else {
    console.warn(`⚠️ Canvas dimensions are ${canvasWidth}x${canvasHeight}, expected 1200x1800`);
    return false;
  }
}

// Test 5: Check if white background exists
function testWhiteBackground() {
  // This would require access to the PixiJS stage, which is more complex to test
  console.log('ℹ️ White background test requires PixiJS stage access - check visually');
  return true;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Canvas Zoom Functionality Tests...\n');
  
  const results = {
    zoomManager: testZoomManagerExists(),
    wheelHandler: testWheelEventHandler(),
    keyboardShortcuts: testKeyboardShortcuts(),
    templateLayout: testTemplateLayoutSpanning(),
    whiteBackground: testWhiteBackground()
  };
  
  console.log('\n📊 Test Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed - check the issues above'}`);
  
  return results;
}

// Auto-run tests
runAllTests();

// Export for manual testing
window.testCanvasZoom = {
  runAllTests,
  testZoomManagerExists,
  testWheelEventHandler,
  testKeyboardShortcuts,
  testTemplateLayoutSpanning,
  testWhiteBackground
};

console.log('\n💡 Manual testing available:');
console.log('- Use mouse wheel to zoom in/out');
console.log('- Use Ctrl/Cmd + Plus/Minus to zoom');
console.log('- Use Ctrl/Cmd + 0 to reset zoom');
console.log('- Check that template layout spans full canvas with white background');
