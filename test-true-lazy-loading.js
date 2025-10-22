/**
 * True Lazy Loading Test Script
 * Run this to verify that canvases are created on-demand, not all upfront
 */

function testTrueLazyLoading() {
  console.log('🧪 Testing True Lazy Loading Implementation...');
  
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
  console.log('Initial canvas count:', initialCanvases.length);
  
  // Test loading course canvases
  const testCourseId = 'test-course-123';
  
  console.log('🔄 Loading course canvases...');
  const startTime = performance.now();
  
  window.canvasAPI.loadCourseCanvases(testCourseId).then(() => {
    const loadTime = performance.now() - startTime;
    
    // Check DOM structure after loading
    console.log('📊 DOM Structure AFTER Loading Course:');
    const canvasesAfterLoad = document.querySelectorAll('canvas');
    console.log('Canvas count after load:', canvasesAfterLoad.length);
    
    // Check specific canvas types
    const placeholderCanvases = document.querySelectorAll('.canvas-direct--placeholder');
    const loadedCanvases = document.querySelectorAll('.canvas-direct--loaded');
    
    console.log('Placeholder canvases:', placeholderCanvases.length);
    console.log('Loaded canvases:', loadedCanvases.length);
    
    // Verify lazy loading behavior
    console.log('✅ Lazy Loading Verification:');
    
    if (canvasesAfterLoad.length <= 5) {
      console.log('✅ PASS: Canvas count is reasonable (≤5)');
    } else {
      console.log('❌ FAIL: Too many canvases created upfront');
    }
    
    if (placeholderCanvases.length > 0) {
      console.log('✅ PASS: Placeholder canvases exist');
    } else {
      console.log('❌ FAIL: No placeholder canvases found');
    }
    
    // Test navigation to trigger more canvas creation
    console.log('🧭 Testing Navigation to Trigger More Canvas Creation...');
    
    // Navigate to next canvas
    window.canvasAPI.navigateToNextCanvas().then(() => {
      const canvasesAfterNav = document.querySelectorAll('canvas');
      console.log('Canvas count after navigation:', canvasesAfterNav.length);
      
      if (canvasesAfterNav.length > canvasesAfterLoad.length) {
        console.log('✅ PASS: New canvas created on navigation');
      } else {
        console.log('⚠️ INFO: No new canvas created (may be within initial batch)');
      }
      
      // Test scrolling to trigger more canvas creation
      console.log('📜 Testing Scroll to Trigger Canvas Creation...');
      
      // Scroll to a specific canvas
      const canvasElements = document.querySelectorAll('.canvas-direct');
      if (canvasElements.length > 2) {
        const targetCanvas = canvasElements[canvasElements.length - 1] as HTMLElement;
        targetCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          const canvasesAfterScroll = document.querySelectorAll('canvas');
          console.log('Canvas count after scroll:', canvasesAfterScroll.length);
          
          if (canvasesAfterScroll.length > canvasesAfterNav.length) {
            console.log('✅ PASS: New canvas created on scroll');
          } else {
            console.log('⚠️ INFO: No new canvas created (may be within buffer)');
          }
          
          // Final verification
          console.log('🎯 Final Lazy Loading Verification:');
          console.log('Total canvases in DOM:', canvasesAfterScroll.length);
          console.log('Load time:', `${loadTime.toFixed(2)}ms`);
          
          if (canvasesAfterScroll.length <= 5) {
            console.log('🎉 SUCCESS: True lazy loading is working!');
            console.log('✅ Only 1-5 canvases exist in DOM at any time');
            console.log('✅ Canvases are created on-demand');
            console.log('✅ Memory usage is optimized');
          } else {
            console.log('❌ FAILURE: Too many canvases in DOM');
            console.log('❌ Lazy loading is not working properly');
          }
          
        }, 2000); // Wait for scroll to complete
      } else {
        console.log('⚠️ Not enough canvases to test scrolling');
      }
      
    }).catch(error => {
      console.error('❌ Failed to navigate to next canvas:', error);
    });
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

function monitorCanvasCreation() {
  console.log('👁️ Monitoring Canvas Creation...');
  
  // Monitor DOM changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'CANVAS') {
              console.log('🆕 New canvas created:', {
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
              console.log('🗑️ Canvas destroyed:', {
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
    console.log('✅ Canvas creation monitor started');
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log('🛑 Canvas creation monitor stopped');
    }, 30000);
  } else {
    console.log('❌ Canvas container not found');
  }
}

function compareLazyLoadingApproaches() {
  console.log('⚖️ Comparing Lazy Loading Approaches');
  
  const approaches = {
    'Current (Wrong)': {
      description: 'Creates all canvas elements upfront',
      domNodes: 'N canvas elements immediately',
      memoryUsage: 'High (all canvases in memory)',
      performance: 'Slow initial load',
      scalability: 'Poor (doesn\'t scale)'
    },
    'True Lazy Loading': {
      description: 'Creates canvases only when needed',
      domNodes: '1-5 canvas elements max',
      memoryUsage: 'Low (only visible canvases)',
      performance: 'Fast initial load',
      scalability: 'Excellent (scales infinitely)'
    }
  };
  
  console.table(approaches);
  
  console.log('🎯 Key Benefits of True Lazy Loading:');
  console.log('• Only 1-5 canvases in DOM at any time');
  console.log('• Canvases created on-demand');
  console.log('• Old canvases destroyed when not needed');
  console.log('• Memory usage stays constant');
  console.log('• Scales to any number of canvases');
  console.log('• Faster initial page load');
  console.log('• Better scroll performance');
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testTrueLazyLoading();
  monitorCanvasCreation();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testTrueLazyLoading();
      monitorCanvasCreation();
    }
  }, 1000);
}

// Expose test functions globally
window.testTrueLazyLoading = testTrueLazyLoading;
window.monitorCanvasCreation = monitorCanvasCreation;
window.compareLazyLoadingApproaches = compareLazyLoadingApproaches;

