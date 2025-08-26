/**
 * SIMPLE DRAWING TEST
 * Copy and paste this into the browser console to test the tools
 */

function testDrawingTools() {
  console.log('🧪 TESTING DRAWING TOOLS');
  console.log('========================');
  
  if (!window.canvasAPI) {
    console.error('❌ CanvasAPI not available');
    return;
  }
  
  // Test 1: Check if canvas is ready
  console.log('📋 Canvas ready:', window.canvasAPI.isReady());
  
  // Test 2: Test direct drawing with the display manager
  console.log('📝 Testing direct drawing...');
  const result = window.canvasAPI.testDrawing();
  console.log('✅ Direct drawing test result:', result);
  
  // Test 3: Get drawing layer info
  const drawingLayer = window.canvasAPI.getDrawingLayer();
  if (drawingLayer) {
    console.log('📊 Drawing layer children BEFORE:', drawingLayer.children.length);
    drawingLayer.children.forEach((child, i) => {
      console.log(`  ${i}: ${child.constructor.name} at (${Math.round(child.x)}, ${Math.round(child.y)})`);
    });
  }
  
  // Test 4: Activate brush tool
  console.log('🖍️ Activating brush tool...');
  const brushActivated = window.canvasAPI.setTool('brush');
  console.log('🖍️ Brush activated:', brushActivated);
  
  // Test 5: Show brush settings
  const toolSettings = window.canvasAPI.getToolSettings();
  console.log('⚙️ Tool settings:', toolSettings);
  
  // Test 6: Instructions for manual testing
  console.log('\n📖 MANUAL TEST INSTRUCTIONS:');
  console.log('1. Make sure brush tool is active (yellow cursor)');
  console.log('2. Click and drag on the canvas to draw a line');
  console.log('3. Run this function again to see if new objects were created');
  console.log('\n💡 If drawing works, you should see Graphics objects added to the layer');
  
  return {
    canvasReady: window.canvasAPI.isReady(),
    brushActivated,
    drawingLayerChildren: drawingLayer?.children.length || 0,
    toolSettings
  };
}

// Make it available globally
window.testDrawingTools = testDrawingTools;

console.log('💡 Run window.testDrawingTools() to test drawing tools');
console.log('💡 After drawing manually, run it again to see results');
