// Simple verification script to check tool integration
console.log('=== Tool Integration Check ===');

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('1. Checking tool selection buttons...');
  
  const toolButtons = document.querySelectorAll('[data-tool]');
  console.log(`   Found ${toolButtons.length} tool buttons:`);
  
  toolButtons.forEach(button => {
    const toolName = button.dataset.tool;
    console.log(`   - ${toolName} tool button`);
  });

  console.log('\n2. Checking tool settings panels...');
  
  const toolSettings = document.querySelectorAll('.tool-settings');
  console.log(`   Found ${toolSettings.length} tool settings panels:`);
  
  toolSettings.forEach(settings => {
    const toolName = settings.dataset.tool;
    console.log(`   - ${toolName} settings panel`);
  });

  console.log('\n3. Checking for ToolStateManager...');
  
  // Check if ToolStateManager is available globally
  if (window.courseBuilderCanvasInstance) {
    console.log('   ✅ CourseBuilderCanvas instance found');
    const managers = window.courseBuilderCanvasInstance.getManagers();
    if (managers.toolStateManager) {
      console.log('   ✅ ToolStateManager found');
      console.log(`   Current tool: ${managers.toolStateManager.getCurrentTool()}`);
    } else {
      console.log('   ❌ ToolStateManager not found');
    }
  } else {
    console.log('   ❌ CourseBuilderCanvas instance not found');
  }

  console.log('\n4. Testing tool selection...');
  
  // Test clicking on each tool
  toolButtons.forEach((button, index) => {
    setTimeout(() => {
      console.log(`   Testing ${button.dataset.tool} tool selection...`);
      button.click();
      
      // Check if corresponding settings panel is visible
      setTimeout(() => {
        const activeSettings = document.querySelector('.tool-settings--active');
        if (activeSettings) {
          console.log(`   ✅ ${activeSettings.dataset.tool} settings panel is active`);
        } else {
          console.log(`   ❌ No active settings panel found`);
        }
      }, 100);
    }, index * 500);
  });
});
