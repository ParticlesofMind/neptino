/**
 * PixiJS Canvas Inspector - Debug Tool
 * Run this in the browser console to inspect PixiJS content
 */

function inspectPixiJSCanvas() {
  console.log('🔍 PixiJS Canvas Inspector');
  
  // Find all canvas elements
  const canvases = document.querySelectorAll('canvas');
  console.log(`Found ${canvases.length} canvas elements`);
  
  canvases.forEach((canvas, index) => {
    const canvasElement = canvas as HTMLCanvasElement;
    console.log(`\n📊 Canvas ${index + 1}:`, {
      id: canvasElement.id,
      className: canvasElement.className,
      width: canvasElement.width,
      height: canvasElement.height,
      clientWidth: canvasElement.clientWidth,
      clientHeight: canvasElement.clientHeight,
      style: canvasElement.style.cssText
    });
    
    // Check if this is a PixiJS canvas
    const isPixiCanvas = canvasElement.id.includes('pixi-canvas') || 
                        canvasElement.className.includes('canvas-direct--loaded');
    
    if (isPixiCanvas) {
      console.log('🎨 This is a PixiJS canvas!');
      
      // Try to access PixiJS app
      if (window.app) {
        console.log('✅ PixiJS app found:', {
          stage: window.app.stage,
          renderer: window.app.renderer,
          stageWidth: window.app.stage.width,
          stageHeight: window.app.stage.height,
          stageScale: window.app.stage.scale,
          stagePosition: { x: window.app.stage.x, y: window.app.stage.y }
        });
        
        // Inspect stage children
        console.log('👶 Stage children:', window.app.stage.children.length);
        window.app.stage.children.forEach((child, childIndex) => {
          console.log(`  Child ${childIndex}:`, {
            name: child.name || 'unnamed',
            type: child.constructor.name,
            visible: child.visible,
            alpha: child.alpha,
            position: { x: child.x, y: child.y },
            scale: { x: child.scale.x, y: child.scale.y },
            width: child.width,
            height: child.height
          });
        });
      } else {
        console.log('⚠️ No global PixiJS app found');
      }
    }
  });
}

function highlightPixiJSContent() {
  console.log('🎯 Highlighting PixiJS Content');
  
  // Find active canvas
  const activeCanvas = document.querySelector('.canvas-direct.active');
  if (!activeCanvas) {
    console.log('❌ No active canvas found');
    return;
  }
  
  console.log('✅ Active canvas found:', activeCanvas.id);
  
  // Create overlay to show PixiJS content boundaries
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
    border: 3px solid #ff0000;
    background: rgba(255, 0, 0, 0.1);
    box-sizing: border-box;
  `;
  
  // Add overlay to canvas
  activeCanvas.style.position = 'relative';
  activeCanvas.appendChild(overlay);
  
  // Add text overlay
  const textOverlay = document.createElement('div');
  textOverlay.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    z-index: 1001;
  `;
  textOverlay.textContent = 'PixiJS Content Area';
  overlay.appendChild(textOverlay);
  
  console.log('✅ Overlay added to show PixiJS content boundaries');
  
  // Remove overlay after 5 seconds
  setTimeout(() => {
    overlay.remove();
    console.log('🧹 Overlay removed');
  }, 5000);
}

function showCanvasLayers() {
  console.log('🎭 Canvas Layers Inspector');
  
  if (!window.app || !window.app.stage) {
    console.log('❌ No PixiJS app or stage found');
    return;
  }
  
  const stage = window.app.stage;
  console.log('🎬 Stage Info:', {
    children: stage.children.length,
    width: stage.width,
    height: stage.height,
    scale: { x: stage.scale.x, y: stage.scale.y },
    position: { x: stage.x, y: stage.y }
  });
  
  // Find layers
  const layers = stage.children.filter(child => 
    child.name && child.name.includes('layer')
  );
  
  console.log(`\n📚 Found ${layers.length} layers:`);
  layers.forEach((layer, index) => {
    console.log(`  Layer ${index + 1}:`, {
      name: layer.name,
      type: layer.constructor.name,
      children: layer.children.length,
      visible: layer.visible,
      alpha: layer.alpha,
      position: { x: layer.x, y: layer.y },
      scale: { x: layer.scale.x, y: layer.scale.y }
    });
    
    // Show layer children
    if (layer.children.length > 0) {
      console.log(`    Children (${layer.children.length}):`);
      layer.children.forEach((child, childIndex) => {
        console.log(`      ${childIndex + 1}. ${child.name || 'unnamed'} (${child.constructor.name})`);
      });
    }
  });
}

