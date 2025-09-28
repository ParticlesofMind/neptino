/**
 * Debug script to reproduce the layer drag issue
 * Run this in the browser console to test the drag behavior
 */
(function debugLayerDragIssue() {
  console.log('🔍 Debugging layer drag issue...');

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
    const drawingLayer = canvasAPI.getDrawingLayer();
    
    console.log('📦 Creating test objects...');
    
    // Create two text objects
    const text1 = new PIXI.Text('Group Item 1', { fontSize: 20, fill: 0x000000 });
    text1.x = 100;
    text1.y = 100;
    const id1 = displayManager.add(text1);
    
    const text2 = new PIXI.Text('Group Item 2', { fontSize: 20, fill: 0x0000ff });
    text2.x = 150;
    text2.y = 150;
    const id2 = displayManager.add(text2);
    
    // Group them using the selection tool
    window.toolStateManager.setTool('selection');
    const selectionTool = window.toolStateManager.getActiveTool();
    
    if (selectionTool) {
      // Mock selection
      selectionTool.selected = [text1, text2];
      const groupResult = selectionTool.groupSelection();
      
      if (groupResult) {
        console.log('✅ Created group successfully');
        const group = groupResult.newSelection[0];
        const groupId = displayManager.getIdForObject(group);
        console.log('📋 Group ID:', groupId);
        console.log('📋 Group parent:', group.parent?.label || 'unknown');
        console.log('📋 Group children count:', group.children.length);
        
        // Wait for layers panel to update
        setTimeout(() => {
          console.log('🎯 Testing drag operation...');
          testDragOperation(group, groupId);
        }, 500);
      } else {
        console.log('❌ Failed to create group');
      }
    } else {
      console.log('❌ Selection tool not available');
    }
  }

  function testDragOperation(group, groupId) {
    const layersPanel = window.layersPanel;
    if (!layersPanel) {
      console.log('❌ Layers panel not available');
      return;
    }

    // Find the layer item in the DOM
    const layerItem = document.querySelector(`[data-layer-id="${groupId}"]`);
    if (!layerItem) {
      console.log('❌ Could not find layer item in DOM');
      return;
    }

    console.log('📋 Found layer item:', layerItem);
    console.log('📋 Current layers panel state:', {
      totalItems: document.querySelectorAll('#layers-list-root .layer__item').length,
      groupItem: !!layerItem
    });

    // Simulate the drag operation that causes the issue
    // This would be the equivalent of dragging the group outside its layer
    console.log('🎯 Simulating problematic drag operation...');
    
    // Monitor for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const layersCount = document.querySelectorAll('#layers-list-root .layer__item').length;
          console.log('🔄 Layers panel updated, now has', layersCount, 'items');
          
          if (layersCount === 0) {
            console.error('🚨 ISSUE REPRODUCED: All layers disappeared!');
            console.log('💡 This happens when dragging grouped objects outside their layer');
            
            // Check if objects still exist in the canvas
            const canvasObjects = window._displayManager.getObjects();
            console.log('📊 Canvas still has', canvasObjects.length, 'objects');
            console.log('📊 Drawing layer children:', window.canvasAPI.getDrawingLayer().children.length);
          }
        }
      });
    });

    observer.observe(document.getElementById('layers-list-root'), {
      childList: true,
      subtree: true
    });

    // Try to trigger the refresh that might cause the issue
    setTimeout(() => {
      console.log('🔄 Triggering layers panel refresh...');
      layersPanel.refresh();
      
      setTimeout(() => {
        observer.disconnect();
        console.log('✅ Debug test completed');
      }, 1000);
    }, 100);
  }

  checkReady();
})();