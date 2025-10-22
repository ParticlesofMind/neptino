/**
 * Canvas Zoom Test Script
 * Test the zoom-to-fit functionality for 1200x1800 canvas
 */

function testCanvasZoom() {
  console.log('🔍 Testing Canvas Zoom Functionality...');
  
  // Check if canvas API is available
  if (!window.canvasAPI) {
    console.error('❌ Canvas API not available');
    return;
  }

  // Check if canvas is ready
  if (!window.canvasAPI.isReady()) {
    console.error('❌ Canvas not ready');
    return;
  }

  // Test loading course canvases first
  const testCourseId = 'test-course-123';
  
  window.canvasAPI.loadCourseCanvases(testCourseId).then(() => {
    console.log('✅ Course canvases loaded');
    
    // Test zoom functionality
    console.log('🔍 Testing Zoom Functions...');
    
    // Get current zoom level
    const currentZoom = window.canvasAPI.getZoomLevel();
    console.log('Current zoom level:', `${(currentZoom * 100).toFixed(1)}%`);
    
    // Test fit to viewport
    console.log('📐 Testing fitToViewport()...');
    window.canvasAPI.fitToViewport();
    
    setTimeout(() => {
      const fitZoom = window.canvasAPI.getZoomLevel();
      console.log('Zoom after fitToViewport:', `${(fitZoom * 100).toFixed(1)}%`);
      
      // Test zoom in
      console.log('🔍 Testing zoom in to 150%...');
      window.canvasAPI.setZoomLevel(1.5, true);
      
      setTimeout(() => {
        const zoomInLevel = window.canvasAPI.getZoomLevel();
        console.log('Zoom after zoom in:', `${(zoomInLevel * 100).toFixed(1)}%`);
        
        // Test zoom out
        console.log('🔍 Testing zoom out to 75%...');
        window.canvasAPI.setZoomLevel(0.75, true);
        
        setTimeout(() => {
          const zoomOutLevel = window.canvasAPI.getZoomLevel();
          console.log('Zoom after zoom out:', `${(zoomOutLevel * 100).toFixed(1)}%`);
          
          // Test fit to viewport again
          console.log('📐 Testing fitToViewport() again...');
          window.canvasAPI.fitToViewport();
          
          setTimeout(() => {
            const finalZoom = window.canvasAPI.getZoomLevel();
            console.log('Final zoom level:', `${(finalZoom * 100).toFixed(1)}%`);
            
            // Verify canvas visibility
            console.log('👁️ Verifying Canvas Visibility...');
            const activeCanvas = document.querySelector('.canvas-direct.active');
            if (activeCanvas) {
              const rect = activeCanvas.getBoundingClientRect();
              console.log('Active canvas dimensions:', {
                width: rect.width,
                height: rect.height,
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom
              });
              
              // Check if all edges are visible
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;
              
              const leftVisible = rect.left >= 0;
              const rightVisible = rect.right <= viewportWidth;
              const topVisible = rect.top >= 0;
              const bottomVisible = rect.bottom <= viewportHeight;
              
              console.log('Edge visibility:', {
                left: leftVisible ? '✅' : '❌',
                right: rightVisible ? '✅' : '❌',
                top: topVisible ? '✅' : '❌',
                bottom: bottomVisible ? '✅' : '❌'
              });
              
              if (leftVisible && rightVisible && topVisible && bottomVisible) {
                console.log('🎉 SUCCESS: All canvas edges are visible in viewport!');
              } else {
                console.log('⚠️ Some canvas edges are not visible - zoom may need adjustment');
              }
            }
            
            console.log('✅ Zoom functionality test completed!');
            
          }, 1000); // Wait for fitToViewport
          
        }, 1000); // Wait for zoom out
        
      }, 1000); // Wait for zoom in
      
    }, 1000); // Wait for fitToViewport
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

function testCanvasSizing() {
  console.log('📏 Testing Canvas Sizing...');
  
  // Check canvas dimensions
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach((canvas, index) => {
    const canvasElement = canvas as HTMLCanvasElement;
    console.log(`Canvas ${index + 1}:`, {
      id: canvasElement.id,
      width: canvasElement.width,
      height: canvasElement.height,
      clientWidth: canvasElement.clientWidth,
      clientHeight: canvasElement.clientHeight,
      style: canvasElement.style.cssText
    });
  });
  
  // Check if PixiJS app is available
  if (window.app) {
    console.log('PixiJS App:', {
      stageWidth: window.app.stage.width,
      stageHeight: window.app.stage.height,
      stageScale: { x: window.app.stage.scale.x, y: window.app.stage.scale.y },
      stagePosition: { x: window.app.stage.x, y: window.app.stage.y },
      rendererWidth: window.app.renderer.width,
      rendererHeight: window.app.renderer.height
    });
  }
}

function createZoomControls() {
  console.log('🎛️ Creating Zoom Controls...');
  
  // Create zoom control panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    border: 2px solid #007bff;
  `;
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #007bff;">Zoom Controls</h3>
    <div>
      <button onclick="window.canvasAPI.fitToViewport()" style="margin: 2px; padding: 5px;">Fit to Viewport</button>
      <button onclick="window.canvasAPI.setZoomLevel(1.0)" style="margin: 2px; padding: 5px;">100%</button>
      <button onclick="window.canvasAPI.setZoomLevel(1.5)" style="margin: 2px; padding: 5px;">150%</button>
      <button onclick="window.canvasAPI.setZoomLevel(0.5)" style="margin: 2px; padding: 5px;">50%</button>
    </div>
    <div style="margin-top: 10px;">
      <label>Custom Zoom: </label>
      <input type="range" id="zoom-slider" min="0.1" max="3.0" step="0.1" value="1.0" style="width: 100px;">
      <span id="zoom-value">100%</span>
    </div>
    <button onclick="document.getElementById('zoom-controls').remove()" style="margin: 2px; padding: 5px;">Close</button>
  `;
  
  panel.id = 'zoom-controls';
  document.body.appendChild(panel);
  
  // Add slider functionality
  const slider = document.getElementById('zoom-slider') as HTMLInputElement;
  const valueDisplay = document.getElementById('zoom-value');
  
  slider.addEventListener('input', () => {
    const zoom = parseFloat(slider.value);
    window.canvasAPI.setZoomLevel(zoom, false);
    valueDisplay.textContent = `${(zoom * 100).toFixed(0)}%`;
  });
  
  console.log('✅ Zoom controls created');
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testCanvasZoom();
  testCanvasSizing();
  createZoomControls();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testCanvasZoom();
      testCanvasSizing();
      createZoomControls();
    }
  }, 1000);
}

// Expose test functions globally
window.testCanvasZoom = testCanvasZoom;
window.testCanvasSizing = testCanvasSizing;
window.createZoomControls = createZoomControls;

