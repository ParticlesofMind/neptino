// Simple standalone test to verify ToolManager works
import { ToolManager } from './src/scripts/coursebuilder/tools/ToolManager.js';

console.log('🧪 Starting ToolManager standalone test...');

try {
  const toolManager = new ToolManager();
  console.log('✅ ToolManager created successfully');
  
  console.log('🔧 Testing tool activation...');
  const penResult = toolManager.setActiveTool('pen');
  console.log('Pen tool result:', penResult);
  
  const brushResult = toolManager.setActiveTool('brush');
  console.log('Brush tool result:', brushResult);
  
  const selectionResult = toolManager.setActiveTool('selection');
  console.log('Selection tool result:', selectionResult);
  
  console.log('Current active tool:', toolManager.getActiveToolName());
  
} catch (error) {
  console.error('❌ ToolManager test failed:', error);
}
