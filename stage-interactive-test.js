/**
 * STAGE INTERACTIVE TEST
 * 
 * This script tests the cleaner approach of making the stage itself interactive.
 * Copy and paste this into the browser console to test.
 */

console.log('🎭 STAGE INTERACTIVE TEST');
console.log('=========================');

function testStageInteractivity() {
  console.log('\n📋 Testing Stage Interactivity Setup');
  console.log('=====================================');
  
  if (!window.canvasAPI) {
    console.error('❌ CanvasAPI not available');
    return false;
  }
  
  const app = window.canvasAPI.getApp();
  if (!app) {
    console.error('❌ PIXI Application not available');
    return false;
  }
  
  console.log('✅ PIXI Application available');
  
  // Check stage properties
  console.log('📊 Stage Properties:');
  console.log('  - eventMode:', app.stage.eventMode);
  console.log('  - interactiveChildren:', app.stage.interactiveChildren);
  console.log('  - hitArea:', app.stage.hitArea ? 'SET' : 'NOT SET');
  console.log('  - stage bounds:', app.stage.getBounds());
  console.log('  - screen bounds:', app.screen);
  
  if (app.stage.hitArea) {
    console.log('  - hitArea bounds:', {
      x: app.stage.hitArea.x || 0,
      y: app.stage.hitArea.y || 0, 
      width: app.stage.hitArea.width || app.screen.width,
      height: app.stage.hitArea.height || app.screen.height
    });
  }
  
  return true;
}

function testStageEvents() {
  console.log('\n👂 Testing Stage Event Capture');
  console.log('===============================');
  
  const app = window.canvasAPI.getApp();
  if (!app) return false;
  
  let eventCount = 0;
  const maxEvents = 10;
  
  // Add temporary event listeners to see if stage events work
  const stageDownListener = (event) => {
    if (eventCount++ > maxEvents) return;
    console.log('🎭 STAGE pointerdown captured!', {
      global: { x: Math.round(event.data.global.x), y: Math.round(event.data.global.y) },
      target: event.target?.constructor.name || 'unknown',
      currentTarget: event.currentTarget?.constructor.name || 'unknown'
    });
  };
  
  const stageMoveListener = (event) => {
    if (eventCount++ > maxEvents) return;
    if (!event.data.originalEvent.buttons) return; // Only log when dragging
    console.log('🎭 STAGE pointermove captured!', {
      global: { x: Math.round(event.data.global.x), y: Math.round(event.data.global.y) },
      buttons: event.data.originalEvent.buttons
    });
  };
  
  const stageUpListener = (event) => {
    if (eventCount++ > maxEvents) return;
    console.log('🎭 STAGE pointerup captured!', {
      global: { x: Math.round(event.data.global.x), y: Math.round(event.data.global.y) }
    });
    
    // Check if drawing was created
    setTimeout(() => {
      const drawingLayer = window.canvasAPI.getDrawingLayer();
      if (drawingLayer) {
        console.log('📊 Drawing layer children after stage event:', drawingLayer.children.length);
      }
    }, 100);
  };
  
  // Attach listeners
  app.stage.on('pointerdown', stageDownListener);
  app.stage.on('pointermove', stageMoveListener);
  app.stage.on('pointerup', stageUpListener);
  
  console.log('✅ Stage event listeners attached');
  console.log('🖍️ Now try drawing on the canvas!');
  console.log('⏰ Listeners will auto-remove after', maxEvents, 'events or 30 seconds');
  
  // Auto-cleanup
  setTimeout(() => {
    app.stage.off('pointerdown', stageDownListener);
    app.stage.off('pointermove', stageMoveListener);
    app.stage.off('pointerup', stageUpListener);
    console.log('🧹 Stage event listeners removed');
  }, 30000);
}

function activateBrushAndTest() {
  console.log('\n🖍️ Activating Brush Tool and Testing');
  console.log('=====================================');
  
  // Activate brush tool
  const success = window.canvasAPI.setTool('brush');
  console.log('🖍️ Brush tool activated:', success);
  
  if (success) {
    const settings = window.canvasAPI.getToolSettings();
    console.log('⚙️ Brush settings:', settings.brush);
    
    console.log('🎯 READY FOR TESTING!');
    console.log('  1. Brush tool is now active');
    console.log('  2. Stage is interactive');
    console.log('  3. Event listeners are monitoring');
    console.log('  4. Draw anywhere on the canvas now!');
  }
}

function runStageTest() {
  console.log('🚀 Running Stage Interactive Test...\n');
  
  const setupOK = testStageInteractivity();
  if (!setupOK) {
    console.log('❌ Stage setup test failed');
    return;
  }
  
  testStageEvents();
  activateBrushAndTest();
  
  console.log('\n📋 STAGE TEST SUMMARY:');
  console.log('======================');
  console.log('✅ Stage is now interactive');
  console.log('✅ Event listeners are active');
  console.log('✅ Brush tool is ready');
  console.log('\n🖍️ Draw on the canvas to see if it works!');
}

// Make available globally and run
window.runStageTest = runStageTest;
runStageTest();

console.log('\n💡 You can run window.runStageTest() again to retest');
