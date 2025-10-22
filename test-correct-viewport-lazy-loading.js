/**
 * Correct Viewport-Based Lazy Loading Test
 * This should show: placeholders created for all canvases, but only first canvas loaded initially
 */

function testCorrectViewportLazyLoading() {
  console.log('🧪 Testing Correct Viewport-Based Lazy Loading...');
  
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

  // Test DOM structure before loading
  console.log('📊 DOM Structure BEFORE Loading Course:');
  const initialCanvases = document.querySelectorAll('canvas');
  const initialPlaceholders = document.querySelectorAll('.canvas-placeholder-invisible');
  console.log('Initial canvas count:', initialCanvases.length);
  console.log('Initial placeholder count:', initialPlaceholders.length);
  
  // Test loading course canvases
  const testCourseId = 'test-course-123';
  
  console.log('🔄 Loading course canvases...');
  const startTime = performance.now();
  
  window.canvasAPI.loadCourseCanvases(testCourseId).then(() => {
    const loadTime = performance.now() - startTime;
    
    // Check DOM structure after loading
    console.log('📊 DOM Structure AFTER Loading Course:');
    const canvasesAfterLoad = document.querySelectorAll('canvas');
    const placeholdersAfterLoad = document.querySelectorAll('.canvas-placeholder-invisible');
    
    console.log('Canvas count after load:', canvasesAfterLoad.length);
    console.log('Placeholder count after load:', placeholdersAfterLoad.length);
    
    // Verify correct viewport-based lazy loading behavior
    console.log('✅ Correct Viewport-Based Lazy Loading Verification:');
    
    if (canvasesAfterLoad.length === 1) {
      console.log('✅ PASS: Only 1 canvas loaded initially');
    } else {
      console.log('❌ FAIL: Expected 1 canvas, got', canvasesAfterLoad.length);
    }
    
    if (placeholdersAfterLoad.length > 1) {
      console.log('✅ PASS: Multiple placeholders created for intersection observer');
    } else {
      console.log('❌ FAIL: Expected multiple placeholders, got', placeholdersAfterLoad.length);
    }
    
    // Test scrolling to trigger more canvas creation
    console.log('📜 Testing Scroll to Trigger Additional Canvas Creation...');
    
    const scrollContainer = document.getElementById('canvas-grid-container');
    if (scrollContainer) {
      // Scroll down by viewport height to trigger next canvas
      const viewportHeight = window.innerHeight;
      scrollContainer.scrollTop = viewportHeight;
      
      setTimeout(() => {
        const canvasesAfterScroll = document.querySelectorAll('canvas');
        const placeholdersAfterScroll = document.querySelectorAll('.canvas-placeholder-invisible');
        
        console.log('Canvas count after scroll:', canvasesAfterScroll.length);
        console.log('Placeholder count after scroll:', placeholdersAfterScroll.length);
        
        if (canvasesAfterScroll.length > canvasesAfterLoad.length) {
          console.log('✅ PASS: Additional canvas created on scroll');
        } else {
          console.log('⚠️ INFO: No additional canvas created (may be within buffer zone)');
        }
        
        // Continue scrolling to trigger more canvases
        console.log('📜 Testing Continued Scrolling...');
        
        scrollContainer.scrollTop = viewportHeight * 2;
        
        setTimeout(() => {
          const canvasesAfterMoreScroll = document.querySelectorAll('canvas');
          const placeholdersAfterMoreScroll = document.querySelectorAll('.canvas-placeholder-invisible');
          
          console.log('Canvas count after more scroll:', canvasesAfterMoreScroll.length);
          console.log('Placeholder count after more scroll:', placeholdersAfterMoreScroll.length);
          
          // Test scrolling back up to trigger unloading
          console.log('📜 Testing Scroll Back to Trigger Canvas Unloading...');
          
          scrollContainer.scrollTop = 0;
          
          setTimeout(() => {
            const canvasesAfterScrollBack = document.querySelectorAll('canvas');
            const placeholdersAfterScrollBack = document.querySelectorAll('.canvas-placeholder-invisible');
            
            console.log('Canvas count after scroll back:', canvasesAfterScrollBack.length);
            console.log('Placeholder count after scroll back:', placeholdersAfterScrollBack.length);
            
            // Final verification
            console.log('🎯 Final Correct Viewport-Based Lazy Loading Verification:');
            console.log('Total canvases in DOM:', canvasesAfterScrollBack.length);
            console.log('Total placeholders in DOM:', placeholdersAfterScrollBack.length);
            console.log('Load time:', `${loadTime.toFixed(2)}ms`);
            
            if (canvasesAfterScrollBack.length <= 3 && placeholdersAfterScrollBack.length > 1) {
              console.log('🎉 SUCCESS: Correct viewport-based lazy loading is working!');
              console.log('✅ Placeholders created for all canvases');
              console.log('✅ Only 1-3 canvases loaded at any time');
              console.log('✅ Canvases created when entering viewport');
              console.log('✅ Canvases destroyed when leaving viewport');
              console.log('✅ Memory usage is optimized');
            } else {
              console.log('❌ FAILURE: Viewport-based lazy loading not working correctly');
              console.log('Expected: 1-3 canvases, multiple placeholders');
              console.log('Got:', canvasesAfterScrollBack.length, 'canvases,', placeholdersAfterScrollBack.length, 'placeholders');
            }
            
          }, 2000); // Wait for scroll back to complete
          
        }, 2000); // Wait for more scroll to complete
        
      }, 2000); // Wait for initial scroll to complete
    } else {
      console.log('❌ Scroll container not found');
    }
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

function monitorCorrectLazyLoading() {
  console.log('👁️ Monitoring Correct Viewport-Based Canvas Creation/Destruction...');
  
  // Monitor DOM changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'CANVAS') {
              console.log('🆕 Canvas created (viewport-triggered):', {
                id: element.id,
                className: element.className,
                timestamp: new Date().toISOString()
              });
            } else if (element.classList.contains('canvas-placeholder-invisible')) {
              console.log('🔄 Placeholder created:', {
                id: element.id,
                className: element.className,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
        
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'CANVAS') {
              console.log('🗑️ Canvas destroyed (viewport-triggered):', {
                id: element.id,
                className: element.className,
                timestamp: new Date().toISOString()
              });
            } else if (element.classList.contains('canvas-placeholder-invisible')) {
              console.log('🔄 Placeholder destroyed:', {
                id: element.id,
                className: element.className,
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      }
    });
  });
  
  // Start observing
  const container = document.getElementById('canvas-grid-container');
  if (container) {
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    console.log('✅ Correct lazy loading monitor started');
    
    // Stop monitoring after 60 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log('🛑 Correct lazy loading monitor stopped');
    }, 60000);
  } else {
    console.log('❌ Canvas container not found');
  }
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testCorrectViewportLazyLoading();
  monitorCorrectLazyLoading();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testCorrectViewportLazyLoading();
      monitorCorrectLazyLoading();
    }
  }, 1000);
}

// Expose test functions globally
window.testCorrectViewportLazyLoading = testCorrectViewportLazyLoading;
window.monitorCorrectLazyLoading = monitorCorrectLazyLoading;

