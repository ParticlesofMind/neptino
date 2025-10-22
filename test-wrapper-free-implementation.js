/**
 * Test script for Wrapper-Free Canvas Implementation
 * Run this in the browser console to test the wrapper-free approach
 */

function testWrapperFreeImplementation() {
  console.log('🚀 Testing Wrapper-Free Canvas Implementation...');
  
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

  // Test DOM structure
  console.log('📊 Testing DOM Structure...');
  
  // Check for grid container
  const gridContainer = document.getElementById('canvas-grid-container');
  if (gridContainer) {
    console.log('✅ Grid container found:', gridContainer.className);
  } else {
    console.error('❌ Grid container not found');
  }
  
  // Check for direct canvas elements
  const directCanvases = document.querySelectorAll('.canvas-direct');
  console.log('🎨 Direct canvas elements found:', directCanvases.length);
  
  // Check for wrapper elements (should be none)
  const wrapperElements = document.querySelectorAll('.canvas-wrapper');
  console.log('📦 Wrapper elements found:', wrapperElements.length, '(should be 0)');
  
  // Test canvas structure
  directCanvases.forEach((canvas, index) => {
    const canvasElement = canvas as HTMLCanvasElement;
    console.log(`Canvas ${index + 1}:`, {
      id: canvasElement.id,
      className: canvasElement.className,
      width: canvasElement.width,
      height: canvasElement.height,
      hasDataAttributes: canvasElement.hasAttribute('data-canvas-id')
    });
  });
  
  // Test performance
  console.log('⚡ Performance Test...');
  
  // Test DOM manipulation speed
  const startTime = performance.now();
  directCanvases.forEach(canvas => {
    canvas.style.transform = 'scale(1.01)';
  });
  const manipulationTime = performance.now() - startTime;
  console.log('DOM manipulation time:', `${man manipulationTime.toFixed(2)}ms`);
  
  // Test memory usage
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB`
    });
  }
  
  // Test CSS Grid layout
  console.log('🎨 CSS Grid Layout Test...');
  
  if (gridContainer) {
    const computedStyle = window.getComputedStyle(gridContainer);
    console.log('Grid properties:', {
      display: computedStyle.display,
      gridTemplateColumns: computedStyle.gridTemplateColumns,
      gap: computedStyle.gap,
      padding: computedStyle.padding
    });
  }
  
  // Test intersection observer
  console.log('👁️ Intersection Observer Test...');
  
  const observer = new IntersectionObserver((entries) => {
    console.log('Intersection detected:', entries.length, 'entries');
    entries.forEach(entry => {
      const canvas = entry.target as HTMLCanvasElement;
      console.log(`Canvas ${canvas.id}: ${entry.isIntersecting ? 'visible' : 'hidden'}`);
    });
  }, {
    root: gridContainer,
    threshold: [0, 0.5, 1.0]
  });
  
  // Observe all canvases
  directCanvases.forEach(canvas => {
    observer.observe(canvas);
  });
  
  console.log('✅ Intersection observer set up for', directCanvases.length, 'canvases');
  
  // Test canvas loading
  console.log('🔄 Testing Canvas Loading...');
  
  const testCourseId = 'test-course-123';
  
  // Load course canvases
  window.canvasAPI.loadCourseCanvases(testCourseId).then(() => {
    console.log('✅ Course canvases loaded successfully');
    
    // Test navigation
    console.log('🧭 Testing Navigation...');
    
    // Navigate to next canvas
    window.canvasAPI.navigateToNextCanvas().then(() => {
      console.log('✅ Navigated to next canvas');
      
      // Navigate to previous canvas
      window.canvasAPI.navigateToPreviousCanvas().then(() => {
        console.log('✅ Navigated to previous canvas');
        
        // Test tool availability
        console.log('🔧 Testing Tool Availability...');
        
        if (window.toolManager) {
          console.log('✅ Tool manager available');
          console.log('Available tools:', Object.keys(window.toolManager));
        } else {
          console.warn('⚠️ Tool manager not available');
        }
        
        // Test canvas zoom/fit
        console.log('🔍 Testing Canvas Zoom...');
        
        const currentCanvas = window.canvasAPI.getCurrentCanvas();
        if (currentCanvas) {
          console.log('✅ Current canvas retrieved');
          console.log('Canvas zoom level:', window.canvasAPI.getZoomLevel());
        } else {
          console.warn('⚠️ No current canvas');
        }
        
        // Test scroll container
        console.log('📜 Testing Scroll Container...');
        
        const scrollContainer = document.getElementById('canvas-grid-container');
        if (scrollContainer) {
          console.log('✅ Scroll container found');
          console.log('Scroll container children:', scrollContainer.children.length);
        } else {
          console.error('❌ Scroll container not found');
        }
        
        // Test placeholder vs loaded canvases
        console.log('🎭 Testing Placeholder vs Loaded Canvases...');
        
        const placeholderCanvases = document.querySelectorAll('.canvas-direct--placeholder');
        const loadedCanvases = document.querySelectorAll('.canvas-direct--loaded');
        
        console.log('Placeholder canvases:', placeholderCanvases.length);
        console.log('Loaded canvases:', loadedCanvases.length);
        
        // Log performance report
        if (window.multiCanvasPerformanceMonitor) {
          window.multiCanvasPerformanceMonitor.logPerformanceReport();
        } else {
          console.warn('⚠️ Multi-Canvas Performance Monitor not available');
        }
        
        console.log('✅ Wrapper-free implementation test completed!');
        
        // Cleanup
        observer.disconnect();
        
      }).catch(error => {
        console.error('❌ Failed to navigate to previous canvas:', error);
      });
    }).catch(error => {
      console.error('❌ Failed to navigate to next canvas:', error);
    });
    
  }).catch(error => {
    console.error('❌ Failed to load course canvases:', error);
  });
}

// Performance comparison function
function compareWrapperApproaches() {
  console.log('⚖️ Wrapper Removal Performance Comparison');
  
  const currentTime = performance.now();
  
  // Test current approach (if any wrappers exist)
  const wrappers = document.querySelectorAll('.canvas-wrapper');
  const wrapperTime = performance.now();
  
  // Test wrapper-free approach
  const directCanvases = document.querySelectorAll('.canvas-direct');
  const directTime = performance.now();
  
  console.log('Performance Comparison:', {
    wrapperElements: wrappers.length,
    directCanvasElements: directCanvases.length,
    domNodesReduction: `${((wrappers.length * 2 - directCanvases.length) / (wrappers.length * 2) * 100).toFixed(1)}%`,
    testTime: `${(directTime - currentTime).toFixed(2)}ms`
  });
  
  // Memory comparison
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`
    });
  }
}

