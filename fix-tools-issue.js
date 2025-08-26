/**
 * COMPREHENSIVE TOOLS FIX
 * This script diagnoses and fixes the tools issue
 */

console.log('🔧 COMPREHENSIVE TOOLS DEBUGGING AND FIX');
console.log('=========================================');

// Step 1: Force canvas initialization if not done
async function ensureCanvasInitialized() {
  console.log('1. 🔍 Checking canvas initialization...');
  
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    console.error('❌ Canvas container not found! Are we on the coursebuilder page?');
    return false;
  }
  console.log('✅ Canvas container found');

  // Check if canvas API exists
  if (!window.canvasAPI) {
    console.log('⚠️ CanvasAPI not found in window - attempting manual initialization...');
    
    // Try to manually trigger canvas initialization
    try {
      // Import and initialize manually if needed
      const canvasInit = await import('/src/scripts/coursebuilder/canvasInit.js');
      if (canvasInit.initializeCanvas) {
        await canvasInit.initializeCanvas();
        console.log('✅ Manual canvas initialization completed');
      }
    } catch (error) {
      console.error('❌ Manual canvas initialization failed:', error);
      return false;
    }
  }

  // Wait a bit for initialization to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (window.canvasAPI && window.canvasAPI.isReady()) {
    console.log('✅ CanvasAPI is ready');
    return true;
  } else {
    console.error('❌ CanvasAPI failed to initialize properly');
    return false;
  }
}

// Step 2: Ensure proper tool connection
function fixToolConnection() {
  console.log('2. 🔧 Fixing tool connection...');
  
  if (!window.canvasAPI || !window.toolStateManager) {
    console.error('❌ Missing required objects - cannot fix tool connection');
    return false;
  }

  // Get the UI event handler and reconnect the callbacks
  const uiEventHandler = window.uiEventHandler;
  if (!uiEventHandler) {
    console.log('⚠️ UIEventHandler not found in window - manual callback setup');
    
    // Manual callback setup as backup
    const originalSetTool = window.toolStateManager.setTool.bind(window.toolStateManager);
    window.toolStateManager.setTool = function(toolName) {
      console.log(`🔧 Manual tool change: ${toolName}`);
      
      // Update UI state
      const result = originalSetTool(toolName);
      
      // Update canvas tool
      if (window.canvasAPI) {
        const success = window.canvasAPI.setTool(toolName);
        console.log(`🔧 Canvas tool set result: ${success}`);
      }
      
      return result;
    };
    
    console.log('✅ Manual callback setup completed');
  } else {
    // Ensure callbacks are properly connected
    uiEventHandler.setOnToolChange((toolName) => {
      console.log(`🔧 UI tool change callback: ${toolName}`);
      if (window.canvasAPI) {
        const success = window.canvasAPI.setTool(toolName);
        console.log(`🔧 Canvas tool set result: ${success}`);
        
        // Force cursor update
        const cursor = window.canvasAPI.getToolSettings?.()?.cursor || 'default';
        const canvas = document.querySelector('#canvas-container canvas');
        if (canvas) {
          canvas.style.cursor = cursor;
        }
      }
    });
    
    uiEventHandler.setOnColorChange((color) => {
      console.log(`🎨 UI color change callback: ${color}`);
      if (window.canvasAPI) {
        window.canvasAPI.setToolColor(color);
      }
    });
    
    uiEventHandler.setOnToolSettingsChange((toolName, settings) => {
      console.log(`⚙️ UI settings change callback: ${toolName}`, settings);
      if (window.canvasAPI) {
        window.canvasAPI.setToolSettings(toolName, settings);
      }
    });
    
    console.log('✅ Callbacks reconnected');
  }
  
  return true;
}

