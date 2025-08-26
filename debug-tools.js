/**
 * Debug Tools Issue - Check each step of the tool activation chain
 */

console.log('🔍 DEBUGGING TOOLS ISSUE');
console.log('========================');

// Check if we're on the right page
console.log('1. Page check:');
console.log('  - Current URL:', window.location.href);
console.log('  - Has canvas container:', !!document.getElementById('canvas-container'));
console.log('  - Canvas container element:', document.getElementById('canvas-container'));

// Check if canvas API was initialized
console.log('2. Canvas API check:');
console.log('  - window.canvasAPI exists:', !!window.canvasAPI);
console.log('  - canvasAPI ready:', window.canvasAPI?.isReady?.());
console.log('  - canvasAPI object:', window.canvasAPI);

// Check tool state manager
console.log('3. ToolStateManager check:');
console.log('  - window.toolStateManager exists:', !!window.toolStateManager);
console.log('  - Current tool:', window.toolStateManager?.getCurrentTool?.());
console.log('  - toolStateManager object:', window.toolStateManager);

// Check if UI elements exist
console.log('4. UI Elements check:');
const toolButtons = document.querySelectorAll('[data-tool]');
console.log('  - Tool buttons found:', toolButtons.length);
toolButtons.forEach((btn, i) => {
  console.log(`    [${i}] ${btn.dataset.tool}: ${btn.textContent?.trim()}`);
});

// Check event listeners
console.log('5. Event Listeners check:');
const firstToolButton = document.querySelector('[data-tool]');
if (firstToolButton) {
  console.log('  - First tool button has event listeners:', !!firstToolButton.onclick);
  
  // Test clicking on a tool
  console.log('  - Testing tool click...');
  const penTool = document.querySelector('[data-tool="pen"]');
  if (penTool) {
    console.log('    - Found pen tool button, simulating click...');
    penTool.click();
    
    // Check if anything changed
    setTimeout(() => {
      console.log('    - After pen click:');
      console.log('      - Current tool in ToolStateManager:', window.toolStateManager?.getCurrentTool?.());
      console.log('      - Active tool in CanvasAPI:', window.canvasAPI?.getActiveTool?.());
      console.log('      - UI class changed:', penTool.closest('.tools__item')?.classList.contains('tools__item--active'));
    }, 100);
  } else {
    console.log('    - No pen tool button found');
  }
} else {
  console.log('  - No tool buttons found');
}

// Check canvas events
console.log('6. Canvas Events check:');
const canvasContainer = document.getElementById('canvas-container');
if (canvasContainer) {
  console.log('  - Canvas container found:', canvasContainer);
  const canvas = canvasContainer.querySelector('canvas');
  console.log('  - Canvas element found:', !!canvas);
  if (canvas) {
    console.log('  - Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('  - Canvas style cursor:', canvas.style.cursor);
    
    // Test canvas click
    console.log('  - Testing canvas click...');
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clickEvent = new MouseEvent('click', {
      clientX: centerX,
      clientY: centerY,
      bubbles: true
    });
    
    console.log('    - Simulating click at canvas center:', centerX, centerY);
    canvas.dispatchEvent(clickEvent);
  }
} else {
  console.log('  - Canvas container not found');
}

// Final status
console.log('7. Final Status:');
console.log('  - Summary: Tools working?', window.canvasAPI?.isReady?.() && window.toolStateManager?.getCurrentTool?.() !== 'none');