// Implementation verification function
function verifyWrapperFreeImplementation() {
  console.log('🔍 Verifying Wrapper-Free Implementation...');
  
  const checks = [
    {
      name: 'Grid Container Exists',
      test: () => !!document.getElementById('canvas-grid-container'),
      pass: '✅ Grid container found',
      fail: '❌ Grid container not found'
    },
    {
      name: 'No Wrapper Elements',
      test: () => document.querySelectorAll('.canvas-wrapper').length === 0,
      pass: '✅ No wrapper elements found',
      fail: '❌ Wrapper elements still exist'
    },
    {
      name: 'Direct Canvas Elements',
      test: () => document.querySelectorAll('.canvas-direct').length > 0,
      pass: '✅ Direct canvas elements found',
      fail: '❌ No direct canvas elements found'
    },
    {
      name: 'CSS Grid Layout',
      test: () => {
        const container = document.getElementById('canvas-grid-container');
        if (!container) return false;
        const style = window.getComputedStyle(container);
        return style.display === 'grid';
      },
      pass: '✅ CSS Grid layout active',
      fail: '❌ CSS Grid layout not active'
    },
    {
      name: 'Canvas API Ready',
      test: () => window.canvasAPI && window.canvasAPI.isReady(),
      pass: '✅ Canvas API ready',
      fail: '❌ Canvas API not ready'
    }
  ];
  
  checks.forEach(check => {
    try {
      const result = check.test();
      console.log(result ? check.pass : check.fail, '-', check.name);
    } catch (error) {
      console.log('❌ Error testing', check.name, ':', error);
    }
  });
  
  const passedChecks = checks.filter(check => {
    try {
      return check.test();
    } catch {
      return false;
    }
  }).length;
  
  console.log(`\n📊 Implementation Status: ${passedChecks}/${checks.length} checks passed`);
  
  if (passedChecks === checks.length) {
    console.log('🎉 Wrapper-free implementation is fully functional!');
  } else {
    console.log('⚠️ Some checks failed - implementation may need fixes');
  }
}

// Auto-run test if canvas is ready
if (window.canvasAPI && window.canvasAPI.isReady()) {
  testWrapperFreeImplementation();
} else {
  console.log('⏳ Waiting for canvas to be ready...');
  // Wait for canvas to be ready
  const checkInterval = setInterval(() => {
    if (window.canvasAPI && window.canvasAPI.isReady()) {
      clearInterval(checkInterval);
      testWrapperFreeImplementation();
    }
  }, 1000);
}

// Expose test functions globally
window.testWrapperFreeImplementation = testWrapperFreeImplementation;
window.compareWrapperApproaches = compareWrapperApproaches;
window.verifyWrapperFreeImplementation = verifyWrapperFreeImplementation;
