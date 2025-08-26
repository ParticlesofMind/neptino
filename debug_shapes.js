/**
 * Debug script to test shapes tool functionality
 * Run this in the browser console on the coursebuilder page
 */

console.log('🔍 SHAPES DEBUG: Starting shapes tool debugging...');

// Check if canvas API is available
if (typeof canvasAPI === 'undefined') {
    console.error('❌ canvasAPI not found - canvas not initialized');
} else {
    console.log('✅ canvasAPI found');
    console.log('📊 Canvas info:', canvasAPI.getCanvasInfo());
}

// Check if tool state manager is available
if (typeof toolStateManager === 'undefined') {
    console.error('❌ toolStateManager not found');
} else {
    console.log('✅ toolStateManager found');
    console.log('🔧 Current tool:', toolStateManager.getCurrentTool());
    console.log('📋 Tool settings:', toolStateManager.getToolSettings());
}

// Function to test shapes tool
function testShapesTool() {
    console.log('🧪 Testing shapes tool activation...');
    
    // Try to set shapes tool active
    if (canvasAPI) {
        const success = canvasAPI.setTool('shapes');
        console.log('🔧 Shapes tool activation:', success ? 'SUCCESS' : 'FAILED');
        console.log('🎯 Active tool:', canvasAPI.getActiveTool());
    }
    
    // Check UI state
    if (toolStateManager) {
        toolStateManager.setTool('shapes');
        console.log('🔧 ToolStateManager shapes activation');
        console.log('📋 Current tool after setting:', toolStateManager.getCurrentTool());
    }
    
    // Check canvas readiness
    if (canvasAPI) {
        console.log('📐 Canvas dimensions:', canvasAPI.getDimensions());
        console.log('✅ Canvas ready:', canvasAPI.isReady());
        console.log('🎨 Drawing layer:', canvasAPI.getDrawingLayer());
    }
}

// Function to simulate drawing a rectangle
function simulateRectangleDrawing() {
    console.log('🟦 Simulating rectangle drawing...');
    
    if (!canvasAPI) {
        console.error('❌ Cannot simulate - canvas not available');
        return;
    }
    
    // Set shapes tool
    canvasAPI.setTool('shapes');
    
    // Get drawing layer
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) {
        console.error('❌ Drawing layer not found');
        return;
    }
    
    console.log('🎨 Drawing layer found, children before:', drawingLayer.children.length);
    
    // Check if we can create a basic shape manually
    try {
        const { Graphics } = window.PIXI;
        if (Graphics) {
            const testRect = new Graphics();
            testRect.rect(100, 100, 100, 50);
            testRect.stroke({ width: 2, color: 0x000000 });
            testRect.fill({ color: 0xff0000 });
            
            drawingLayer.addChild(testRect);
            console.log('✅ Test rectangle added to drawing layer');
            console.log('🎨 Drawing layer children after:', drawingLayer.children.length);
            
            // Remove after 3 seconds
            setTimeout(() => {
                drawingLayer.removeChild(testRect);
                testRect.destroy();
                console.log('🗑️ Test rectangle removed');
            }, 3000);
        } else {
            console.error('❌ PIXI.Graphics not available globally');
        }
    } catch (error) {
        console.error('❌ Error creating test rectangle:', error);
    }
}

// Function to check UI elements
function checkUIElements() {
    console.log('🔍 Checking UI elements...');
    
    // Check shapes tool button
    const shapesButton = document.querySelector('[data-tool="shapes"]');
    if (shapesButton) {
        console.log('✅ Shapes tool button found');
        console.log('🎯 Button classes:', shapesButton.classList.toString());
    } else {
        console.error('❌ Shapes tool button not found');
    }
    
    // Check canvas container
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        console.log('✅ Canvas container found');
        console.log('📦 Container children:', canvasContainer.children.length);
        console.log('📐 Container size:', {
            width: canvasContainer.offsetWidth,
            height: canvasContainer.offsetHeight
        });
    } else {
        console.error('❌ Canvas container not found');
    }
    
    // Check for PIXI canvas
    const pixiCanvas = document.querySelector('canvas');
    if (pixiCanvas) {
        console.log('✅ PIXI canvas found');
        console.log('📐 Canvas size:', {
            width: pixiCanvas.width,
            height: pixiCanvas.height
        });
    } else {
        console.error('❌ PIXI canvas not found');
    }
}

// Run all debug functions
console.log('🚀 Running shapes debugging functions...');
checkUIElements();
testShapesTool();

// Export functions to global scope for manual testing
window.debugShapes = {
    testShapesTool,
    simulateRectangleDrawing,
    checkUIElements
};

console.log('🔧 Debug functions available: window.debugShapes');
console.log('💡 Try: debugShapes.simulateRectangleDrawing()');
