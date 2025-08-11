// Debug script to test navigation issue
console.log('🔍 Debug Navigation Script Loaded');

// Function to check current state
function debugNavigationState() {
  console.log('🔍 === NAVIGATION DEBUG STATE ===');
  
  const sections = ['setup', 'create', 'preview', 'launch'];
  const hash = window.location.hash.substring(1);
  
  console.log(`🔍 Current hash: "${hash}"`);
  console.log(`🔍 URL: ${window.location.href}`);
  
  sections.forEach(sectionId => {
    const element = document.getElementById(sectionId);
    if (element) {
      const hasActive = element.classList.contains('section--active');
      const computedStyle = window.getComputedStyle(element);
      const isVisible = computedStyle.display !== 'none';
      
      console.log(`🔍 Section ${sectionId}:`, {
        exists: true,
        hasActiveClass: hasActive,
        display: computedStyle.display,
        isVisible: isVisible,
        classList: Array.from(element.classList)
      });
    } else {
      console.log(`🔍 Section ${sectionId}: NOT FOUND`);
    }
  });
  
  // Check navigation instances
  console.log(`🔍 Navigation instances count: ${window.CourseBuilderNavigation?.instanceCount || 'unknown'}`);
}

// Test manual navigation
function testManualNavigation(targetSection) {
  console.log(`🧪 Testing manual navigation to: ${targetSection}`);
  
  const sections = ['setup', 'create', 'preview', 'launch'];
  
  // Hide all sections
  sections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('section--active');
      console.log(`🧪 Removed active class from: ${sectionId}`);
    }
  });
  
  // Show target section
  const activeSection = document.getElementById(targetSection);
  if (activeSection) {
    activeSection.classList.add('section--active');
    console.log(`🧪 Added active class to: ${targetSection}`);
    
    // Update hash
    window.location.hash = targetSection;
    
    // Check result
    setTimeout(() => {
      debugNavigationState();
    }, 100);
  } else {
    console.error(`🧪 Target section not found: ${targetSection}`);
  }
}

// Expose functions globally for testing
window.debugNavigationState = debugNavigationState;
window.testManualNavigation = testManualNavigation;

// Run initial debug
setTimeout(() => {
  debugNavigationState();
}, 1000);

console.log('🔍 Debug functions available: debugNavigationState(), testManualNavigation(section)');
