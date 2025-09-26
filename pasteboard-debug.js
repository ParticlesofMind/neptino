// Pasteboard Debug Console Commands
// Open browser console and run these commands

console.log("🎯 Pasteboard Debug Tools Loaded");

// Command 1: Check current hit area
window.checkHitArea = function() {
    const app = window.canvasAPI?.getApp();
    if (!app) {
        console.log("❌ Canvas not ready");
        return;
    }
    
    const hitArea = app.stage.hitArea;
    const screen = app.screen;
    
    console.log("📐 Current Hit Area Status:");
    console.log("Screen:", { width: screen.width, height: screen.height });
    console.log("Hit Area:", { 
        x: hitArea.x, 
        y: hitArea.y, 
        width: hitArea.width, 
        height: hitArea.height 
    });
    console.log("Extended?", hitArea.width > screen.width || hitArea.height > screen.height);
    
    return { screen, hitArea };
};

// Command 2: Force update hit area
window.forceExtendHitArea = function() {
    const app = window.canvasAPI?.getApp();
    if (!app) {
        console.log("❌ Canvas not ready");
        return;
    }
    
    // Import pasteboard manager
    import('/src/scripts/coursebuilder/canvas/PasteboardManager.ts').then(module => {
        const pasteboardManager = module.pasteboardManager;
        const newHitArea = pasteboardManager.getExtendedHitArea();
        
        console.log("🔄 Updating hit area from:", app.stage.hitArea);
        console.log("🔄 Updating hit area to:", newHitArea);
        
        app.stage.hitArea = newHitArea;
        
        console.log("✅ Hit area updated! Try drawing outside canvas now.");
    });
};

// Command 3: Test drawing boundaries
window.testDrawingBounds = function() {
    import('/src/scripts/coursebuilder/canvas/PasteboardManager.ts').then(module => {
        const pasteboardManager = module.pasteboardManager;
        
        const testPoints = [
            { x: 600, y: 900, name: "Canvas center" },
            { x: 0, y: 0, name: "Canvas top-left" },
            { x: 1200, y: 1800, name: "Canvas bottom-right" },
            { x: -100, y: 900, name: "Left of canvas" },
            { x: 1300, y: 900, name: "Right of canvas" },
            { x: 600, y: -100, name: "Above canvas" },
            { x: 600, y: 1900, name: "Below canvas" }
        ];
        
        console.log("🎯 Testing drawing boundary points:");
        testPoints.forEach(point => {
            const inCanvas = pasteboardManager.isPointInCanvas(point.x, point.y);
            const inPasteboard = pasteboardManager.isPointInPasteboard(point.x, point.y);
            console.log(`${point.name} (${point.x}, ${point.y}): Canvas=${inCanvas}, Pasteboard=${inPasteboard}`);
        });
    });
};

// Command 4: Get full debug info
window.pasteboardDebug = function() {
    import('/src/scripts/coursebuilder/canvas/PasteboardManager.ts').then(module => {
        const pasteboardManager = module.pasteboardManager;
        const info = pasteboardManager.getDebugInfo();
        console.log("📋 Full Pasteboard Debug Info:", info);
        return info;
    });
};

console.log("Available commands:");
console.log("- checkHitArea() - Check current PIXI hit area");
console.log("- forceExtendHitArea() - Force update to extended hit area");
console.log("- testDrawingBounds() - Test point boundaries");
console.log("- pasteboardDebug() - Full debug info");