# GSAP Integration Guide for Neptino Animation System

## 🎯 Overview

This guide shows how to use the enhanced GSAP animation system in Neptino. The integration maintains full compatibility with your existing Scene.ts while adding powerful GSAP capabilities.

## 📦 Installation

GSAP is already installed. The system includes:
- **GSAP Core**: Main animation engine
- **PixiPlugin**: PIXI.js integration
- **MotionPathPlugin**: Advanced path animations

## 🚀 Quick Start

### Method 1: Create New GSAP-Enhanced Scene

```typescript
import { createGSAPScene } from './GSAPAnimationManager';

// Create scene with GSAP capabilities
const { scene, gsap } = createGSAPScene(
  { x: 100, y: 100, width: 480, height: 270 },
  'my-scene-id'
);

// Your scene works exactly like before
scene.addObject(myPixiObject);
scene.play();

// Plus new GSAP capabilities
gsap.animateObjectAlongPath(myPixiObject, pathPoints, {
  duration: 3,
  ease: 'bounce.out',
  autoRotate: true
});
```

### Method 2: Enhance Existing Scene

```typescript
import { enhanceSceneWithGSAP } from './GSAPAnimationManager';

// Use your existing scene
const scene = new Scene({ x: 100, y: 100, width: 480, height: 270 });
const gsap = enhanceSceneWithGSAP(scene);

// All existing functionality preserved
scene.addAnimationPath(objectId, points);
scene.play();

// Plus GSAP enhancements
gsap.createEntranceAnimation(objects, 'bounce');
```

## 🎨 Animation Capabilities

### 1. Path Animations

```typescript
// Basic path animation
gsap.animateObjectAlongPath(object, pathPoints, {
  duration: 2,
  ease: 'power2.inOut'
});

// Advanced path with rotation
gsap.animateObjectAlongPath(object, pathPoints, {
  duration: 3,
  ease: 'bounce.out',
  autoRotate: true,      // Object follows path rotation
  delay: 0.5,
  onComplete: () => console.log('Done!')
});
```

### 2. Property Animations

```typescript
// Transform properties
gsap.animateObjectProperties(object, {
  scale: 1.5,
  rotation: Math.PI,
  alpha: 0.7,
  duration: 2,
  ease: 'elastic.out(1, 0.3)'
});

// Filter effects
gsap.animateObjectProperties(object, {
  blur: 5,
  brightness: 1.2,
  contrast: 1.1,
  saturation: 0.8,
  duration: 1.5,
  ease: 'power2.inOut'
});
```

### 3. Entrance Animations

```typescript
// Bouncy entrance for multiple objects
gsap.createEntranceAnimation(objects, 'bounce', {
  stagger: 0.2,      // 0.2s delay between objects
  duration: 1.2,
  from: 'start'      // Animation order
});

// Available entrance types:
// 'fadeIn', 'scaleUp', 'slideIn', 'bounce', 'elastic'
```

### 4. Staggered Animations

```typescript
// Multiple objects with different paths
gsap.staggerObjectsAlongPaths(objects, pathsArray, {
  stagger: 0.3,
  duration: 4,
  ease: 'power2.inOut',
  from: 'center'     // Start from center object
});
```

## 🎛️ Timeline Control

### Basic Controls (Same as Before)

```typescript
// All existing Scene methods work
scene.play();
scene.pause();
scene.setTime(0.5);  // 50% through animation
scene.setDuration(5000); // 5 seconds
scene.setLoop(true);
```

### Enhanced GSAP Controls

```typescript
// GSAP-specific controls
gsap.play();           // Enable GSAP control mode
gsap.pause();
gsap.setTime(0.7);     // 70% through
gsap.enableGSAPControl();  // Switch to GSAP mode
gsap.disableGSAPControl(); // Return to native mode

// Advanced timeline access
const timeline = gsap.getGSAPTimeline();
timeline.reverse();    // Play backwards
timeline.timeScale(2); // 2x speed
```

## 🎨 Easing Options

### Available Easings

```typescript
const easings = GSAPAnimationManager.getAvailableEasings();
console.log(easings);
// Output:
// ['power1.in', 'power1.out', 'power1.inOut',
//  'power2.in', 'power2.out', 'power2.inOut',
//  'back.out(1.7)', 'bounce.out', 'elastic.out(1, 0.3)', ...]
```

### Easing Examples

```typescript
// Smooth and natural
ease: 'power2.inOut'

// Bouncy and playful
ease: 'bounce.out'

// Elastic spring effect
ease: 'elastic.out(1, 0.3)'

// Overshoot effect
ease: 'back.out(1.7)'
```

## 🛠️ Integration with Existing Tools

### Enhanced PathTool

```typescript
import { GSAPPathTool } from './tools/GSAPPathTool';

// Use instead of regular PathTool for GSAP features
const pathTool = new GSAPPathTool();

// Creates both native and GSAP animations
// Maintains compatibility with existing system
```

### Tool Integration

