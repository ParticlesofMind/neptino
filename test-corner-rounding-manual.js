/**
 * Manual Corner Rounding Test
 * 
 * This script tests the corner rounding fix by programmatically:
 * 1. Creating a rectangle shape
 * 2. Selecting it
 * 3. Simulating corner rounding interaction
 * 4. Verifying object position remains stable
 * 
 * Run this in the browser console on the coursebuilder page.
 */

console.log('🧪 Starting Corner Rounding Fix Test...');

// Test function to be run in browser console
function testCornerRounding() {
  return new Promise((resolve, reject) => {
    try {
      // Check if canvas is ready
      if (!window.canvasAPI || !window.canvasAPI.isReady()) {
        reject('Canvas API not ready');
        return;
      }


      // Step 1: Set tool to shapes and create a rectangle
      window.toolStateManager?.setTool('shapes');

      // Wait a moment for tool to activate
      setTimeout(() => {
        try {
          // Step 2: Get the drawing layer and create a rectangle manually
          
          // Get the shapes tool and check if it has a method to create shapes
          const shapesTool = window.toolStateManager?.getCurrentTool?.();
          
          if (!shapesTool) {
            
            // Alternative: Create graphics object directly via display manager
            const drawingLayer = window.canvasAPI.getDrawingLayer();
            if (drawingLayer) {
              // Simulate creating a rectangle by directly using PIXI Graphics
              const graphics = new PIXI.Graphics();
              graphics.beginFill(0x3B82F6); // Blue color
              graphics.drawRoundedRect(0, 0, 150, 100, 5);
              graphics.endFill();
              graphics.x = 300;
              graphics.y = 200;
              
              // Add metadata to make it work with our tools
              graphics.meta = {
                type: 'rect',
                x: 300,
                y: 200,
                width: 150,
                height: 100,
                cornerRadius: 5,
                color: 0x3B82F6
              };
              
              // Add to drawing layer
              drawingLayer.addChild(graphics);
  
              window.toolStateManager?.setTool('selection');
              
              setTimeout(() => {
                try {
                  // Step 4: Test corner rounding functionality directly
                  console.log('🔄 Testing corner rounding...');
                  
                  // Get position before corner rounding
                  const beforePosition = {
                    x: graphics.x,
                    y: graphics.y,
                    metaX: graphics.meta?.x,
                    metaY: graphics.meta?.y
                  };
                  
                  console.log('📍 Position before corner rounding:', beforePosition);
                  
                  // Import and test RoundCorners utility
                  import('/src/scripts/coursebuilder/tools/utils/RoundCorners.js')
                    .then((RoundCornersModule) => {
                      const RoundCorners = RoundCornersModule.RoundCorners;
                      
                      // Initialize corner rounding
                      const roundCorners = new RoundCorners();
                      
                      // Start rounding
                      roundCorners.startRounding(graphics);
                      
                      // Simulate dragging to increase corner radius
                      roundCorners.updateCornerRadius(graphics, 15);
                      
                      // Stop rounding
                      roundCorners.stopRounding();
                      
                      // Get position after corner rounding
                      const afterPosition = {
                        x: graphics.x,
                        y: graphics.y,
                        metaX: graphics.meta?.x,
                        metaY: graphics.meta?.y
                      };
                      
                      console.log('📍 Position after corner rounding:', afterPosition);
                      
                      // Check if position changed unexpectedly
                      const xChanged = Math.abs(afterPosition.x - beforePosition.x) > 1;
                      const yChanged = Math.abs(afterPosition.y - beforePosition.y) > 1;
                      
                      if (xChanged || yChanged) {
                        console.error('❌ CORNER ROUNDING BUG STILL EXISTS!');
                        console.error('Position changed:', {
                          before: beforePosition,
                          after: afterPosition,
                          deltaX: afterPosition.x - beforePosition.x,
                          deltaY: afterPosition.y - beforePosition.y
                        });
                        reject('Object position changed during corner rounding');
                      } else {
                        console.log('✅ CORNER ROUNDING FIX SUCCESSFUL!');
                        console.log('Object position remained stable during corner rounding');
                        resolve('Corner rounding works correctly');
                      }
                      
                    })
                    .catch((importError) => {
                      console.error('❌ Could not import RoundCorners module:', importError);
                      reject('Failed to import RoundCorners');
                    });
                  
                } catch (selectionError) {
                  console.error('❌ Error during selection/corner rounding test:', selectionError);
                  reject(selectionError);
                }
              }, 500);
              
            } else {
              reject('Could not get drawing layer');
            }
          }
          
        } catch (createError) {
          console.error('❌ Error creating rectangle:', createError);
          reject(createError);
        }
      }, 500);
      
    } catch (error) {
      console.error('❌ Error in corner rounding test:', error);
      reject(error);
    }
  });
}

// Export for console use
window.testCornerRounding = testCornerRounding;

