/**
 * TARGETED FIX: UI Tool Button Click Handler
 * The system works programmatically but UI clicks aren't connected
 */

console.log('🎯 TARGETED FIX: Connecting UI tool buttons to canvas');
console.log('==================================================');

function fixUIToolButtons() {
  console.log('1. 🔍 Finding tool buttons...');
  
  const toolButtons = document.querySelectorAll('[data-tool]');
  console.log(`Found ${toolButtons.length} tool buttons`);
  
  if (toolButtons.length === 0) {
    console.error('❌ No tool buttons found');
    return false;
  }
  
  let connectedButtons = 0;
  
  toolButtons.forEach((button, index) => {
    const toolName = button.dataset.tool;
    console.log(`  Button ${index + 1}: ${toolName}`);
    
    if (!toolName) {
      console.warn(`    ⚠️ Button has no tool name`);
      return;
    }
    
    // Remove existing event listeners by cloning the button
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add our custom click handler
    newButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log(`🔧 UI Tool Button Clicked: ${toolName}`);
      
      // Update UI state
      if (window.toolStateManager) {
        window.toolStateManager.setTool(toolName);
        console.log(`  ✅ UI state updated to: ${window.toolStateManager.getCurrentTool()}`);
      }
      
      // Update canvas tool
      if (window.canvasAPI) {
        const success = window.canvasAPI.setTool(toolName);
        const activeTool = window.canvasAPI.getActiveTool();
        console.log(`  ✅ Canvas tool updated: ${success} (now: ${activeTool})`);
      }
      
      // Verify sync
      const uiTool = window.toolStateManager?.getCurrentTool();
      const canvasTool = window.canvasAPI?.getActiveTool();
      const inSync = uiTool === canvasTool;
      console.log(`  🎯 Tools in sync: ${inSync ? '✅' : '❌'} (UI: ${uiTool}, Canvas: ${canvasTool})`);
      
      // Update cursor
      const canvas = document.querySelector('#canvas-container canvas');
      if (canvas) {
        const cursor = window.canvasAPI?.getCursor?.() || 'default';
        canvas.style.cursor = cursor;
        console.log(`  🖱️ Cursor updated to: ${cursor}`);
      }
    });
    
    connectedButtons++;
  });
  
  console.log(`✅ Connected ${connectedButtons} tool buttons`);
  return connectedButtons > 0;
}

function testUIConnection() {
  console.log('2. 🧪 Testing UI connection...');
  
  // Test clicking on a tool button programmatically
  const penButton = document.querySelector('[data-tool="pen"]');
  if (penButton) {
    console.log('  📍 Testing pen tool button click...');
    penButton.click();
    
    setTimeout(() => {
      const uiTool = window.toolStateManager?.getCurrentTool();
      const canvasTool = window.canvasAPI?.getActiveTool();
      console.log(`  📊 After pen click - UI: ${uiTool}, Canvas: ${canvasTool}, Match: ${uiTool === canvasTool ? '✅' : '❌'}`);
      
      // Test canvas interaction
      testCanvasInteraction();
    }, 100);
  } else {
    console.error('❌ Pen button not found');
  }
}

function testCanvasInteraction() {
  console.log('3. 🖱️ Testing canvas interaction...');
  
  const canvas = document.querySelector('#canvas-container canvas');
  if (!canvas) {
    console.error('❌ Canvas not found');
    return;
  }
  
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  
  console.log(`  📍 Simulating pointer down at canvas center (${Math.round(centerX)}, ${Math.round(centerY)})`);
  
  // Create a more realistic pointer event
  const pointerDown = new PointerEvent('pointerdown', {
    pointerId: 1,
    bubbles: true,
    cancelable: true,
    clientX: centerX,
    clientY: centerY,
    pressure: 0.5,
    button: 0,
    buttons: 1
  });
  
  canvas.dispatchEvent(pointerDown);
  
  // Follow up with move and up events for testing
  setTimeout(() => {
    const pointerMove = new PointerEvent('pointermove', {
      pointerId: 1,
      bubbles: true,
      cancelable: true,
      clientX: centerX + 10,
      clientY: centerY + 10,
      pressure: 0.5,
      button: 0,
      buttons: 1
    });
    canvas.dispatchEvent(pointerMove);
    
    setTimeout(() => {
      const pointerUp = new PointerEvent('pointerup', {
        pointerId: 1,
        bubbles: true,
        cancelable: true,
        clientX: centerX + 10,
        clientY: centerY + 10,
        button: 0,
        buttons: 0
      });
      canvas.dispatchEvent(pointerUp);
      
      console.log('  ✅ Canvas interaction test completed');
    }, 50);
  }, 50);
}

function finalStatus() {
  console.log('4. 📋 Final Status Check...');
  
  const uiTool = window.toolStateManager?.getCurrentTool();
  const canvasTool = window.canvasAPI?.getActiveTool();
  const toolsMatch = uiTool === canvasTool;
  const canvasReady = window.canvasAPI?.isReady();
  const buttonsConnected = document.querySelectorAll('[data-tool]').length > 0;
  
  console.log('  📊 System Status:');
  console.log(`    - Canvas Ready: ${canvasReady ? '✅' : '❌'}`);
  console.log(`    - Tool Buttons: ${buttonsConnected ? '✅' : '❌'}`);
  console.log(`    - UI Tool: ${uiTool}`);
  console.log(`    - Canvas Tool: ${canvasTool}`);
  console.log(`    - Tools Match: ${toolsMatch ? '✅' : '❌'}`);
  
  const overallStatus = canvasReady && buttonsConnected && toolsMatch;
  console.log(`  🎯 Overall: ${overallStatus ? '✅ WORKING' : '❌ NEEDS ATTENTION'}`);
  
  if (overallStatus) {
    console.log('🎉 SUCCESS! Try clicking tool buttons and drawing on canvas now!');
  } else {
    console.log('⚠️ Some issues remain. Check the status above.');
  }
  
  return overallStatus;
}

// Run the targeted fix
async function runTargetedFix() {
  try {
    console.log('🚀 Running targeted UI fix...');
    
    const buttonsFixed = fixUIToolButtons();
    if (!buttonsFixed) {
      console.error('❌ Failed to fix tool buttons');
      return;
    }
    
    // Wait a moment for event handlers to be set up
    await new Promise(resolve => setTimeout(resolve, 200));
    
    testUIConnection();
    
    // Wait for tests to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    finalStatus();
    
  } catch (error) {
    console.error('❌ Targeted fix failed:', error);
  }
}

// Execute
runTargetedFix();

// Make function available for manual retry
window.runTargetedFix = runTargetedFix;
console.log('💡 You can run window.runTargetedFix() to retry if needed');
