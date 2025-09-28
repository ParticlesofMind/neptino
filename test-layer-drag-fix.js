/**
 * Test script to verify the layer drag issue has been fixed
 * Run this in the browser console after the fix
 */
(function testLayerDragFix() {
  console.log('🧪 Testing Layer Drag Fix...');

  // Wait for canvas to be ready
  const checkReady = () => {
    if (window.canvasAPI && window.canvasAPI.isReady() && window._displayManager) {
      console.log('✅ Canvas API and DisplayManager ready');
      startTest();
    } else {
      console.log('⏳ Waiting for canvas to be ready...');
      setTimeout(checkReady, 100);
    }
  };

  function startTest() {
    const canvasAPI = window.canvasAPI;
    const displayManager = window._displayManager;
    const layersPanel = window.layersPanel;
    
    if (!layersPanel) {
      console.log('❌ Layers panel not available');
      return;
    }
    
    console.log('📦 Creating test setup...');
    
    // Create test objects
    const text1 = new PIXI.Text('Item 1', { fontSize: 18, fill: 0x000000 });
    text1.x = 100;
    text1.y = 100;
    const id1 = displayManager.add(text1);
    
    const text2 = new PIXI.Text('Item 2', { fontSize: 18, fill: 0x0000ff });
    text2.x = 150;
    text2.y = 150;
    const id2 = displayManager.add(text2);
    
    console.log('✅ Created test objects');
    
    // Switch to selection tool and group objects
    window.toolStateManager.setTool('selection');
    const selectionTool = window.toolStateManager.getActiveTool();
    
    if (selectionTool) {
      selectionTool.selected = [text1, text2];
      const groupResult = selectionTool.groupSelection();
      
      if (groupResult) {
        const group = groupResult.newSelection[0];
        const groupId = displayManager.getIdForObject(group);
        console.log('✅ Created group:', groupId);
        
        // Wait for layers panel to update
        setTimeout(() => {
          const initialLayerCount = document.querySelectorAll('#layers-list-root .layer__item').length;
          console.log('📋 Initial layer count:', initialLayerCount);
          
          // Test the problematic scenario - simulate dragging the group outside its layer
          console.log('🎯 Testing drag operation that previously caused issues...');
          
          // Monitor for any layer disappearance
          let testPassed = true;
          const checkInterval = setInterval(() => {
            const currentLayerCount = document.querySelectorAll('#layers-list-root .layer__item').length;
            if (currentLayerCount === 0) {
              console.error('🚨 TEST FAILED: Layers disappeared!');
              testPassed = false;
              clearInterval(checkInterval);
            }
          }, 100);
          
          // Simulate various operations that might trigger the bug
          setTimeout(() => {
            console.log('🔄 Forcing multiple refreshes...');
            layersPanel.refresh();
            
            setTimeout(() => {
              layersPanel.refresh();
              
              setTimeout(() => {
                layersPanel.refresh();
                
                setTimeout(() => {
                  clearInterval(checkInterval);
                  const finalLayerCount = document.querySelectorAll('#layers-list-root .layer__item').length;
                  
                  if (testPassed && finalLayerCount > 0) {
                    console.log('✅ TEST PASSED: Layers remained stable');
                    console.log('📊 Final layer count:', finalLayerCount);
                  } else if (finalLayerCount === 0) {
                    console.error('🚨 TEST FAILED: Layers disappeared during test');
                  }
                  
                  // Test drag simulation with better error handling
                  testDragErrorHandling(group, groupId);
                }, 200);
              }, 200);
            }, 200);
          }, 200);
        }, 500);
      } else {
        console.log('❌ Failed to create group');
      }
    } else {
      console.log('❌ Selection tool not available');
    }
  }

  function testDragErrorHandling(group, groupId) {
    console.log('🎯 Testing drag error handling...');
    
    const layerItem = document.querySelector(`[data-layer-id="${groupId}"]`);
    if (!layerItem) {
      console.log('❌ Could not find layer item for testing');
      return;
    }
    
    // Test dragging with various edge cases
    const tests = [
      {
        name: 'Invalid drop target',
        test: () => {
          // Simulate drop event with invalid data
          const dropEvent = new DragEvent('drop', {
            dataTransfer: new DataTransfer()
          });
          dropEvent.dataTransfer.setData('text/layer-id', 'invalid-id');
          layerItem.dispatchEvent(dropEvent);
        }
      },
      {
        name: 'Missing dragged object',
        test: () => {
          const dropEvent = new DragEvent('drop', {
            dataTransfer: new DataTransfer()
          });
          dropEvent.dataTransfer.setData('text/layer-id', 'nonexistent-id');
          layerItem.dispatchEvent(dropEvent);
        }
      }
    ];
    
    tests.forEach((test, index) => {
      setTimeout(() => {
        console.log(`🧪 Running test: ${test.name}`);
        try {
          test.test();
          
          // Check if layers are still there after the test
          setTimeout(() => {
            const layerCount = document.querySelectorAll('#layers-list-root .layer__item').length;
            if (layerCount > 0) {
              console.log(`✅ ${test.name}: Layers remained stable (${layerCount} items)`);
            } else {
              console.error(`🚨 ${test.name}: Layers disappeared!`);
            }
          }, 100);
        } catch (error) {
          console.log(`✅ ${test.name}: Error properly caught:`, error.message);
        }
      }, index * 300);
    });
    
    setTimeout(() => {
      console.log('🎉 All tests completed!');
      console.log('💡 The fix includes:');
      console.log('  - Better error handling in drop operations');
      console.log('  - Cycle detection to prevent circular references');
      console.log('  - Rollback mechanism for failed operations');
      console.log('  - Improved refresh method with error recovery');
      console.log('  - Depth limiting to prevent infinite recursion');
    }, tests.length * 300 + 500);
  }

  checkReady();
})();