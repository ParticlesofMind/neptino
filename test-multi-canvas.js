/**
 * Test script for Multi-Canvas Vertical Scrolling System
 * Run this in the browser console on the coursebuilder page
 * Server is running on http://localhost:3000
 */

function testMultiCanvasSystem() {
  console.log('🧪 Testing Multi-Canvas Vertical Scrolling System...');
  
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

  // Test multi-canvas functionality
  console.log('📚 Testing multi-canvas system...');
  
  // Get multi-canvas debug info
  const multiCanvasDebug = window.canvasAPI.getMultiCanvasDebugInfo();
  console.log('🔍 Multi-canvas debug info:', multiCanvasDebug);

  // Test loading course canvases (you'll need to provide a real course ID)
  const testCourseId = 'test-course-123';
  console.log(`📖 Loading canvases for course: ${testCourseId}`);
  
  window.canvasAPI.loadCourseCanvases(testCourseId).then(() => {
    console.log('✅ Course canvases loaded successfully');
    
    // Test navigation
    const canvasCount = window.canvasAPI.getCanvasCount();
    console.log(`📄 Total canvases: ${canvasCount}`);
    
    if (canvasCount > 0) {
      const currentIndex = window.canvasAPI.getCurrentCanvasIndex();
      console.log(`📍 Current canvas index: ${currentIndex}`);
      
      // Test navigation to next canvas
      if (canvasCount > 1) {
        console.log('➡️ Testing navigation to next canvas...');
        const nextSuccess = window.canvasAPI.navigateToNextCanvas();
        console.log(`Next navigation success: ${nextSuccess}`);
        
        // Test navigation back
        console.log('⬅️ Testing navigation to previous canvas...');
        const prevSuccess = window.canvasAPI.navigateToPreviousCanvas();
        console.log(`Previous navigation success: ${prevSuccess}`);
      }
      
      // Get current canvas info
      const currentCanvas = window.canvasAPI.getCurrentCanvas();
      console.log('📋 Current canvas info:', currentCanvas);
      
      // Test lesson navigation
      console.log('📚 Testing lesson navigation...');
      window.canvasAPI.multiCanvasManager?.navigateToLesson(1);
      
      // Test tool availability
      console.log('🔧 Testing tool availability...');
      const tools = window.canvasAPI.multiCanvasManager?.verticalContainer?.getActiveCanvasTools();
      if (tools) {
        console.log('✅ Tools available:', {
          toolManager: !!tools.toolManager,
          displayManager: !!tools.displayManager,
          layers: !!tools.layers,
          events: !!tools.events
        });
        
        // Test global tool exposure
        console.log('🌐 Global tools:', {
          toolManager: !!window.toolManager,
          displayManager: !!window.displayManager,
          layers: !!window.layers,
          events: !!window.events
        });
        
        // Test tool persistence after a delay
        setTimeout(() => {
          console.log('⏰ Testing tool persistence after 2 seconds...');
          console.log('🌐 Global tools (after delay):', {
            toolManager: !!window.toolManager,
            displayManager: !!window.displayManager,
            layers: !!window.layers,
            events: !!window.events
          });
        }, 2000);
      } else {
        console.warn('⚠️ No tools available for active canvas');
      }
      
      // Test canvas zoom/fit
      console.log('🎯 Testing canvas zoom/fit...');
      const scrollContainer = document.getElementById('canvas-scroll-container');
      if (scrollContainer) {
        const canvasWrappers = scrollContainer.querySelectorAll('.canvas-wrapper');
        console.log(`📏 Found ${canvasWrappers.length} canvas wrappers`);
        
        canvasWrappers.forEach((wrapper, index) => {
          const canvas = wrapper.querySelector('canvas');
          if (canvas) {
            const rect = wrapper.getBoundingClientRect();
            console.log(`🎨 Canvas ${index + 1}: ${rect.width}x${rect.height}px`);
            console.log(`📐 Canvas should fit with padding around edges`);
          }
        });
      }
      
      // Test scroll container
      const scrollContainer = document.getElementById('canvas-scroll-container');
      if (scrollContainer) {
        console.log('✅ Scroll container found:', scrollContainer);
        console.log(`📏 Scroll container has ${scrollContainer.children.length} canvas wrappers`);
        
        // Check for placeholders vs loaded canvases
        const placeholders = scrollContainer.querySelectorAll('.canvas-placeholder');
        console.log(`📄 ${placeholders.length} canvases are placeholders (not yet loaded)`);
        console.log(`🎨 ${scrollContainer.children.length - placeholders.length} canvases are loaded`);
      } else {
        console.warn('⚠️ Scroll container not found');
      }
    }
    
    console.log('✅ Multi-canvas system test completed!');
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

// Test curriculum event simulation
function simulateCurriculumCompletion() {
  console.log('🎭 Simulating curriculum completion...');
  
  const event = new CustomEvent('curriculum-canvases-ready', {
    detail: {
      courseId: 'test-course-123',
      canvasCount: 3,
      inserts: 3,
      updates: 0
    }
  });
  
  document.dispatchEvent(event);
  console.log('📢 Curriculum completion event dispatched');
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testMultiCanvasSystem();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  // Wait for canvas to be ready
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testMultiCanvasSystem();
    }
  }, 1000);
}

// Expose test functions globally
window.testMultiCanvasSystem = testMultiCanvasSystem;
window.simulateCurriculumCompletion = simulateCurriculumCompletion;
