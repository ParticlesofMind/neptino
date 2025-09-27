/**
 * Coursebuilder Overflow Debug Script
 * 
 * Run this in the browser console on coursebuilder.html to identify
 * what's causing the excess whitespace and scrolling issues.
 */

(function() {
    'use strict';
    
    console.log('🔍 Starting Coursebuilder Overflow Debug...');
    
    // Create debug overlay
    const debugOverlay = document.createElement('div');
    debugOverlay.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 999999;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    // Basic stats
    const stats = {
        documentHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        bodyHeight: document.body.scrollHeight,
        canScroll: document.documentElement.scrollHeight > window.innerHeight,
        excessHeight: document.documentElement.scrollHeight - window.innerHeight
    };
    
    console.log('📊 Page Stats:', stats);
    
    // Find elements that extend beyond viewport
    const overflowElements = [];
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        
        // Check if element extends significantly beyond viewport
        if (rect.bottom > window.innerHeight + 50) {
            const elementInfo = {
                element: el,
                tag: el.tagName,
                id: el.id || 'no-id',
                classes: Array.from(el.classList).join('.') || 'no-classes',
                bottom: Math.round(rect.bottom),
                height: Math.round(rect.height),
                position: computedStyle.position,
                zIndex: computedStyle.zIndex,
                transform: computedStyle.transform,
                overflow: computedStyle.overflow,
                marginBottom: computedStyle.marginBottom,
                paddingBottom: computedStyle.paddingBottom
            };
            overflowElements.push(elementInfo);
        }
    });
    
    // Sort by how far they extend beyond viewport
    overflowElements.sort((a, b) => b.bottom - a.bottom);
    
    console.log('🚨 Elements extending beyond viewport:', overflowElements);
    
    // Check for specific problematic patterns
    const issues = [];
    
    // Check for layers panel positioning
    const layersPanel = document.querySelector('.engine__layers, #layers-panel-container');
    if (layersPanel) {
        const rect = layersPanel.getBoundingClientRect();
        const style = window.getComputedStyle(layersPanel);
        if (rect.bottom > window.innerHeight) {
            issues.push(`Layers Panel extends beyond viewport: bottom=${Math.round(rect.bottom)}px`);
        }
    }
    
    // Check body overflow settings
    const bodyStyle = window.getComputedStyle(document.body);
    const htmlStyle = window.getComputedStyle(document.documentElement);
    
    if (bodyStyle.overflow !== 'hidden') {
        issues.push(`Body overflow is "${bodyStyle.overflow}" (should be "hidden")`);
    }
    
    if (htmlStyle.overflow !== 'hidden') {
        issues.push(`HTML overflow is "${htmlStyle.overflow}" (should be "hidden")`);
    }
    
    // Check for elements with calc() heights that might be wrong
    allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.height.includes('calc(') && style.height.includes('vh')) {
            const rect = el.getBoundingClientRect();
            if (rect.height > window.innerHeight) {
                issues.push(`Element with calc() height is too tall: ${el.tagName}#${el.id || 'no-id'} (${Math.round(rect.height)}px)`);
            }
        }
    });
    
    // Display results in overlay
    debugOverlay.innerHTML = `
        <strong>🔍 Coursebuilder Overflow Debug</strong><br><br>
        
        <strong>📊 Stats:</strong><br>
        Document Height: ${stats.documentHeight}px<br>
        Viewport Height: ${stats.viewportHeight}px<br>
        Excess Height: ${stats.excessHeight}px<br>
        Can Scroll: ${stats.canScroll}<br><br>
        
        <strong>🚨 Issues Found (${issues.length}):</strong><br>
        ${issues.length ? issues.map(issue => `• ${issue}`).join('<br>') : 'None detected'}<br><br>
        
        <strong>📍 Elements Beyond Viewport (${overflowElements.length}):</strong><br>
        ${overflowElements.slice(0, 5).map(el => 
            `• ${el.tag}#${el.id}<br>
            &nbsp;&nbsp;Classes: .${el.classes}<br>
            &nbsp;&nbsp;Bottom: ${el.bottom}px (${el.bottom - window.innerHeight}px past viewport)<br>
            &nbsp;&nbsp;Height: ${el.height}px<br>
            &nbsp;&nbsp;Position: ${el.position}<br>
            &nbsp;&nbsp;Margin-bottom: ${el.marginBottom}<br>`
        ).join('<br>')}<br>
        
        <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
        <button onclick="highlightOverflowElements()" style="margin-top: 10px; margin-left: 5px; padding: 5px 10px; background: #4444ff; color: white; border: none; border-radius: 4px; cursor: pointer;">Highlight</button>
    `;
    
    // Function to highlight overflow elements
    window.highlightOverflowElements = function() {
        overflowElements.forEach(item => {
            item.element.style.outline = '3px solid red';
            item.element.style.backgroundColor = 'rgba(255,0,0,0.1)';
            
            // Add a label
            const label = document.createElement('div');
            label.style.cssText = `
                position: absolute;
                background: red;
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                font-family: monospace;
                z-index: 999999;
                top: 0;
                left: 0;
                pointer-events: none;
            `;
            label.textContent = `${item.tag}#${item.id} (${item.bottom}px)`;
            item.element.appendChild(label);
        });
    };
    
    document.body.appendChild(debugOverlay);
    
    // Also log to console for easy copy-paste
    console.log('📋 Debug Summary:');
    console.log('Issues:', issues);
    console.log('Overflow Elements:', overflowElements.slice(0, 10));
    
    // Return results for potential programmatic use
    return {
        stats,
        issues,
        overflowElements: overflowElements.slice(0, 10)
    };
})();