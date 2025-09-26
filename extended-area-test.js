console.log("🎯 Extended Working Area Debug Tool");

// Test extended working area functionality
window.testExtendedArea = function() {
    console.log("🧪 Testing Extended Working Area...");
    
    const canvasAPI = window.canvasAPI;
    if (!canvasAPI || !canvasAPI.isReady()) {
        console.log("❌ Canvas not ready");
        return;
    }
    
    const app = canvasAPI.getApp();
    if (!app) {
        console.log("❌ PIXI app not available");
        return;
    }
    
    console.log("📊 Current Canvas Dimensions:");
    console.log("PIXI App Screen:", { 
        width: app.screen.width, 
        height: app.screen.height 
    });
    console.log("Hit Area:", {
        x: app.stage.hitArea.x,
        y: app.stage.hitArea.y,
        width: app.stage.hitArea.width,
        height: app.stage.hitArea.height
    });
    
    // Import pasteboard manager dynamically
    import('/src/scripts/coursebuilder/canvas/PasteboardManager.ts').then(module => {
        const pasteboardManager = module.pasteboardManager;
        const debugInfo = pasteboardManager.getDebugInfo();
        
        console.log("📋 Pasteboard Debug Info:", debugInfo);
        
        // Test points
        const testPoints = [
            { x: 900, y: 1350, name: "Canvas center" },
            { x: 300, y: 450, name: "Canvas area" },
            { x: 100, y: 450, name: "Left pasteboard" },
            { x: 1700, y: 1350, name: "Right pasteboard" },
            { x: 900, y: 200, name: "Top pasteboard" },
            { x: 900, y: 2500, name: "Bottom pasteboard" }
        ];
        
        console.log("🎯 Point Testing:");
        testPoints.forEach(point => {
            const inCanvas = pasteboardManager.isPointInCanvas(point.x, point.y);
            const inPasteboard = pasteboardManager.isPointInPasteboard(point.x, point.y);
            console.log(`${point.name} (${point.x}, ${point.y}): Canvas=${inCanvas}, Pasteboard=${inPasteboard}`);
        });
        
        const expectedCanvas = { width: 1200, height: 1800 };
        const expectedPasteboard = { width: 1800, height: 2700 };
        
        console.log("✅ Expected vs Actual:");
        console.log("Canvas should be:", expectedCanvas);
        console.log("Pasteboard should be:", expectedPasteboard);
        console.log("PIXI app screen:", { width: app.screen.width, height: app.screen.height });
        
        const success = app.screen.width === expectedPasteboard.width && 
                       app.screen.height === expectedPasteboard.height;
        
        if (success) {
            console.log("🎉 SUCCESS! Extended working area is active!");
            console.log("You should now be able to draw outside the 1200x1800 canvas area.");
        } else {
            console.log("❌ Extended working area not properly configured");
        }
    });
};

// Auto-run test after a short delay
setTimeout(() => {
    console.log("🚀 Auto-running extended area test...");
    window.testExtendedArea();
}, 3000);

console.log("Run window.testExtendedArea() to test the extended working area");