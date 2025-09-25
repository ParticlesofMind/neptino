// Test script to verify layers panel improvements
// Run this in the browser console to test the improvements

(async function testLayersImprovements() {
  console.log('🧪 Testing Layers Panel Improvements...');
  
  // Wait for canvas to be ready
  await new Promise(resolve => {
    const checkReady = () => {
      if (window.canvasAPI && window.canvasAPI.isReady()) {
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
  
  console.log('✅ Canvas API ready');
  
  // Test 1: Create some objects and group them
  console.log('📝 Test 1: Creating objects and grouping...');
  
  // Switch to text tool and create a text object
  window.toolStateManager.setTool('text');
  
  // Simulate creating text objects (would normally be done through UI)
  const drawingLayer = window.canvasAPI.getDrawingLayer();
  const displayManager = window._displayManager;
  
  // Create some test objects
  const text1 = new PIXI.Text('Test 1', { fontSize: 24, fill: 0x000000 });
  text1.x = 100;
  text1.y = 100;
  text1.__toolType = 'text';
  displayManager.add(text1);
  
  const text2 = new PIXI.Text('Test 2', { fontSize: 24, fill: 0x0000ff });
  text2.x = 200;
  text2.y = 150;
  text2.__toolType = 'text';
  displayManager.add(text2);
  
  console.log('✅ Created test objects');
  
  // Test 2: Check if layers panel shows the objects
  const layersPanel = document.querySelectorAll('#layers-list-root .layer__item');
  console.log(`📋 Layers panel shows ${layersPanel.length} items`);
  
  // Test 3: Group objects and check if they show up properly
  console.log('📦 Test 3: Testing grouping...');
  
  // Switch to selection tool
  window.toolStateManager.setTool('selection');
  
  // Simulate selection and grouping (would normally be done through UI)
  const selectionTool = window.toolStateManager.getActiveTool();
  if (selectionTool && typeof selectionTool.groupSelection === 'function') {
    // Mock a selection
    selectionTool.selected = [text1, text2];
    const grouped = selectionTool.groupSelection();
    
    if (grouped) {
      console.log('✅ Objects grouped successfully');
      
      // Test 4: Duplicate the group
      console.log('📄 Test 4: Testing duplication...');
      
      setTimeout(() => {
        const duplicated = selectionTool.copySelection();
        if (duplicated) {
          console.log('✅ Group copied to clipboard');
          
          const pasted = selectionTool.pasteSelection();
          if (pasted) {
            console.log('✅ Group pasted successfully');
            
            // Check layers panel again
            setTimeout(() => {
              const layersAfterDupe = document.querySelectorAll('#layers-list-root .layer__item');
              console.log(`📋 After duplication, layers panel shows ${layersAfterDupe.length} items`);
              
              // Test 5: Create animation scene and add objects
              console.log('🎬 Test 5: Testing animation scene...');
              
              window.toolStateManager.setTool('scene');
              
              // Create a scene
              const sceneTool = window.toolStateManager.getActiveTool();
              if (sceneTool) {
                // Simulate scene creation by triggering events
                const container = drawingLayer;
                const fakeEvent = {
                  global: { x: 300, y: 200 },
                  target: container
                };
                
                try {
                  sceneTool.onPointerDown(fakeEvent, container);
                  
                  const fakeEndEvent = {
                    global: { x: 500, y: 400 },
                    target: container
                  };
                  
                  sceneTool.onPointerUp(fakeEndEvent, container);
                  console.log('✅ Animation scene created');
                  
                  // Check if scene shows up in layers
                  setTimeout(() => {
                    const layersWithScene = document.querySelectorAll('#layers-list-root .layer__item');
                    console.log(`📋 After scene creation, layers panel shows ${layersWithScene.length} items`);
                    
                    console.log('🎉 All tests completed!');
                    console.log('Check the layers panel to see:');
                    console.log('1. Better spacing between items');
                    console.log('2. Improved hover colors');
                    console.log('3. Nested items with proper indentation');
                    console.log('4. Duplicated groups showing up');
                    console.log('5. Animation scenes appearing as layers');
                  }, 500);
                } catch (error) {
                  console.error('❌ Scene creation failed:', error);
                }
              }
            }, 500);
          } else {
            console.log('❌ Group paste failed');
          }
        } else {
          console.log('❌ Group copy failed');
        }
      }, 500);
    } else {
      console.log('❌ Grouping failed');
    }
  } else {
    console.log('❌ Selection tool not available');
  }
})();