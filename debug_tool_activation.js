/**
 * Tool Activation Debug Script
 * Tests tool activation and switching to identify reliability issues
 */

console.log('🧪 Loading tool activation debugging...');

// Wait for canvasAPI and toolStateManager to be available
let testInterval = setInterval(() => {
    if (window.canvasAPI && window.toolStateManager) {
        clearInterval(testInterval);
        runToolActivationTests();
    }
}, 100);

function runToolActivationTests() {
    console.log('🧪 ===== TOOL ACTIVATION DEBUG TESTS =====');
    
    const canvasAPI = window.canvasAPI;
    const toolStateManager = window.toolStateManager;
    
    // Test 1: Check initial state
    console.log('🧪 TEST 1: Initial tool states');
    console.log(`📋 UI Tool: "${toolStateManager.getCurrentTool()}"`);
    console.log(`🖼️ Canvas Tool: "${canvasAPI.getActiveToolName()}"`);
    console.log(`🎯 Canvas Active Tool Object:`, canvasAPI.getActiveTool());
    
    // Test 2: Try switching to pen tool
    console.log('🧪 TEST 2: Switching to pen tool');
    console.log('📋 Setting UI tool to pen...');
    toolStateManager.setTool('pen');
    console.log(`📋 UI Tool after set: "${toolStateManager.getCurrentTool()}"`);
    
    console.log('🖼️ Setting canvas tool to pen...');
    const penSuccess = canvasAPI.setTool('pen');
    console.log(`🖼️ Canvas pen activation: ${penSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`🖼️ Canvas Tool after set: "${canvasAPI.getActiveToolName()}"`);
    console.log(`🎯 Canvas Active Tool Object:`, canvasAPI.getActiveTool());
    
    // Test 3: Try switching to shapes tool
    setTimeout(() => {
        console.log('🧪 TEST 3: Switching to shapes tool');
        console.log('📋 Setting UI tool to shapes...');
        toolStateManager.setTool('shapes');
        console.log(`📋 UI Tool after set: "${toolStateManager.getCurrentTool()}"`);
        
        console.log('🖼️ Setting canvas tool to shapes...');
        const shapesSuccess = canvasAPI.setTool('shapes');
        console.log(`🖼️ Canvas shapes activation: ${shapesSuccess ? 'SUCCESS' : 'FAILED'}`);
        console.log(`🖼️ Canvas Tool after set: "${canvasAPI.getActiveToolName()}"`);
        console.log(`🎯 Canvas Active Tool Object:`, canvasAPI.getActiveTool());
        
        // Test 4: Test actual functionality
        setTimeout(() => {
            console.log('🧪 TEST 4: Testing tool functionality');
            testToolFunctionality();
        }, 500);
        
    }, 500);
}

function testToolFunctionality() {
    console.log('🧪 Testing tool functionality with synthetic events...');
    
    const canvasAPI = window.canvasAPI;
    const canvasContainer = document.querySelector('#canvas-container canvas');
    
    if (!canvasContainer) {
        console.error('❌ Canvas element not found');
        return;
    }
    
    const activeToolName = canvasAPI.getActiveToolName();
    console.log(`🎯 Testing functionality for: ${activeToolName}`);
    
    // Create synthetic pointer events
    const rect = canvasContainer.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    console.log(`🖱️ Creating synthetic click at canvas center: (${centerX}, ${centerY})`);
    
    // Simulate pointer down
    const pointerDownEvent = new PointerEvent('pointerdown', {
        clientX: centerX,
        clientY: centerY,
        pointerId: 1,
        bubbles: true
    });
    
    console.log('👆 Dispatching synthetic pointer down...');
    canvasContainer.dispatchEvent(pointerDownEvent);
    
    // Check what tool actually handled it
    setTimeout(() => {
        console.log(`🎯 Tool that should have handled click: ${canvasAPI.getActiveToolName()}`);
        console.log(`🖼️ Canvas drawing layer children count:`, canvasAPI.getDrawingLayer()?.children?.length || 0);
        
        // Simulate pointer up
        setTimeout(() => {
            const pointerUpEvent = new PointerEvent('pointerup', {
                clientX: centerX,
                clientY: centerY,
                pointerId: 1,
                bubbles: true
            });
            
            console.log('👆 Dispatching synthetic pointer up...');
            canvasContainer.dispatchEvent(pointerUpEvent);
            
            console.log('🧪 ===== TOOL ACTIVATION TESTS COMPLETE =====');
            
        }, 100);
        
    }, 100);
}

// Make functions available globally for manual testing
window.debugToolActivation = runToolActivationTests;
window.debugToolFunctionality = testToolFunctionality;

console.log('🧪 Tool activation debugging loaded');
console.log('🧪 Run: debugToolActivation() or debugToolFunctionality()');
