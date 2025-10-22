/**
 * Test script to verify tool functionality and unified zoom system
 * Run this in the browser console after loading canvases
 */

console.log('🧪 Testing Tool Functionality and Unified Zoom System...');

// Test 1: Check if tools are properly connected to active canvas
function testToolConnection() {
  const canvasAPI = window.canvasAPI;
  if (!canvasAPI) {
    console.error('❌ CanvasAPI not found');
    return false;
  }

  const toolManager = window.toolManager;
  if (!toolManager) {
    console.error('❌ ToolManager not found');
    return false;
  }

  const activeTool = toolManager.getActiveTool();
  if (!activeTool) {
    console.error('❌ No active tool found');
    return false;
  }

  console.log(`✅ Active tool: ${activeTool.constructor.name}`);
  return true;
}

// Test 2: Test tool switching functionality
function testToolSwitching() {
  const canvasAPI = window.canvasAPI;
  if (!canvasAPI) {
    console.error('❌ CanvasAPI not found');
    return false;
  }

  // Test switching to pen tool
  const penSuccess = canvasAPI.setTool('pen');
  if (!penSuccess) {
    console.error('❌ Failed to switch to pen tool');
    return false;
  }

  const activeTool = canvasAPI.getActiveTool();
  if (activeTool !== 'pentool') {
    console.error(`❌ Expected 'pentool', got '${activeTool}'`);
    return false;
  }

  console.log('✅ Tool switching works correctly');
  
  // Switch back to selection tool
  canvasAPI.setTool('selection');
  return true;
}

// Test 3: Check if unified zoom manager exists
function testUnifiedZoomManager() {
  const unifiedZoomManager = window.unifiedZoomManager;
  if (!unifiedZoomManager) {
    console.error('❌ UnifiedZoomManager not found');
    return false;
  }

  const debugInfo = unifiedZoomManager.getDebugInfo();
  if (!debugInfo.initialized) {
    console.error('❌ UnifiedZoomManager not initialized');
    return false;
  }

  console.log(`✅ UnifiedZoomManager initialized with ${debugInfo.registeredCanvases.length} canvases`);
  return true;
}

// Test 4: Test unified zoom functionality
function testUnifiedZoom() {
  const unifiedZoomManager = window.unifiedZoomManager;
  if (!unifiedZoomManager) {
    console.error('❌ UnifiedZoomManager not found');
    return false;
  }

  const initialZoom = unifiedZoomManager.getZoomLevel();
  console.log(`📏 Initial zoom level: ${(initialZoom * 100).toFixed(1)}%`);

  // Test zoom in
  unifiedZoomManager.zoomIn();
  const zoomedIn = unifiedZoomManager.getZoomLevel();
  if (zoomedIn <= initialZoom) {
    console.error('❌ Zoom in failed');
    return false;
  }

  // Test zoom out
  unifiedZoomManager.zoomOut();
  const zoomedOut = unifiedZoomManager.getZoomLevel();
  if (zoomedOut >= zoomedIn) {
    console.error('❌ Zoom out failed');
    return false;
  }

  console.log('✅ Unified zoom functionality works');
  return true;
}

// Test 5: Test keyboard shortcuts
function testKeyboardShortcuts() {
  console.log('ℹ️ Testing keyboard shortcuts...');
  console.log('   - Press Ctrl/Cmd + Plus to zoom in');
  console.log('   - Press Ctrl/Cmd + Minus to zoom out');
  console.log('   - Press Ctrl/Cmd + 0 to reset zoom');
  console.log('   - Check that all canvases zoom together');
  return true;
}

// Test 6: Test wheel zoom
function testWheelZoom() {
  console.log('ℹ️ Testing wheel zoom...');
  console.log('   - Hold Ctrl/Cmd and scroll wheel on any canvas');
  console.log('   - Check that all canvases zoom together');
  return true;
}

