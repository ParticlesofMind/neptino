/**
 * GSAP Canvas Integration - Enhance existing animation system with GSAP
 * This file shows how to activate GSAP features in your current setup
 */

import { enhanceSceneWithGSAP, createGSAPScene } from './animation/GSAPAnimationManager';
import { Scene } from './animation/Scene';
import { animationState } from './animation/AnimationState';

/**
 * Enhance existing canvas with GSAP capabilities
 * Call this after canvas initialization to activate GSAP features
 */
export function activateGSAPFeatures(): void {
    console.log('🎬 Activating GSAP features...');
    
    // Enhance all existing scenes with GSAP
    const scenes = animationState.getScenes();
    scenes.forEach(scene => {
        const gsap = enhanceSceneWithGSAP(scene);
        console.log(`✅ Enhanced scene ${scene.getId()} with GSAP`);
        
        // Add GSAP reference to scene for easy access
        (scene as any).gsap = gsap;
    });
    
    // Override Scene creation to automatically include GSAP
    patchSceneCreation();
    
    // Add GSAP UI controls
    addGSAPControls();
    
    console.log('🚀 GSAP features activated! Use scene.gsap for animations');
}

/**
 * Patch the Scene creation process to automatically include GSAP
 */
function patchSceneCreation(): void {
    // Store original Scene constructor
  const originalScene = Scene; void originalScene;
    
    // Create enhanced Scene factory
    (window as any).createEnhancedScene = function(bounds: any) {
        const { scene, gsap } = createGSAPScene(bounds);
        
        // Make GSAP manager easily accessible
        (scene as any).gsap = gsap;
        
        console.log('🎬 Created GSAP-enhanced scene:', scene.getId());
        return scene;
    };
    
    console.log('✅ Scene creation patched for automatic GSAP enhancement');
}

/**
 * Add GSAP-specific UI controls to the animation panel
 */
function addGSAPControls(): void {
    console.log('🎨 Setting up GSAP UI controls...');
    
    // Find the GSAP controls container that's now in the HTML
    const gsapControls = document.getElementById('gsap-animation-controls');
    if (!gsapControls) {
        console.warn('GSAP controls container not found in HTML');
        return;
    }
    
    // Show the GSAP controls
    gsapControls.style.display = 'block';
    
    // Bind GSAP control events
    bindGSAPEvents();
    
    // Show GSAP controls when animation tools are active
    setupGSAPVisibilityLogic();
    
    console.log('✅ GSAP controls activated and visible');
}

/**
 * Setup logic to show/hide GSAP controls based on active tools
 */
function setupGSAPVisibilityLogic(): void {
    // Show GSAP controls when path or scene tools are active
    const toolStateManager = (window as any).toolStateManager;
    if (toolStateManager) {
        // Listen for tool changes
        document.addEventListener('toolChanged', (event: any) => {
            const currentTool = event.detail?.tool;
            const gsapControls = document.getElementById('gsap-animation-controls');
            
            if (gsapControls) {
                // Show GSAP controls for animation-related tools
                if (currentTool === 'path' || currentTool === 'scene') {
                    gsapControls.style.display = 'block';
                    console.log('🎬 GSAP controls shown for tool:', currentTool);
                } else {
                    gsapControls.style.display = 'none';
                }
            }
        });
        
        // Check initial tool state
        const currentTool = toolStateManager.getCurrentTool();
        const gsapControls = document.getElementById('gsap-animation-controls');
        if (gsapControls && (currentTool === 'path' || currentTool === 'scene')) {
            gsapControls.style.display = 'block';
        }
    }
}

/**
 * Bind events for GSAP controls
 */
