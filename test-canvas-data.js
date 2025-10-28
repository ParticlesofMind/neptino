/**
 * Canvas Data Test Script
 * 
 * Run this in the browser console to diagnose canvas data issues.
 * 
 * Usage:
 * 1. Open http://localhost:3000
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Run: testCanvasData()
 */

async function testCanvasData() {
  console.log('🔍 Starting Canvas Data Diagnostic...\n');

  // Test 1: Check if container exists
  console.log('📦 Test 1: Checking container...');
  const container = window.verticalCanvasContainer;
  if (!container) {
    console.error('❌ verticalCanvasContainer not found on window!');
    return;
  }
  console.log('✅ Container found');

  // Test 2: Check canvas count
  console.log('\n📊 Test 2: Checking canvas count...');
  const count = container.getCanvasCount();
  console.log(`Found ${count} canvas(es)`);
  if (count === 0) {
    console.warn('⚠️ No canvases found. Check if course data is loaded.');
  }

  // Test 3: Check loaded canvases
  console.log('\n📋 Test 3: Checking loaded canvases...');
  const loaded = container.getLoadedCanvasIds();
  console.log(`Loaded: ${loaded.length}/${count}`);
  console.log('Loaded IDs:', loaded);

  // Test 4: Check active canvas
  console.log('\n🎯 Test 4: Checking active canvas...');
  const active = container.getActiveCanvas();
  if (!active) {
    console.warn('⚠️ No active canvas. Try scrolling to trigger lazy loading.');
  } else {
    console.log('✅ Active canvas:', {
      id: active.canvasRow.id,
      lesson: active.canvasRow.lesson_number,
      page: active.canvasRow.canvas_index,
      isLoaded: active.isLoaded,
      hasData: !!active.canvasRow.canvas_data,
      hasLayout: !!active.canvasRow.canvas_data?.layout,
    });
  }

  // Test 5: Check Supabase connection
  console.log('\n🔌 Test 5: Checking Supabase connection...');
  try {
    const { supabase } = await import('./src/scripts/backend/supabase.js');
    const { data, error } = await supabase
      .from('canvases')
      .select('id, lesson_number, canvas_index')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase error:', error.message);
    } else {
      console.log('✅ Supabase connected. Sample canvas:', data[0]);
    }
  } catch (err) {
    console.error('❌ Failed to import Supabase:', err.message);
  }

  // Test 6: Check canvas data structure
  console.log('\n🏗️ Test 6: Checking canvas data structure...');
  const allCanvases = container.getAllCanvases();
  const dataStats = {
    total: allCanvases.length,
    withData: 0,
    withLayout: 0,
    withoutData: 0,
  };

  allCanvases.forEach(app => {
    if (app.canvasRow.canvas_data) {
      dataStats.withData++;
      if (app.canvasRow.canvas_data.layout) {
        dataStats.withLayout++;
      }
    } else {
      dataStats.withoutData++;
    }
  });

  console.log('Data Statistics:', dataStats);

  // Test 7: Check debug info
  console.log('\n🐛 Test 7: Debug Info:');
  console.log(container.getDebugInfo());

  // Test 8: Check SharedCanvasEngine
  console.log('\n🎨 Test 8: Checking SharedCanvasEngine...');
  if (active?.virtualContext) {
    console.log('Virtual Context:', {
      id: active.virtualContext.id,
      isVisible: active.virtualContext.isVisible,
      scale: active.virtualContext.scale,
      layerCount: Object.keys(active.layers?.getAllLayers() || {}).length,
    });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Total Canvases: ${count}`);
  console.log(`Loaded Canvases: ${loaded.length}`);
  console.log(`With Data: ${dataStats.withData}/${dataStats.total}`);
  console.log(`With Layout: ${dataStats.withLayout}/${dataStats.total}`);
  console.log(`Active Canvas: ${active ? '✅' : '❌'}`);

  if (dataStats.withoutData > 0) {
    console.warn(`\n⚠️ ${dataStats.withoutData} canvas(es) missing data!`);
    console.log('Run this SQL to check:');
    console.log(`
SELECT id, lesson_number, canvas_index, 
       CASE WHEN canvas_data IS NULL THEN 'NULL' ELSE 'HAS_DATA' END
FROM canvases 
ORDER BY lesson_number, canvas_index;
    `);
  }

  if (dataStats.withLayout < dataStats.withData) {
    const missing = dataStats.withData - dataStats.withLayout;
    console.warn(`\n⚠️ ${missing} canvas(es) missing layout node!`);
  }

  console.log('\n✅ Diagnostic complete!');
}

// Auto-run if this is being executed directly
if (typeof window !== 'undefined') {
  console.log('Canvas Data Test Script Loaded!');
  console.log('Run: testCanvasData()');
}
