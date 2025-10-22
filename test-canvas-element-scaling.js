/**
 * Test Canvas Element Scaling
 * 
 * Verifies that the HTML canvas element itself scales with zoom,
 * not just the PixiJS content inside it.
 */

function testCanvasElementScaling() {
  console.log('🧪 Testing Canvas Element Scaling...');
  
  // Find all canvas elements
  const canvasElements = document.querySelectorAll('canvas');
  console.log(`📊 Found ${canvasElements.length} canvas elements`);
  
  if (canvasElements.length === 0) {
    console.log('❌ No canvas elements found');
    return false;
  }
  
  // Get the unified zoom manager
  const unifiedZoomManager = window.unifiedZoomManager;
  if (!unifiedZoomManager) {
    console.log('❌ UnifiedZoomManager not found');
    return false;
  }
  
  const currentZoom = unifiedZoomManager.getZoomLevel();
  console.log(`🔍 Current unified zoom: ${(currentZoom * 100).toFixed(1)}%`);
  
  // Test each canvas element
  let allPassed = true;
  canvasElements.forEach((canvas, index) => {
    const computedStyle = window.getComputedStyle(canvas);
    const actualWidth = parseFloat(computedStyle.width);
    const actualHeight = parseFloat(computedStyle.height);
    
    // Expected dimensions based on zoom
    const expectedWidth = 1200 * currentZoom;
    const expectedHeight = 1800 * currentZoom;
    
    const widthMatch = Math.abs(actualWidth - expectedWidth) < 1;
    const heightMatch = Math.abs(actualHeight - expectedHeight) < 1;
    
    console.log(`📐 Canvas ${index + 1}:`);
    console.log(`   Actual: ${actualWidth.toFixed(1)}x${actualHeight.toFixed(1)}`);
    console.log(`   Expected: ${expectedWidth.toFixed(1)}x${expectedHeight.toFixed(1)}`);
    console.log(`   Width match: ${widthMatch ? '✅' : '❌'}`);
    console.log(`   Height match: ${heightMatch ? '✅' : '❌'}`);
    
    if (!widthMatch || !heightMatch) {
      allPassed = false;
    }
  });
  
  if (allPassed) {
    console.log('✅ All canvas elements scale correctly with zoom');
  } else {
    console.log('❌ Some canvas elements do not scale correctly');
  }
  
  return allPassed;
}

function testZoomLevels() {
  console.log('🧪 Testing Canvas Scaling at Different Zoom Levels...');
  
  const unifiedZoomManager = window.unifiedZoomManager;
  if (!unifiedZoomManager) {
    console.log('❌ UnifiedZoomManager not found');
    return false;
  }
  
  const testZoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5];
  let allPassed = true;
  
  testZoomLevels.forEach(zoom => {
    console.log(`\n🔍 Testing zoom level: ${(zoom * 100).toFixed(1)}%`);
    
    // Set zoom level
    unifiedZoomManager.setZoom(zoom);
    
    // Wait a bit for the zoom to apply
    setTimeout(() => {
      const canvasElements = document.querySelectorAll('canvas');
      let levelPassed = true;
      
      canvasElements.forEach((canvas, index) => {
        const computedStyle = window.getComputedStyle(canvas);
        const actualWidth = parseFloat(computedStyle.width);
        const actualHeight = parseFloat(computedStyle.height);
        
        const expectedWidth = 1200 * zoom;
        const expectedHeight = 1800 * zoom;
        
        const widthMatch = Math.abs(actualWidth - expectedWidth) < 1;
        const heightMatch = Math.abs(actualHeight - expectedHeight) < 1;
        
        if (!widthMatch || !heightMatch) {
          levelPassed = false;
          console.log(`❌ Canvas ${index + 1} at ${(zoom * 100).toFixed(1)}%: Expected ${expectedWidth.toFixed(1)}x${expectedHeight.toFixed(1)}, got ${actualWidth.toFixed(1)}x${actualHeight.toFixed(1)}`);
        }
      });
      
      if (levelPassed) {
        console.log(`✅ All canvases scale correctly at ${(zoom * 100).toFixed(1)}%`);
      } else {
        allPassed = false;
      }
      
      // Reset to 100% after testing
      if (zoom === testZoomLevels[testZoomLevels.length - 1]) {
        unifiedZoomManager.setZoom(1.0);
        console.log('\n🎯 Canvas element scaling test completed');
        console.log(`Overall result: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
      }
    }, 100);
  });
  
  return allPassed;
}

// Export for manual testing
window.testCanvasElementScaling = testCanvasElementScaling;
window.testZoomLevels = testZoomLevels;

console.log('🧪 Canvas Element Scaling Test loaded');
console.log('Run testCanvasElementScaling() to test current state');
console.log('Run testZoomLevels() to test multiple zoom levels');