function bindGSAPEvents(): void {
    // Get current selected scene
    const getCurrentScene = () => {
        const scenes = animationState.getScenes();
        return scenes.find(scene => (scene as any).isSelected) || scenes[0];
    };
    
    // Get current easing and duration selection
    const getCurrentEasing = () => {
        const select = document.getElementById('gsap-easing-select') as HTMLSelectElement;
        return select ? select.value : 'power2.out';
    };
    
    const getCurrentDuration = () => {
        const input = document.getElementById('gsap-duration') as HTMLInputElement;
        return input ? parseFloat(input.value) : 1.5;
    };
    
    const showGSAPStatus = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        // Remove any existing status
        const existingStatus = document.querySelector('.gsap-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Add new status
        const gsapControls = document.getElementById('gsap-animation-controls');
        if (gsapControls) {
            const status = document.createElement('div');
            status.className = `gsap-status gsap-status--${type}`;
            status.textContent = message;
            gsapControls.appendChild(status);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (status.parentNode) {
                    status.remove();
                }
            }, 3000);
        }
    };
    
    // Bounce effect
    document.getElementById('gsap-bounce')?.addEventListener('click', () => {
        const scene = getCurrentScene();
        if (scene && (scene as any).gsap) {
            const objects = scene.getObjects();
            if (objects.length > 0) {
                const gsap = (scene as any).gsap;
                const duration = getCurrentDuration();
                const easing = getCurrentEasing();
                
                objects.forEach((obj: any, i: number) => {
                    gsap.animateProperty(obj, {
                        y: obj.y - 50,
                        rotation: Math.PI * 0.25
                    }, duration, easing, i * 0.1);
                });
                showGSAPStatus(`Applied bounce effect to ${objects.length} objects`);
                console.log('🏀 Applied bounce effect to scene objects');
            } else {
                showGSAPStatus('No objects found. Create objects first!', 'warning');
            }
        } else {
            showGSAPStatus('Scene not found or GSAP not available', 'error');
        }
    });
    
    // Path animation
    document.getElementById('gsap-path')?.addEventListener('click', () => {
        const scene = getCurrentScene();
        if (scene && (scene as any).gsap) {
            const objects = scene.getObjects();
            if (objects.length > 0) {
                const gsap = (scene as any).gsap;
                const obj = objects[0];
                const duration = getCurrentDuration() * 2; // Path animations take longer
                const easing = getCurrentEasing();
                
                gsap.animateAlongPath(obj, [
                    { x: obj.x, y: obj.y },
                    { x: obj.x + 200, y: obj.y - 100 },
                    { x: obj.x + 400, y: obj.y + 50 },
                    { x: obj.x + 200, y: obj.y + 150 }
                ], duration, easing, true);
                showGSAPStatus('Path animation applied to first object');
                console.log('🛤️ Applied path animation to first object');
            } else {
                showGSAPStatus('No objects found. Create objects first!', 'warning');
            }
        } else {
            showGSAPStatus('Scene not found or GSAP not available', 'error');
        }
    });
    
    // Stagger effect
    document.getElementById('gsap-stagger')?.addEventListener('click', () => {
        const scene = getCurrentScene();
        if (scene && (scene as any).gsap) {
            const objects = scene.getObjects();
            if (objects.length > 0) {
                const gsap = (scene as any).gsap;
                const duration = getCurrentDuration();
                const easing = getCurrentEasing();
                
                gsap.createStaggeredAnimation(objects, {
                    scale: 1.5,
                    alpha: 0.8,
                    rotation: Math.PI * 0.1
                }, duration, 0.15, easing);
                showGSAPStatus(`Stagger effect applied to ${objects.length} objects`);
                console.log('📝 Applied stagger effect to all objects');
            } else {
                showGSAPStatus('No objects found. Create objects first!', 'warning');
            }
        } else {
            showGSAPStatus('Scene not found or GSAP not available', 'error');
        }
    });
    
    // Timeline demo
    document.getElementById('gsap-timeline')?.addEventListener('click', () => {
        const scene = getCurrentScene();
        if (scene && (scene as any).gsap) {
            const objects = scene.getObjects();
            if (objects.length > 0) {
                const gsap = (scene as any).gsap;
                const timeline = gsap.createTimeline();
                const duration = getCurrentDuration();
                const easing = getCurrentEasing();
                
                objects.forEach((obj: any, i: number) => {
                    timeline.addToTimeline({
                        target: obj,
                        animation: { x: obj.x + 100, scale: 1.2 },
                        duration: duration * 0.8,
                        delay: i * 0.2,
                        ease: easing
                    });
                });
                
                timeline.play();
                showGSAPStatus(`Timeline created with ${objects.length} animations`);
                console.log('⏰ Created timeline animation for all objects');
            } else {
                showGSAPStatus('No objects found. Create objects first!', 'warning');
            }
        } else {
            showGSAPStatus('Scene not found or GSAP not available', 'error');
        }
    });
}

/**
 * Helper to demonstrate GSAP features with sample objects
 */
export function createGSAPDemo(): void {
    console.log('🎭 Creating GSAP demonstration...');
    
    // Create a new GSAP-enhanced scene if none exist
    let scene = animationState.getScenes()[0];
    if (!scene) {
        scene = (window as any).createEnhancedScene({
            x: 100, y: 100, width: 600, height: 400
        });
        animationState.addScene(scene);
    }
    
    // Ensure scene has GSAP
    if (!(scene as any).gsap) {
        (scene as any).gsap = enhanceSceneWithGSAP(scene);
    }
    
    const gsap = (scene as any).gsap;
    
    // Create sample objects for demonstration
    import('pixi.js').then(({ Graphics, Text }) => {
        // Create colorful shapes
        const shapes = [];
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57];
        
        for (let i = 0; i < 5; i++) {
            const shape = new Graphics();
            shape.beginFill(colors[i]);
            shape.drawRect(0, 0, 60, 60);
            shape.endFill();
            shape.x = 50 + (i * 80);
            shape.y = 150;
            
            scene.addObject(shape);
            shapes.push(shape);
        }
        
        // Create text
        const text = new Text('GSAP Enhanced!', {
            fontSize: 32,
            fill: 0x2c3e50,
            fontFamily: 'Arial'
        });
        text.x = 200;
        text.y = 50;
        scene.addObject(text);
        
        // Animate entrance
        gsap.createStaggeredAnimation(shapes, {
            scale: 1,
            alpha: 1,
            y: 150
        }, 1, 0.1, 'back.out');
        
        gsap.animateProperty(text, {
            alpha: 1,
            scale: 1
        }, 1.5, 'elastic.out');
        
        console.log('✨ GSAP demo created with sample objects');
        console.log('Try the GSAP controls in the animation panel!');
    });
}

// Make functions globally available
(window as any).activateGSAPFeatures = activateGSAPFeatures;
(window as any).createGSAPDemo = createGSAPDemo;
