/**
 * Shapes Tool Direct Test
 * Creates a minimal test to check if shapes are being drawn correctly
 */

// Test function to manually create and draw shapes on the canvas
function testShapesDirectly() {
    console.log('🧪 Testing shapes directly...');
    
    // Check if we have the necessary objects
    if (typeof canvasAPI === 'undefined') {
        console.error('❌ canvasAPI not found');
        return;
    }
    
    if (typeof PIXI === 'undefined') {
        console.error('❌ PIXI not found');
        return;
    }
    
    // Get the drawing layer
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) {
        console.error('❌ Drawing layer not found');
        return;
    }
    
    console.log('✅ Drawing layer found:', drawingLayer);
    console.log('📊 Layer children before test:', drawingLayer.children.length);
    
    // Create a simple test rectangle
    try {
        const testShape = new PIXI.Graphics();
        
        // Draw a simple rectangle with stroke and fill
        testShape.rect(200, 200, 100, 60);
        testShape.fill({ color: 0xFF0000, alpha: 0.5 }); // Semi-transparent red
        testShape.stroke({ width: 3, color: 0x000000 }); // Black stroke
        
        // Add to drawing layer
        drawingLayer.addChild(testShape);
        
        console.log('✅ Test rectangle added');
        console.log('📊 Layer children after test:', drawingLayer.children.length);
        
        // Check if the shape is visible
        console.log('📐 Shape bounds:', {
            x: testShape.x,
            y: testShape.y,
            width: testShape.width,
            height: testShape.height,
            visible: testShape.visible,
            alpha: testShape.alpha
        });
        
        // Remove after 5 seconds
        setTimeout(() => {
            try {
                drawingLayer.removeChild(testShape);
                testShape.destroy();
                console.log('🗑️ Test rectangle removed');
            } catch (e) {
                console.error('❌ Error removing test rectangle:', e);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error creating test rectangle:', error);
    }
}

// Test the actual shapes tool
function testShapesToolBehavior() {
    console.log('🔧 Testing shapes tool behavior...');
    
    if (!canvasAPI) {
        console.error('❌ canvasAPI not available');
        return;
    }
    
    // Set to shapes tool
    const activated = canvasAPI.setTool('shapes');
    console.log('🔧 Shapes tool activated:', activated);
    
    if (!activated) {
        console.error('❌ Failed to activate shapes tool');
        return;
    }
    
    // Try to manually trigger pointer events to simulate drawing
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) {
        console.error('❌ Drawing layer not found');
        return;
    }
    
    // Get the app for event simulation
    const app = canvasAPI.getApp();
    if (!app) {
        console.error('❌ PIXI app not found');
        return;
    }
    
    // Create fake pointer events
    try {
        console.log('🎯 Simulating pointer events...');
        
        // Create fake event objects
        const fakePointerDown = {
            global: { x: 300, y: 300 },
            shiftKey: false,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        
        const fakePointerMove = {
            global: { x: 400, y: 350 },
            shiftKey: false,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        
        const fakePointerUp = {
            global: { x: 400, y: 350 },
            shiftKey: false,
            preventDefault: () => {},
            stopPropagation: () => {}
        };
        
        console.log('📊 Children before simulation:', drawingLayer.children.length);
        
        // Simulate drawing sequence
        setTimeout(() => {
            // Simulate pointer down
            console.log('👇 Simulating pointer down...');
            app.stage.emit('pointerdown', fakePointerDown);
            
            setTimeout(() => {
                // Simulate pointer move
                console.log('👈 Simulating pointer move...');
                app.stage.emit('pointermove', fakePointerMove);
                
                setTimeout(() => {
                    // Simulate pointer up
                    console.log('👆 Simulating pointer up...');
                    app.stage.emit('pointerup', fakePointerUp);
                    
                    // Check results
                    setTimeout(() => {
                        console.log('📊 Children after simulation:', drawingLayer.children.length);
                        
                        if (drawingLayer.children.length > 0) {
                            const lastChild = drawingLayer.children[drawingLayer.children.length - 1];
                            console.log('✅ Shape possibly created:', lastChild);
                            console.log('📐 Shape properties:', {
                                visible: lastChild.visible,
                                alpha: lastChild.alpha,
                                x: lastChild.x,
                                y: lastChild.y,
                                width: lastChild.width,
                                height: lastChild.height
                            });
                        }
                    }, 100);
                }, 50);
            }, 50);
        }, 100);
        
    } catch (error) {
        console.error('❌ Error simulating events:', error);
    }
}

// Function to check layer visibility and styles
function checkLayerVisibility() {
    console.log('👁️ Checking layer visibility...');
    
    if (!canvasAPI) return;
    
    const drawingLayer = canvasAPI.getDrawingLayer();
    if (!drawingLayer) return;
    
    console.log('📊 Drawing layer properties:', {
        visible: drawingLayer.visible,
        alpha: drawingLayer.alpha,
        x: drawingLayer.x,
        y: drawingLayer.y,
        scale: { x: drawingLayer.scale.x, y: drawingLayer.scale.y },
        children: drawingLayer.children.length
    });
    
    // Check parent containers too
    let current = drawingLayer.parent;
    let level = 1;
    while (current && level < 5) {
        console.log(`📊 Parent level ${level}:`, {
            visible: current.visible,
            alpha: current.alpha,
            x: current.x,
            y: current.y
        });
        current = current.parent;
        level++;
    }
}

// Add to global scope
window.shapesDebug = {
    testShapesDirectly,
    testShapesToolBehavior,
    checkLayerVisibility
};

console.log('🔧 Shapes debug functions loaded:');
console.log('- shapesDebug.testShapesDirectly()');
console.log('- shapesDebug.testShapesToolBehavior()');
console.log('- shapesDebug.checkLayerVisibility()');