// Step 3: Test tool functionality
function testTools() {
  console.log('3. 🧪 Testing tool functionality...');
  
  const tools = ['selection', 'pen', 'brush', 'text', 'shapes', 'eraser'];
  let workingTools = 0;
  
  tools.forEach(toolName => {
    console.log(`Testing ${toolName}...`);
    
    // Test UI state change
    if (window.toolStateManager) {
      window.toolStateManager.setTool(toolName);
      const currentTool = window.toolStateManager.getCurrentTool();
      console.log(`  - UI state: ${currentTool === toolName ? '✅' : '❌'} (${currentTool})`);
    }
    
    // Test canvas tool change
    if (window.canvasAPI) {
      const success = window.canvasAPI.setTool(toolName);
      const activeTool = window.canvasAPI.getActiveTool();
      console.log(`  - Canvas: ${success ? '✅' : '❌'} (${activeTool})`);
      
      if (success && activeTool === toolName) {
        workingTools++;
      }
    }
  });
  
  console.log(`📊 Working tools: ${workingTools}/${tools.length}`);
  return workingTools > 0;
}

// Step 4: Fix canvas event handling
function fixCanvasEvents() {
  console.log('4. 🖱️ Ensuring canvas events are working...');
  
  const canvasElement = document.querySelector('#canvas-container canvas');
  if (!canvasElement) {
    console.error('❌ Canvas element not found');
    return false;
  }
  
  // Check if the canvas has proper event handling
  console.log('  - Canvas element found:', canvasElement.tagName);
  console.log('  - Canvas dimensions:', canvasElement.width, 'x', canvasElement.height);
  console.log('  - Canvas style cursor:', canvasElement.style.cursor);
  
  // Test a simple canvas click
  const testClick = () => {
    console.log('  - Testing canvas click response...');
    
    const rect = canvasElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const pointerEvent = new PointerEvent('pointerdown', {
      pointerId: 1,
      clientX: centerX,
      clientY: centerY,
      bubbles: true
    });
    
    console.log(`  - Dispatching pointer event at (${centerX}, ${centerY})`);
    canvasElement.dispatchEvent(pointerEvent);
    
    // Also try mouse events as fallback
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: centerX,
      clientY: centerY,
      bubbles: true
    });
    canvasElement.dispatchEvent(mouseEvent);
  };
  
  // Test after setting a drawing tool
  if (window.canvasAPI) {
    window.canvasAPI.setTool('pen');
    setTimeout(testClick, 100);
  }
  
  console.log('✅ Canvas event test completed');
  return true;
}

// Step 5: Final verification
function verifyFix() {
  console.log('5. ✅ Final verification...');
  
  const checks = {
    canvasAPI: !!window.canvasAPI && window.canvasAPI.isReady(),
    toolStateManager: !!window.toolStateManager,
    toolButtons: document.querySelectorAll('[data-tool]').length > 0,
    canvasElement: !!document.querySelector('#canvas-container canvas'),
    activeToolMatch: window.toolStateManager?.getCurrentTool() === window.canvasAPI?.getActiveTool()
  };
  
  console.log('📋 System Status:');
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`  - ${key}: ${value ? '✅' : '❌'}`);
  });
  
  const allWorking = Object.values(checks).every(Boolean);
  console.log(`🎯 Overall Status: ${allWorking ? '✅ FIXED' : '❌ STILL BROKEN'}`);
  
  return allWorking;
}

// Main execution
async function fixTools() {
  try {
    const canvasReady = await ensureCanvasInitialized();
    if (!canvasReady) {
      console.error('❌ Cannot continue - canvas initialization failed');
      return;
    }
    
    const connectionFixed = fixToolConnection();
    if (!connectionFixed) {
      console.error('❌ Cannot continue - tool connection failed');
      return;
    }
    
    const toolsTested = testTools();
    const eventsFixed = fixCanvasEvents();
    const verified = verifyFix();
    
    if (verified) {
      console.log('🎉 SUCCESS: Tools should now be working!');
      console.log('💡 Try clicking on different tools and then drawing on the canvas');
    } else {
      console.log('⚠️ Partial success - some issues may remain');
      console.log('🔍 Check the individual test results above for details');
    }
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
  }
}

// Auto-run the fix
console.log('🚀 Starting automated fix...');
fixTools();

// Make fix function available globally for manual retry
window.fixTools = fixTools;
console.log('💡 You can run window.fixTools() again if needed');
