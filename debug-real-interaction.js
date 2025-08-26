/**
 * DEBUG REAL INTERACTION TEST
 * 
 * This script tests tools with real DOM events instead of synthetic PointerEvent objects.
 * PixiJS might not properly handle synthetic events, so let's try with actual DOM manipulation.
 */

console.log('🔍 DEBUGGING REAL INTERACTION');
console.log('=============================');

function debugCanvasSetup() {
  console.log('\n📋 Canvas Setup Debugging...');
  
  if (!window.canvasAPI) {
    console.error('❌ CanvasAPI not available');
    return false;
  }
  
  const info = window.canvasAPI.getCanvasInfo();
  console.log('📊 Canvas Info:', info);
  
  // Check if the drawing layer is properly interactive
  const drawingLayer = window.canvasAPI.getDrawingLayer();
  if (drawingLayer) {
    console.log('🎯 Drawing Layer Info:');
    console.log('  - eventMode:', drawingLayer.eventMode);
    console.log('  - interactiveChildren:', drawingLayer.interactiveChildren);
    console.log('  - children count:', drawingLayer.children.length);
    console.log('  - bounds:', drawingLayer.getBounds());
  }
  
  return true;
}

function testCanvasDirectlyWithMouse() {
  console.log('\n🖱️ Testing Canvas with Manual Mouse Instruction...');
  
  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) {
    console.error('❌ Canvas element not found');
    return;
  }
  
  console.log('✅ Canvas element found');
  console.log('📏 Canvas dimensions:', canvas.width, 'x', canvas.height);
  console.log('📍 Canvas position:', canvas.getBoundingClientRect());
  
  // Set up temporary event listeners to capture real events
  let eventCount = 0;
  const maxEvents = 20;
  
  const pointerDownHandler = (e) => {
    if (eventCount++ > maxEvents) return;
    console.log('🔥 REAL pointer DOWN captured:', {
      clientX: e.clientX,
      clientY: e.clientY,
      target: e.target.tagName,
      tool: window.canvasAPI.getActiveTool()
    });
  };
  
  const pointerMoveHandler = (e) => {
    if (eventCount++ > maxEvents) return;
    console.log('🔥 REAL pointer MOVE captured:', {
      clientX: e.clientX,
      clientY: e.clientY,
      buttons: e.buttons
    });
  };
  
  const pointerUpHandler = (e) => {
    if (eventCount++ > maxEvents) return;
    console.log('🔥 REAL pointer UP captured:', {
      clientX: e.clientX,
      clientY: e.clientY,
      tool: window.canvasAPI.getActiveTool()
    });
    
    // Check drawing results
    setTimeout(() => {
      const drawingLayer = window.canvasAPI.getDrawingLayer();
      if (drawingLayer) {
        console.log('📊 Post-interaction drawing layer children:', drawingLayer.children.length);
        drawingLayer.children.forEach((child, index) => {
          console.log(`  ${index}: ${child.constructor.name} at (${Math.round(child.x)}, ${Math.round(child.y)})`);
        });
      }
    }, 100);
  };
  
  // Add temporary listeners
  canvas.addEventListener('pointerdown', pointerDownHandler);
  canvas.addEventListener('pointermove', pointerMoveHandler);
  canvas.addEventListener('pointerup', pointerUpHandler);
  
  console.log('🎯 Event listeners attached. Please draw on the canvas now!');
  console.log('⏰ Listeners will automatically remove after', maxEvents, 'events');
  
  // Auto-remove listeners after a timeout
  setTimeout(() => {
    canvas.removeEventListener('pointerdown', pointerDownHandler);
    canvas.removeEventListener('pointermove', pointerMoveHandler);  
    canvas.removeEventListener('pointerup', pointerUpHandler);
    console.log('🧹 Event listeners removed');
  }, 30000); // 30 seconds
}

function testBrushToolSpecifically() {
  console.log('\n🖍️ Testing Brush Tool Specifically...');
  
  // Activate brush tool
  const success = window.canvasAPI.setTool('brush');
  if (!success) {
    console.error('❌ Failed to activate brush tool');
    return;
  }
  
  console.log('✅ Brush tool activated');
  
  // Get the tool instance directly
  const drawingLayer = window.canvasAPI.getDrawingLayer();
  const app = window.canvasAPI.getApp();
  
  if (!drawingLayer || !app) {
    console.error('❌ Missing canvas components');
    return;
  }
  
  console.log('🧪 Testing brush tool event handling...');
  
  // Create a real FederatedPointerEvent using PixiJS
  const rect = app.canvas.getBoundingClientRect();
  const startX = 100;
  const startY = 100;
  
  // Try to create events the way PixiJS would
  console.log('📍 Creating PixiJS-compatible events...');
  
  try {
    // Create native mouse event first
    const mouseDownEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + startX,
      clientY: rect.top + startY,
      button: 0,
      buttons: 1
    });
    
    // Dispatch the native event to see if it reaches PixiJS
    console.log('🚀 Dispatching mousedown event...');
    app.canvas.dispatchEvent(mouseDownEvent);
    
    // Follow up with mousemove
    setTimeout(() => {
      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + startX + 50,
        clientY: rect.top + startY + 50,
        button: 0,
        buttons: 1
      });
      
      console.log('🚀 Dispatching mousemove event...');
      app.canvas.dispatchEvent(mouseMoveEvent);
      
      // Follow up with mouseup
      setTimeout(() => {
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + startX + 50,
          clientY: rect.top + startY + 50,
          button: 0,
          buttons: 0
        });
        
        console.log('🚀 Dispatching mouseup event...');
        app.canvas.dispatchEvent(mouseUpEvent);
        
        // Check results
        setTimeout(() => {
          console.log('📊 Final drawing layer children:', drawingLayer.children.length);
        }, 100);
        
      }, 100);
    }, 100);
    
  } catch (error) {
    console.error('❌ Event creation failed:', error);
  }
}

function runRealInteractionDebug() {
  console.log('🚀 Starting Real Interaction Debug...\n');
  
  if (!debugCanvasSetup()) {
    return;
  }
  
  // Test with real mouse events
  testCanvasDirectlyWithMouse();
  
  // Also test programmatic events that are more compatible
  setTimeout(() => {
    testBrushToolSpecifically();
  }, 2000);
  
  console.log('\n✅ Real interaction debug setup complete!');
  console.log('🎯 Now draw on the canvas to see real event capture');
}

// Execute the debug
runRealInteractionDebug();

// Make available globally
window.debugRealInteraction = runRealInteractionDebug;
console.log('💡 You can run window.debugRealInteraction() to rerun the debug');