Your existing tools work unchanged:
- `TextTool.ts` - No changes needed
- `BrushTool.ts` - No changes needed  
- `ShapesTool.ts` - No changes needed
- Existing `PathTool.ts` - Still works

## 📚 Complete Examples

### Educational Animation

```typescript
function createLessonAnimation() {
  const { scene, gsap } = createGSAPScene({
    x: 200, y: 100, width: 600, height: 400
  });

  // Create lesson elements
  const title = createTitle("Lesson: GSAP Animations");
  const diagrams = createDiagrams();
  
  scene.addObject(title);
  diagrams.forEach(d => scene.addObject(d));

  // Lesson sequence
  const timeline = gsap.getGSAPTimeline();
  
  // 1. Title appears
  timeline.from(title, {
    scale: 0, alpha: 0, duration: 1, ease: 'back.out(1.7)'
  }, 0);
  
  // 2. Diagrams fly in with stagger
  timeline.from(diagrams, {
    y: 200, alpha: 0, duration: 0.8, 
    ease: 'power2.out', stagger: 0.2
  }, 1);
  
  // 3. Interactive elements pulse
  timeline.to(diagrams, {
    scale: 1.1, duration: 0.3, ease: 'power2.inOut',
    yoyo: true, repeat: 2
  }, 3);

  gsap.play();
}
```

### Interactive Demo

```typescript
function createInteractiveDemo() {
  const { scene, gsap } = createGSAPScene({
    x: 100, y: 100, width: 500, height: 350
  });

  const object = createDemoObject();
  scene.addObject(object);

  // Create interactive controls
  return {
    scene,
    gsap,
    controls: {
      bounceIn: () => gsap.createEntranceAnimation([object], 'bounce'),
      elasticScale: () => gsap.animateObjectProperties(object, {
        scale: 1.5, duration: 1, ease: 'elastic.out(1, 0.3)', 
        yoyo: true, repeat: 1
      }),
      smoothPath: (points: Point[]) => gsap.animateObjectAlongPath(object, points, {
        duration: 3, ease: 'power2.inOut', autoRotate: true
      }),
      addBlur: () => gsap.animateObjectProperties(object, {
        blur: 8, duration: 1.5, ease: 'power2.inOut'
      })
    }
  };
}
```

## 🔧 Performance Tips

### 1. Animation Optimization

```typescript
// Use fewer path points for GSAP (smoother curves)
const optimizedPoints = simplifyPathForGSAP(originalPoints, 6);

// Prefer GSAP for complex animations
gsap.animateObjectAlongPath(object, points, { ease: 'power2.inOut' });

// Use native Scene for simple linear animations
scene.addAnimationPath(objectId, points);
```

### 2. Memory Management

```typescript
// Clean up when done
gsap.clearAnimations();  // Clear all GSAP animations
gsap.destroy();          // Full cleanup

// Or use scene destruction (handles both)
scene.destroy();         // Cleans up GSAP automatically
```

## 🎯 Migration Guide

### From Existing Animations

```typescript
// Before: Manual requestAnimationFrame
this.startAnimationLoop();

// After: GSAP timeline control
gsap.play();

// Before: Linear interpolation
const position = this.interpolateAlongPath(points, t);

// After: GSAP MotionPath with easing
gsap.animateObjectAlongPath(object, points, { ease: 'power2.inOut' });
```

### Maintaining Compatibility

The system is designed for **zero breaking changes**:

- All existing `Scene.ts` methods work unchanged
- Existing animations continue to function
- UI controls remain compatible
- PathTool integration is seamless

## 🚀 Advanced Features

### Custom Timeline Control

```typescript
const timeline = gsap.getGSAPTimeline();

// Add custom animations to main timeline
timeline.to(object, { x: 100, duration: 1 }, 2); // Start at 2 seconds

// Create sub-timelines
const subTimeline = gsap.createCustomAnimation(object, {
  scale: 1.2, duration: 0.5, yoyo: true, repeat: 3
}, false); // Don't add to main timeline

// Add sub-timeline manually
timeline.add(subTimeline, 1);
```

### Filter Animation System

```typescript
// Animate multiple filter properties
gsap.animateObjectProperties(object, {
  blur: 3,           // BlurFilter
  brightness: 1.3,   // ColorMatrixFilter
  contrast: 1.2,     // ColorMatrixFilter  
  saturation: 0.7,   // ColorMatrixFilter
  duration: 2,
  ease: 'power2.inOut'
});
```

## 🎨 Educational Use Cases

Perfect for creating engaging educational content:

1. **Concept Introductions**: Bouncy entrance animations
2. **Process Demonstrations**: Smooth path animations with rotation
3. **Interactive Diagrams**: Hover effects and property animations
4. **Lesson Sequences**: Staggered reveals with timeline control
5. **Visual Emphasis**: Filter effects and elastic scaling

The enhanced animation system transforms static educational content into engaging, interactive experiences while maintaining the simplicity and reliability of your existing codebase.