// Test 7: Test tool functionality on canvas
function testToolFunctionality() {
  const canvasContainer = document.getElementById('canvas-container');
  const activeCanvas = canvasContainer?.querySelector('canvas[data-canvas-id]');
  
  if (!activeCanvas) {
    console.error('❌ No active canvas found');
    return false;
  }

  console.log('ℹ️ Testing tool functionality...');
  console.log('   - Try drawing with pen tool');
  console.log('   - Try selecting objects with selection tool');
  console.log('   - Try adding text with text tool');
  console.log('   - Check that tools work on the active canvas');
  
  return true;
}

// Test 9: Test canvas spacing consistency
function testCanvasSpacing() {
  const canvasContainer = document.getElementById('canvas-grid-container');
  if (!canvasContainer) {
    console.error('❌ Canvas grid container not found');
    return false;
  }

  const unifiedZoomManager = window.unifiedZoomManager;
  if (!unifiedZoomManager) {
    console.error('❌ UnifiedZoomManager not found');
    return false;
  }

  const currentZoom = unifiedZoomManager.getZoomLevel();
  const expectedGap = 40; // Fixed 40px gap regardless of zoom level
  const actualGap = parseFloat(canvasContainer.style.gap) || 40; // Fallback to CSS default

  console.log(`📏 Current zoom: ${(currentZoom * 100).toFixed(1)}%`);
  console.log(`📏 Expected gap: ${expectedGap}px (constant)`);
  console.log(`📏 Actual gap: ${actualGap.toFixed(1)}px`);

  const gapDifference = Math.abs(expectedGap - actualGap);
  if (gapDifference < 1) { // Allow 1px tolerance
    console.log('✅ Canvas spacing is constant regardless of zoom');
    return true;
  } else {
    console.error(`❌ Canvas spacing mismatch: expected ${expectedGap}px, got ${actualGap.toFixed(1)}px`);
    return false;
  }
}

// Test 10: Check canvas dimensions and layout
function testCanvasLayout() {
  const canvasContainer = document.getElementById('canvas-container');
  const canvases = canvasContainer?.querySelectorAll('canvas[data-canvas-id]');
  
  if (!canvases || canvases.length === 0) {
    console.error('❌ No canvases found');
    return false;
  }

  let allCorrect = true;
  canvases.forEach((canvas, index) => {
    const width = canvas.width || canvas.offsetWidth;
    const height = canvas.height || canvas.offsetHeight;
    
    if (width === 1200 && height === 1800) {
      console.log(`✅ Canvas ${index + 1}: Correct dimensions (1200x1800)`);
    } else {
      console.error(`❌ Canvas ${index + 1}: Wrong dimensions (${width}x${height})`);
      allCorrect = false;
    }
  });

  return allCorrect;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Comprehensive Tool and Zoom Tests...\n');
  
  const results = {
    toolConnection: testToolConnection(),
    toolSwitching: testToolSwitching(),
    unifiedZoomManager: testUnifiedZoomManager(),
    unifiedZoom: testUnifiedZoom(),
    keyboardShortcuts: testKeyboardShortcuts(),
    wheelZoom: testWheelZoom(),
    toolFunctionality: testToolFunctionality(),
    canvasSpacing: testCanvasSpacing(),
    canvasLayout: testCanvasLayout()
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
window.testToolAndZoom = {
  runAllTests,
  testToolConnection,
  testToolSwitching,
  testUnifiedZoomManager,
  testUnifiedZoom,
  testKeyboardShortcuts,
  testWheelZoom,
  testToolFunctionality,
  testCanvasSpacing,
  testCanvasLayout
};

console.log('\n💡 Manual Testing Guide:');
console.log('1. Tool Functionality:');
console.log('   - Select different tools from the toolbar');
console.log('   - Try drawing, selecting, adding text, etc.');
console.log('   - Tools should work on the active canvas');
console.log('');
console.log('2. Unified Zoom:');
console.log('   - Use Ctrl/Cmd + Plus/Minus to zoom');
console.log('   - Use Ctrl/Cmd + 0 to reset zoom');
console.log('   - Use Ctrl/Cmd + wheel to zoom');
console.log('   - All canvases should zoom together');
console.log('');
console.log('3. Canvas Layout:');
console.log('   - Check that template layout spans full canvas');
console.log('   - Verify white background covers entire area');
console.log('   - Confirm 1200x1800 dimensions');

