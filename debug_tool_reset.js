// Debug Tool Reset - Force reset tool system when it gets stuck
// Run this in browser console when tools get into unreliable state

window.forceResetToolSystem = () => {
    console.log('🔄 === FORCE RESETTING TOOL SYSTEM ===');
    
    const canvasAPI = window.canvasAPI;
    if (!canvasAPI) {
        console.error('❌ Canvas API not found');
        return;
    }
    
    const toolManager = canvasAPI.toolManager;
    if (!toolManager) {
        console.error('❌ Tool Manager not found');
        return;
    }
    
    console.log('📊 Current state before reset:');
    console.log('- Active tool:', toolManager.getActiveToolName());
    
    // Get all tools and log their states
    const tools = toolManager.tools;
    console.log('- Tool states:');
    tools.forEach((tool, name) => {
        console.log(`  ${name}: isActive = ${tool.isActive}`);
    });
    
    console.log('\n🔄 Performing reset...');
    
    // Force deactivate all tools
    tools.forEach((tool, name) => {
        if (tool.isActive) {
            console.log(`⏹️ Force deactivating ${name}`);
            tool.onDeactivate();
        }
    });
    
    // Force activate the selection tool
    const selectionTool = tools.get('selection');
    if (selectionTool) {
        console.log('▶️ Force activating selection tool');
        toolManager.activeTool = selectionTool;
        selectionTool.onActivate();
    }
    
    console.log('\n📊 State after reset:');
    console.log('- Active tool:', toolManager.getActiveToolName());
    tools.forEach((tool, name) => {
        console.log(`  ${name}: isActive = ${tool.isActive}`);
    });
    
    // Update UI to match
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach(button => {
        button.classList.remove('active');
    });
    const selectionButton = document.querySelector('[data-tool="selection"]');
    if (selectionButton) {
        selectionButton.classList.add('active');
    }
    
    console.log('✅ Tool system reset complete');
};

window.debugToolState = () => {
    console.log('🔍 === TOOL STATE DEBUG ===');
    
    const canvasAPI = window.canvasAPI;
    if (!canvasAPI) {
        console.error('❌ Canvas API not found');
        return;
    }
    
    const toolManager = canvasAPI.toolManager;
    if (!toolManager) {
        console.error('❌ Tool Manager not found');
        return;
    }
    
    console.log('📊 Tool Manager State:');
    console.log('- Active tool name:', toolManager.getActiveToolName());
    console.log('- Active tool object:', toolManager.getActiveTool());
    
    const tools = toolManager.tools;
    console.log('\n📋 Individual Tool States:');
    tools.forEach((tool, name) => {
        console.log(`- ${name}:`);
        console.log(`  isActive: ${tool.isActive}`);
        console.log(`  cursor: ${tool.cursor}`);
        if (name === 'selection') {
            const selectionTool = tool;
            console.log(`  selectedObjects: ${selectionTool.getSelectedObjects?.()?.length || 'N/A'}`);
            console.log(`  isTransforming: ${selectionTool.state?.isTransforming || 'N/A'}`);
        }
    });
    
    console.log('\n🖱️ Canvas Cursor:', document.querySelector('#canvas-container canvas')?.style.cursor || 'not set');
    
    console.log('🔍 === DEBUG COMPLETE ===');
};

console.log('🛠️ Debug functions loaded:');
console.log('- window.forceResetToolSystem() - Force reset when tools get stuck');
console.log('- window.debugToolState() - Show current tool state');
