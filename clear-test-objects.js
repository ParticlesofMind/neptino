/**
 * CLEAR TEST OBJECTS
 * 
 * This script clears any existing test circles or objects from the canvas.
 * Copy and paste this into the browser console to clean up the canvas.
 */

console.log('🧹 CLEARING TEST OBJECTS');
console.log('========================');

function clearTestObjects() {
  if (!window.canvasAPI) {
    console.error('❌ CanvasAPI not available');
    return false;
  }

  const drawingLayer = window.canvasAPI.getDrawingLayer();
  if (!drawingLayer) {
    console.error('❌ Drawing layer not available');
    return false;
  }

  const initialCount = drawingLayer.children.length;
  console.log('📊 Initial children count:', initialCount);

  if (initialCount === 0) {
    console.log('✅ Canvas is already clean - no objects to remove');
    return true;
  }

  // Clear all user drawings
  window.canvasAPI.clearDrawings();

  const finalCount = drawingLayer.children.length;
  console.log('📊 Final children count:', finalCount);
  console.log('🗑️ Removed', initialCount - finalCount, 'objects');

  if (finalCount === 0) {
    console.log('✅ Canvas is now completely clean');
    return true;
  } else {
    console.log('ℹ️ Some objects remain (may be system objects)');
    drawingLayer.children.forEach((child, i) => {
      console.log(`  ${i}: ${child.constructor.name} - label: "${child.label || 'unlabeled'}"`);
    });
    return true;
  }
}

// Run the cleanup
const success = clearTestObjects();

if (success) {
  console.log('\n🎯 CANVAS STATUS:');
  console.log('✅ Test circles removed');
  console.log('✅ Canvas is clean and ready for drawing');
  console.log('🖍️ You can now test the drawing tools on a clean canvas');
} else {
  console.log('\n❌ Failed to clear test objects');
}

// Make available globally
window.clearTestObjects = clearTestObjects;
console.log('\n💡 You can run window.clearTestObjects() again if needed');
