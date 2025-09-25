console.log('🔍 Canvas Analysis Starting...');

// Wait for canvas system to be ready
if (typeof window !== 'undefined') {
    const checkCanvas = () => {
        const canvas = document.querySelector('#pixi-canvas');
        const container = document.querySelector('#canvas-container');
        const canvasAPI = window.canvasAPI;
        const marginManager = window.canvasMarginManager;
        
        if (!canvas) {
            console.log('❌ Canvas element not found');
            return false;
        }
        
        if (!canvasAPI || !canvasAPI.isReady()) {
            console.log('⏳ Canvas API not ready yet...');
            return false;
        }
        
        console.log('✅ Canvas system ready! Analyzing...');
        
        // CANVAS ELEMENT ANALYSIS
        const canvasRect = canvas.getBoundingClientRect();
        const canvasStyle = window.getComputedStyle(canvas);
        
        console.log('📐 Canvas Element (#pixi-canvas):');
        console.log(`  • HTML dimensions: ${canvas.width} × ${canvas.height}`);
        console.log(`  • CSS dimensions: ${canvasStyle.width} × ${canvasStyle.height}`);
        console.log(`  • Bounding rect: ${canvasRect.width.toFixed(2)} × ${canvasRect.height.toFixed(2)}`);
        console.log(`  • Position: ${canvasRect.left.toFixed(2)}, ${canvasRect.top.toFixed(2)}`);
        
        // CONTAINER ANALYSIS
        if (container) {
            const containerRect = container.getBoundingClientRect();
            const containerStyle = window.getComputedStyle(container);
            
            console.log('📦 Container Element (#canvas-container):');
            console.log(`  • CSS dimensions: ${containerStyle.width} × ${containerStyle.height}`);
            console.log(`  • Bounding rect: ${containerRect.width.toFixed(2)} × ${containerRect.height.toFixed(2)}`);
            console.log(`  • Position: ${containerRect.left.toFixed(2)}, ${containerRect.top.toFixed(2)}`);
            console.log(`  • Overflow: ${containerStyle.overflow}`);
        }
        
        // PIXI APPLICATION ANALYSIS
        const app = canvasAPI.getApp();
        if (app) {
            const screen = app.screen || app.renderer.screen;
            console.log('🎨 PIXI Application:');
            console.log(`  • Screen dimensions: ${screen.width} × ${screen.height}`);
            console.log(`  • Resolution: ${app.renderer.resolution}`);
            console.log(`  • Device pixel ratio: ${window.devicePixelRatio}`);
        }
        
        // MARGIN ANALYSIS
        if (marginManager) {
            const margins = marginManager.getMargins();
            console.log('📏 Margins (Blue Lines):');
            console.log(`  • Top: ${margins.top}px`);
            console.log(`  • Right: ${margins.right}px`);
            console.log(`  • Bottom: ${margins.bottom}px`);
            console.log(`  • Left: ${margins.left}px`);
            
            // Calculate content area
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const contentWidth = canvasWidth - margins.left - margins.right;
            const contentHeight = canvasHeight - margins.top - margins.bottom;
            
            console.log('📐 Content Area (inside margins):');
            console.log(`  • Canvas: ${canvasWidth} × ${canvasHeight}`);
            console.log(`  • Content: ${contentWidth} × ${contentHeight}`);
            console.log(`  • Content percentage: ${((contentWidth * contentHeight) / (canvasWidth * canvasHeight) * 100).toFixed(1)}%`);
            
            // Check what the blue margins actually cover
            console.log('🔵 Blue Margin Coverage:');
            console.log(`  • Top margin covers: 0 to ${margins.top}px (height: ${margins.top}px)`);
            console.log(`  • Left margin covers: 0 to ${margins.left}px (width: ${margins.left}px)`);
            console.log(`  • Right margin covers: ${canvasWidth - margins.right}px to ${canvasWidth}px (width: ${margins.right}px)`);
            console.log(`  • Bottom margin covers: ${canvasHeight - margins.bottom}px to ${canvasHeight}px (height: ${margins.bottom}px)`);
        }
        
        // EXPECTED VS ACTUAL
        const expectedWidth = 1200;
        const expectedHeight = 1800;
        
        console.log('🎯 Expected vs Actual:');
        console.log(`  • Expected canvas: ${expectedWidth} × ${expectedHeight}`);
        console.log(`  • Actual canvas: ${canvas.width} × ${canvas.height}`);
        console.log(`  • Width match: ${Math.abs(canvas.width - expectedWidth) < 10 ? '✅' : '❌'}`);
        console.log(`  • Height match: ${Math.abs(canvas.height - expectedHeight) < 10 ? '✅' : '❌'}`);
        
        // PIXEL AREA CALCULATION
        const actualPixelArea = canvas.width * canvas.height;
        const expectedPixelArea = expectedWidth * expectedHeight;
        console.log('📊 Pixel Area:');
        console.log(`  • Expected: ${expectedPixelArea.toLocaleString()} pixels`);
        console.log(`  • Actual: ${actualPixelArea.toLocaleString()} pixels`);
        console.log(`  • Difference: ${(actualPixelArea - expectedPixelArea).toLocaleString()} pixels`);
        
        // MARGIN GRAPHICS SEARCH
        try {
            let marginGraphics = null;
            if (app && app.stage) {
                const searchForMarginGraphics = (container) => {
                    if (container.children) {
                        for (const child of container.children) {
                            if (child.label === 'blue-margin-lines') {
                                return child;
                            }
                            const found = searchForMarginGraphics(child);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                
                marginGraphics = searchForMarginGraphics(app.stage);
            }
            
            if (marginGraphics) {
                console.log('🔵 Blue Margin Graphics Found:');
                console.log(`  • Position: ${marginGraphics.x}, ${marginGraphics.y}`);
                console.log(`  • Bounds: ${marginGraphics.getBounds().width.toFixed(2)} × ${marginGraphics.getBounds().height.toFixed(2)}`);
                console.log(`  • Visible: ${marginGraphics.visible}`);
                console.log(`  • Alpha: ${marginGraphics.alpha}`);
            } else {
                console.log('❌ Blue margin graphics not found in PIXI stage');
            }
        } catch (error) {
            console.log('❌ Error searching for margin graphics:', error);
        }
        
        return true;
    };
    
    // Try to check immediately, then retry periodically
    if (!checkCanvas()) {
        const interval = setInterval(() => {
            if (checkCanvas()) {
                clearInterval(interval);
            }
        }, 1000);
        
        // Stop trying after 10 seconds
        setTimeout(() => {
            clearInterval(interval);
            console.log('❌ Canvas analysis timed out');
        }, 10000);
    }
}