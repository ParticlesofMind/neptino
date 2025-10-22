/**
 * Test script to verify template layout blocks are working
 * Run this in the browser console on the coursebuilder page
 * Server is running on http://localhost:3000
 */

function testTemplateBlocks() {
  console.log('🧪 Testing Template Layout Blocks...');
  
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

  // Get template blocks
  const blocks = window.canvasAPI.getTemplateBlocks();
  console.log('📦 Template blocks:', blocks);

  // Check if blocks exist
  if (!blocks.header || !blocks.body || !blocks.footer) {
    console.error('❌ Template blocks not created');
    return;
  }

  // Get debug info
  const debugInfo = window.canvasAPI.getTemplateLayoutDebugInfo();
  console.log('🔍 Template layout debug info:', debugInfo);

  // Check block dimensions
  const headerBounds = blocks.header.getBounds();
  const bodyBounds = blocks.body.getBounds();
  const footerBounds = blocks.footer.getBounds();

  console.log('📏 Block dimensions:');
  console.log('  Header:', { x: headerBounds.x, y: headerBounds.y, width: headerBounds.width, height: headerBounds.height });
  console.log('  Body:', { x: bodyBounds.x, y: bodyBounds.y, width: bodyBounds.width, height: bodyBounds.height });
  console.log('  Footer:', { x: footerBounds.x, y: footerBounds.y, width: footerBounds.width, height: footerBounds.height });

  // Check if blocks are visible
  console.log('👁️ Block visibility:');
  console.log('  Header visible:', blocks.header.visible);
  console.log('  Body visible:', blocks.body.visible);
  console.log('  Footer visible:', blocks.footer.visible);

  // Check if blocks have children (graphics)
  console.log('🎨 Block children:');
  console.log('  Header children:', blocks.header.children.length);
  console.log('  Body children:', blocks.body.children.length);
  console.log('  Footer children:', blocks.footer.children.length);

  console.log('✅ Template blocks test completed!');
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testTemplateBlocks();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  // Wait for canvas to be ready
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testTemplateBlocks();
    }
  }, 1000);
}
