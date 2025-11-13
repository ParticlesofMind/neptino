/**
 * Clear Canvas Cache Utility
 * 
 * This script clears all canvas data from the database for the current course
 * so that canvases can be regenerated with the new hierarchical structure.
 * 
 * Usage: Run this in the browser console while on the coursebuilder page
 */

async function clearCanvasCache() {
  try {
    // Get Supabase client
    const { supabase } = await import('../src/scripts/backend/supabase.js');
    
    // Get current course ID from URL or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId') || urlParams.get('id') || sessionStorage.getItem('currentCourseId');
    
    if (!courseId) {
      console.error('❌ No course ID found. Please navigate to a course page first.');
      return;
    }
    
    console.log(`🗑️  Clearing canvas cache for course: ${courseId}`);
    
    // Delete all canvases for this course
    const { data, error } = await supabase
      .from('canvases')
      .delete()
      .eq('course_id', courseId)
      .select();
    
    if (error) {
      console.error('❌ Error clearing canvas cache:', error);
      return;
    }
    
    const deletedCount = data?.length || 0;
    console.log(`✅ Successfully deleted ${deletedCount} canvas(es) for course ${courseId}`);
    console.log('🔄 Canvases will be regenerated with the new hierarchical structure when you save the curriculum.');
    
    // Trigger a curriculum save to regenerate canvases
    const curriculumManager = (window as any).curriculumManager;
    if (curriculumManager && typeof curriculumManager.saveCurriculum === 'function') {
      console.log('🔄 Triggering curriculum save to regenerate canvases...');
      await curriculumManager.saveCurriculum();
    } else {
      console.log('💡 Tip: Save your curriculum to regenerate canvases with the new structure.');
    }
    
  } catch (error) {
    console.error('❌ Failed to clear canvas cache:', error);
  }
}

// Make it available globally
(window as any).clearCanvasCache = clearCanvasCache;

console.log('✅ Canvas cache clearing utility loaded. Run clearCanvasCache() in the console.');

