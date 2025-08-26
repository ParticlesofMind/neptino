/**
 * BRUSH TOOL DIAGNOSTIC
 * 
 * This script specifically diagnoses the BrushTool to understand why it's not drawing.
 * Copy and paste this entire script into the browser console.
 */

console.log('🖍️ BRUSH TOOL DIAGNOSTIC');
console.log('========================');

function diagnoseBrushTool() {
  // Check if canvas API is available
  if (!window.canvasAPI) {
    console.error('❌ CanvasAPI not available');
    return false;
  }

  console.log('✅ CanvasAPI available');
  console.log('📊 Canvas ready:', window.canvasAPI.isReady());

  // Get components
  const drawingLayer = window.canvasAPI.getDrawingLayer();
  const app = window.canvasAPI.getApp();
  
  if (!drawingLayer || !app) {
    console.error('❌ Missing canvas components');
    return false;
  }

  console.log('✅ Drawing layer and app available');
  console.log('📏 Canvas dimensions:', app.screen.width, 'x', app.screen.height);

  // Activate brush tool
  const success = window.canvasAPI.setTool('brush');
  if (!success) {
    console.error('❌ Failed to activate brush tool');
    return false;
  }

  console.log('✅ Brush tool activated');
  
  // Get tool settings
  const settings = window.canvasAPI.getToolSettings();
  console.log('⚙️ Tool settings:', settings.brush);

  // Check drawing layer interactivity
  console.log('🎯 Drawing layer interactive properties:');
  console.log('  - eventMode:', drawingLayer.eventMode);
  console.log('  - interactiveChildren:', drawingLayer.interactiveChildren);
  console.log('  - children count:', drawingLayer.children.length);

  return true;
}

function testBrushDrawingProgrammatically() {
  console.log('\n🧪 Testing Brush Drawing Programmatically');
  console.log('==========================================');

  const drawingLayer = window.canvasAPI.getDrawingLayer();
  const app = window.canvasAPI.getApp();
  
  if (!drawingLayer || !app) {
    console.error('❌ Canvas components not ready');
    return;
  }

  // Get the BrushTool instance directly
  // We need to access the ToolManager to get the tool
  console.log('🔧 Attempting to access BrushTool directly...');
  
  // Create test coordinates
  const startPoint = { x: 100, y: 100 };
  const endPoint = { x: 200, y: 150 };
  
  console.log('📍 Test coordinates:', startPoint, '->', endPoint);
  
  // Record initial state
  const initialChildren = drawingLayer.children.length;
  console.log('📊 Initial drawing layer children:', initialChildren);
  
  // Try to trigger brush drawing by creating proper PixiJS events
  try {
    // Create a Graphics object manually as the BrushTool would
    console.log('🎨 Creating test brush stroke manually...');
    
    const testStroke = new PIXI.Graphics();
    testStroke.eventMode = 'static';
    testStroke.alpha = 0.8;
    
    // Draw a line like the BrushTool would
    testStroke.moveTo(startPoint.x, startPoint.y);
    testStroke.lineTo(endPoint.x, endPoint.y);
    testStroke.stroke({
      width: 20,
      color: 0xffff00, // Yellow
      cap: 'round',
      join: 'round'
    });
    
    // Add to drawing layer
    drawingLayer.addChild(testStroke);
    
    console.log('✅ Manual brush stroke added');
    console.log('📊 Drawing layer children after manual addition:', drawingLayer.children.length);
    
    return true;
    
  } catch (error) {
    console.error('❌ Manual brush stroke failed:', error);
    return false;
  }
}

function setupRealEventCapture() {
  console.log('\n👂 Setting up Real Event Capture');
  console.log('=================================');
  
  const canvas = app.canvas;
  if (!canvas) {
    console.error('❌ Canvas element not found');
    return;
  }
  
  let captureCount = 0;
  const maxCapture = 15;
  
  // Add temporary event listeners
  const pointerDownListener = (e) => {
    if (captureCount++ > maxCapture) return;
    
    console.log('🔥 REAL pointerdown:', {
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      buttons: e.buttons,
      tool: window.canvasAPI.getActiveTool(),
      timestamp: Date.now()
    });
    
    // Check if we can access the tool's state
    setTimeout(() => {
      const drawingLayer = window.canvasAPI.getDrawingLayer();
      console.log('📊 Children after pointerdown:', drawingLayer?.children.length || 0);
    }, 10);
  };
  
  const pointerMoveListener = (e) => {
    if (captureCount++ > maxCapture) return;
    if (e.buttons !== 1) return; // Only log when button is pressed
    
    console.log('🔥 REAL pointermove (dragging):', {
      clientX: e.clientX,
      clientY: e.clientY,
      buttons: e.buttons
    });
  };
  
  const pointerUpListener = (e) => {
    if (captureCount++ > maxCapture) return;
    
    console.log('🔥 REAL pointerup:', {
      clientX: e.clientX,
      clientY: e.clientY,
      button: e.button,
      buttons: e.buttons
    });
    
    // Check final result
    setTimeout(() => {
      const drawingLayer = window.canvasAPI.getDrawingLayer();
      console.log('📊 Final children after drawing:', drawingLayer?.children.length || 0);
      
      if (drawingLayer) {
        drawingLayer.children.forEach((child, i) => {
          console.log(`  ${i}: ${child.constructor.name} at (${Math.round(child.x)}, ${Math.round(child.y)}) alpha:${child.alpha}`);
        });
      }
    }, 100);
  };
  
  canvas.addEventListener('pointerdown', pointerDownListener);
  canvas.addEventListener('pointermove', pointerMoveListener);
  canvas.addEventListener('pointerup', pointerUpListener);
  
  console.log('✅ Real event listeners attached');
  console.log('🖍️ Now try drawing on the canvas with the brush tool!');
  console.log('⏰ Listeners will auto-remove after', maxCapture, 'events');
  
  // Auto-cleanup
  setTimeout(() => {
    canvas.removeEventListener('pointerdown', pointerDownListener);
    canvas.removeEventListener('pointermove', pointerMoveListener);
    canvas.removeEventListener('pointerup', pointerUpListener);
    console.log('🧹 Event listeners removed');
  }, 30000); // 30 seconds
}

function runBrushDiagnostic() {
  console.log('🚀 Starting Brush Tool Diagnostic...\n');
  
  if (!diagnoseBrushTool()) {
    console.log('❌ Basic diagnostic failed');
    return;
  }
  
  // Test manual brush stroke creation
  const manualSuccess = testBrushDrawingProgrammatically();
  
  if (manualSuccess) {
    console.log('✅ Manual brush stroke creation works!');
    console.log('🔍 This means the issue is with event handling, not graphics creation');
  } else {
    console.log('❌ Manual brush stroke creation failed');
    console.log('🔍 The issue might be with graphics/PIXI setup');
  }
  
  // Set up real event capture
  setupRealEventCapture();
  
  console.log('\n📋 DIAGNOSTIC SUMMARY:');
  console.log('- Canvas API: ✅');
  console.log('- Drawing Layer: ✅');
  console.log('- Brush Tool Activation: ✅');
  console.log('- Manual Graphics Creation:', manualSuccess ? '✅' : '❌');
  console.log('- Real Event Listeners: ✅ (attached)');
  console.log('\n🖍️ Now draw on the canvas to test event flow!');
}

// Run the diagnostic
runBrushDiagnostic();

// Make available globally
window.runBrushDiagnostic = runBrushDiagnostic;
console.log('\n💡 You can run window.runBrushDiagnostic() to rerun the diagnostic');
