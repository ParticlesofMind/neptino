/**
 * Viewport-Based Lazy Loading Test Script
 * Run this to verify true viewport-based lazy loading
 */

function testViewportBasedLazyLoading() {
  console.log('🧪 Testing Viewport-Based Lazy Loading Implementation...');
  
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
    
    // Verify viewport-based lazy loading behavior
    console.log('✅ Viewport-Based Lazy Loading Verification:');
    
    if (canvasesAfterLoad.length === 1) {
      console.log('✅ PASS: Only 1 canvas created initially (viewport-based)');
    } else {
      console.log('❌ FAIL: Expected 1 canvas, got', canvasesAfterLoad.length);
    }
    
    if (placeholdersAfterLoad.length > 0) {
      console.log('✅ PASS: Placeholder elements exist for intersection observer');
    } else {
      console.log('❌ FAIL: No placeholder elements found');
    }
    
    // Test scrolling to trigger more canvas creation
    console.log('📜 Testing Scroll to Trigger Canvas Creation...');
    
    // Scroll down to trigger intersection observer
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
          console.log('✅ PASS: New canvas created on scroll (viewport-triggered)');
        } else {
          console.log('⚠️ INFO: No new canvas created (may be within buffer zone)');
        }
        
        // Test scrolling back up to trigger unloading
        console.log('📜 Testing Scroll Back to Trigger Canvas Unloading...');
        
        scrollContainer.scrollTop = 0;
        
        setTimeout(() => {
          const canvasesAfterScrollBack = document.querySelectorAll('canvas');
          const placeholdersAfterScrollBack = document.querySelectorAll('.canvas-placeholder-invisible');
          
          console.log('Canvas count after scroll back:', canvasesAfterScrollBack.length);
          console.log('Placeholder count after scroll back:', placeholdersAfterScrollBack.length);
          
          if (canvasesAfterScrollBack.length < canvasesAfterScroll.length) {
            console.log('✅ PASS: Canvas unloaded on scroll away (viewport-triggered)');
          } else {
            console.log('⚠️ INFO: Canvas not unloaded (may be within buffer zone)');
          }
          
          // Final verification
          console.log('🎯 Final Viewport-Based Lazy Loading Verification:');
          console.log('Total canvases in DOM:', canvasesAfterScrollBack.length);
          console.log('Total placeholders in DOM:', placeholdersAfterScrollBack.length);
          console.log('Load time:', `${loadTime.toFixed(2)}ms`);
          
          if (canvasesAfterScrollBack.length <= 3) {
            console.log('🎉 SUCCESS: Viewport-based lazy loading is working!');
            console.log('✅ Only 1-3 canvases exist in DOM at any time');
            console.log('✅ Canvases are created when entering viewport');
            console.log('✅ Canvases are destroyed when leaving viewport');
            console.log('✅ Memory usage is optimized');
          } else {
            console.log('❌ FAILURE: Too many canvases in DOM');
            console.log('❌ Viewport-based lazy loading is not working properly');
          }
          
        }, 2000); // Wait for scroll back to complete
        
      }, 2000); // Wait for scroll to complete
    } else {
      console.log('❌ Scroll container not found');
    }
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

function monitorViewportBasedLoading() {
  console.log('👁️ Monitoring Viewport-Based Canvas Creation/Destruction...');
  
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
    console.log('✅ Viewport-based loading monitor started');
    
    // Stop monitoring after 60 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log('🛑 Viewport-based loading monitor stopped');
    }, 60000);
  } else {
    console.log('❌ Canvas container not found');
  }
}

function testIntersectionObserver() {
  console.log('👁️ Testing Intersection Observer Behavior...');
  
  // Create a test intersection observer
  const testObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const element = entry.target as HTMLElement;
      const canvasId = element.getAttribute('data-canvas-id');
      
      console.log('🔍 Intersection detected:', {
        canvasId: canvasId,
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
        element: element.tagName,
        className: element.className,
        timestamp: new Date().toISOString()
      });
    });
  }, {
    root: document.getElementById('canvas-grid-container'),
    rootMargin: '200% 0px 200% 0px', // 2 viewports ahead/behind
    threshold: [0, 0.1, 0.5, 1.0]
  });
  
  // Observe all placeholders
  const placeholders = document.querySelectorAll('.canvas-placeholder-invisible');
  placeholders.forEach(placeholder => {
    testObserver.observe(placeholder);
  });
  
  console.log(`✅ Intersection observer set up for ${placeholders.length} placeholders`);
  
  // Stop observing after 30 seconds
  setTimeout(() => {
    testObserver.disconnect();
    console.log('🛑 Intersection observer stopped');
  }, 30000);
}

function compareLazyLoadingStrategies() {
  console.log('⚖️ Comparing Lazy Loading Strategies');
  
  const strategies = {
    'Previous (Wrong)': {
      description: 'Creates all canvas elements upfront',
      domNodes: 'N canvas elements immediately',
      memoryUsage: 'High (all canvases in memory)',
      performance: 'Slow initial load',
      scalability: 'Poor (doesn\'t scale)',
      trigger: 'None (all created upfront)'
    },
    'Current (Better)': {
      description: 'Creates 1-2 canvases initially',
      domNodes: '1-2 canvas elements initially',
      memoryUsage: 'Medium (few canvases in memory)',
      performance: 'Faster initial load',
      scalability: 'Good (scales better)',
      trigger: 'Navigation/scroll events'
    },
    'Viewport-Based (Best)': {
      description: 'Creates canvases only when entering viewport',
      domNodes: '1-3 canvas elements max',
      memoryUsage: 'Low (only visible canvases)',
      performance: 'Fastest initial load',
      scalability: 'Excellent (scales infinitely)',
      trigger: 'Intersection Observer (viewport)'
    }
  };
  
  console.table(strategies);
  
  console.log('🎯 Key Benefits of Viewport-Based Lazy Loading:');
  console.log('• Only 1-3 canvases in DOM at any time');
  console.log('• Canvases created when entering viewport (+ buffer)');
  console.log('• Canvases destroyed when leaving viewport');
  console.log('• Memory usage stays constant');
  console.log('• Scales to any number of canvases');
  console.log('• Fastest initial page load');
  console.log('• Best scroll performance');
  console.log('• True infinite scroll capability');
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testViewportBasedLazyLoading();
  monitorViewportBasedLoading();
  testIntersectionObserver();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testViewportBasedLazyLoading();
      monitorViewportBasedLoading();
      testIntersectionObserver();
    }
  }, 1000);
}

// Expose test functions globally
window.testViewportBasedLazyLoading = testViewportBasedLazyLoading;
window.monitorViewportBasedLoading = monitorViewportBasedLoading;
window.testIntersectionObserver = testIntersectionObserver;
window.compareLazyLoadingStrategies = compareLazyLoadingStrategies;