function debugCanvasRendering() {
  console.log('🐛 Canvas Rendering Debug');
  
  const activeCanvas = document.querySelector('.canvas-direct.active') as HTMLCanvasElement;
  if (!activeCanvas) {
    console.log('❌ No active canvas found');
    return;
  }
  
  console.log('📐 Canvas Element:', {
    elementWidth: activeCanvas.width,
    elementHeight: activeCanvas.height,
    clientWidth: activeCanvas.clientWidth,
    clientHeight: activeCanvas.clientHeight,
    offsetWidth: activeCanvas.offsetWidth,
    offsetHeight: activeCanvas.offsetHeight,
    boundingRect: activeCanvas.getBoundingClientRect()
  });
  
  if (window.app) {
    console.log('🎨 PixiJS App:', {
      rendererWidth: window.app.renderer.width,
      rendererHeight: window.app.renderer.height,
      stageWidth: window.app.stage.width,
      stageHeight: window.app.stage.height,
      stageScale: { x: window.app.stage.scale.x, y: window.app.stage.scale.y },
      stagePosition: { x: window.app.stage.x, y: window.app.stage.y }
    });
    
    // Calculate actual content area
    const stage = window.app.stage;
    const contentWidth = stage.width * stage.scale.x;
    const contentHeight = stage.height * stage.scale.y;
    const contentX = stage.x;
    const contentY = stage.y;
    
    console.log('📏 Actual Content Area:', {
      contentWidth: contentWidth,
      contentHeight: contentHeight,
      contentX: contentX,
      contentY: contentY,
      contentRight: contentX + contentWidth,
      contentBottom: contentY + contentHeight
    });
    
    // Show what's visible vs what's hidden
    const canvasRect = activeCanvas.getBoundingClientRect();
    console.log('👁️ Visibility:', {
      canvasVisible: canvasRect.width > 0 && canvasRect.height > 0,
      contentFitsInCanvas: contentWidth <= activeCanvas.clientWidth && contentHeight <= activeCanvas.clientHeight,
      contentOverflow: {
        horizontal: contentWidth > activeCanvas.clientWidth,
        vertical: contentHeight > activeCanvas.clientHeight
      }
    });
  }
}

function createPixiJSInspector() {
  console.log('🛠️ Creating PixiJS Inspector Panel');
  
  // Create inspector panel
  const panel = document.createElement('div');
  panel.id = 'pixi-inspector';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 300px;
    max-height: 500px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    overflow-y: auto;
    border: 2px solid #007bff;
  `;
  
  panel.innerHTML = `
    <h3 style="margin: 0 0 10px 0; color: #007bff;">PixiJS Inspector</h3>
    <div id="inspector-content">
      <p>Click buttons below to inspect:</p>
      <button onclick="inspectPixiJSCanvas()" style="margin: 2px; padding: 5px;">Inspect Canvas</button>
      <button onclick="highlightPixiJSContent()" style="margin: 2px; padding: 5px;">Highlight Content</button>
      <button onclick="showCanvasLayers()" style="margin: 2px; padding: 5px;">Show Layers</button>
      <button onclick="debugCanvasRendering()" style="margin: 2px; padding: 5px;">Debug Rendering</button>
      <button onclick="document.getElementById('pixi-inspector').remove()" style="margin: 2px; padding: 5px;">Close</button>
    </div>
  `;
  
  document.body.appendChild(panel);
  console.log('✅ PixiJS Inspector panel created');
}

// Auto-run inspection
inspectPixiJSCanvas();

// Expose functions globally
window.inspectPixiJSCanvas = inspectPixiJSCanvas;
window.highlightPixiJSContent = highlightPixiJSContent;
window.showCanvasLayers = showCanvasLayers;
window.debugCanvasRendering = debugCanvasRendering;
window.createPixiJSInspector = createPixiJSInspector;



