/**
 * GSAP Animation System Examples
 * Comprehensive examples showing how to use the enhanced animation capabilities
 */

import { Container, Graphics, Text, Point } from 'pixi.js';
import { Scene } from './Scene';
import { GSAPAnimationManager, createGSAPScene } from './GSAPAnimationManager';

/**
 * Example 1: Basic Scene Creation with GSAP
 */
export function createBasicGSAPExample(): { scene: Scene; gsap: GSAPAnimationManager } {
  // Method 1: Create new scene with GSAP
  const { scene, gsap } = createGSAPScene(
    { x: 100, y: 100, width: 480, height: 270 },
    'example-scene-1'
  );

  // Method 2: Enhance existing scene
  // const scene = new Scene({ x: 100, y: 100, width: 480, height: 270 });
  // const gsap = enhanceSceneWithGSAP(scene);

  return { scene, gsap };
}

/**
 * Example 2: Path Animation with Different Easings
 */
export function createPathAnimationExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 200, y: 150, width: 600, height: 400 });

  // Create a simple object to animate
  const circle = new Graphics();
  circle.circle(0, 0, 20);
  circle.fill({ color: 0xff6b6b });
  scene.addObject(circle);

  // Define animation path
  const pathPoints = [
    new Point(-200, -100),  // Start (scene-relative coordinates)
    new Point(-100, 0),
    new Point(0, -80),
    new Point(100, 0),
    new Point(200, 100)     // End
  ];

  // Create path animation with bounce easing
  gsap.animateObjectAlongPath(circle, pathPoints, {
    duration: 3,
    ease: 'bounce.out',
    autoRotate: true,  // Object rotates along path
    onComplete: () => console.log('Path animation completed!')
  });

  // Enable GSAP control and play
  gsap.play();
}

/**
 * Example 3: Staggered Entrance Animations
 */
export function createStaggeredEntranceExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 300, y: 200, width: 500, height: 300 });

  // Create multiple objects
  const objects: Container[] = [];
  for (let i = 0; i < 5; i++) {
    const rect = new Graphics();
    rect.rect(-25, -15, 50, 30);
    rect.fill({ color: [0x4ecdc4, 0x44a08d, 0x96ceb4, 0xfeca57, 0xff9ff3][i] });
    rect.position.set(i * 80 - 160, 0); // Space them out horizontally
    scene.addObject(rect);
    objects.push(rect);
  }

  // Create bouncy entrance with stagger
  gsap.createEntranceAnimation(objects, 'bounce', {
    stagger: 0.2,      // 0.2 second delay between each object
    duration: 1.5,
    from: 'start'      // Start from first object
  });

  gsap.play();
}

/**
 * Example 4: Property Animations with Filters
 */
export function createPropertyAnimationExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 150, y: 100, width: 400, height: 300 });

  // Create text object
  const text = new Text({
    text: 'GSAP Enhanced!',
    style: {
      fontSize: 32,
      fill: 0xffffff,
      fontWeight: 'bold'
    }
  });
  text.anchor.set(0.5);
  scene.addObject(text);

  // Animate multiple properties
  gsap.animateObjectProperties(text, {
    scale: 1.5,
    rotation: Math.PI * 0.25, // 45 degrees
    alpha: 0.8,
    blur: 2,
    brightness: 1.2,
    duration: 2,
    ease: 'elastic.out(1, 0.3)',
    yoyo: true,
    repeat: -1, // Infinite repeat
    onUpdate: () => {
      // Custom update logic
      console.log('Animation progress:', gsap.getTime());
    }
  });

  gsap.play();
}

/**
 * Example 5: Multiple Objects with Different Paths
 */
export function createMultiplePathsExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 250, y: 180, width: 600, height: 400 });

  // Create objects
  const objects: Container[] = [];
  const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xfeca57];
  
  for (let i = 0; i < 3; i++) {
    const shape = new Graphics();
    shape.circle(0, 0, 15);
    shape.fill({ color: colors[i] });
    scene.addObject(shape);
    objects.push(shape);
  }

  // Create different paths for each object
  const pathsArray: Point[][] = [
    // Path 1: Circular
    [
      new Point(-150, 0),
      new Point(-75, -75),
      new Point(0, -100),
      new Point(75, -75),
      new Point(150, 0),
      new Point(75, 75),
      new Point(0, 100),
      new Point(-75, 75),
      new Point(-150, 0)
    ],
    // Path 2: Wave
    [
      new Point(-200, 50),
      new Point(-100, -50),
      new Point(0, 50),
      new Point(100, -50),
      new Point(200, 50)
    ],
    // Path 3: Zigzag
    [
      new Point(-180, -80),
      new Point(-60, 80),
      new Point(60, -80),
      new Point(180, 80)
    ]
  ];

  // Create staggered path animations
  gsap.staggerObjectsAlongPaths(objects, pathsArray, {
    stagger: 0.5,
    duration: 4,
    ease: 'power2.inOut',
    from: 'center' // Start from center object
  });

  gsap.play();
}

/**
 * Example 6: Complex Timeline with Mixed Animations
 */
export function createComplexTimelineExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 100, y: 50, width: 700, height: 500 });

  // Create title
  const title = new Text({
    text: 'Complex Animation',
    style: { fontSize: 28, fill: 0xffffff, fontWeight: 'bold' }
  });
  title.anchor.set(0.5);
  title.position.set(0, -200);
  scene.addObject(title);

  // Create animated objects
  const circles: Container[] = [];
  for (let i = 0; i < 4; i++) {
    const circle = new Graphics();
    circle.circle(0, 0, 20);
    circle.fill({ color: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4][i] });
    circle.position.set(i * 100 - 150, 50);
    scene.addObject(circle);
    circles.push(circle);
  }

  // Get direct access to GSAP timeline for advanced control
  const timeline = gsap.getGSAPTimeline();

  // Add title entrance
  timeline.from(title, {
    scale: 0,
    alpha: 0,
    duration: 1,
    ease: 'back.out(1.7)'
  }, 0);

  // Add circles with staggered entrance
  timeline.from(circles, {
    y: '+=200',
    alpha: 0,
    scale: 0,
    duration: 0.8,
    ease: 'bounce.out',
    stagger: 0.15
  }, 0.5);

  // Add path animations for circles
  circles.forEach((circle, index) => {
    const path = [
      new Point(circle.position.x, circle.position.y),
      new Point(Math.sin(index) * 100, Math.cos(index) * 100),
      new Point(circle.position.x, circle.position.y)
    ];
    
    timeline.add(gsap.animateObjectAlongPath(circle, path, {
      duration: 2,
      ease: 'power2.inOut',
      autoRotate: true
    }), 2);
  });

  // Add title exit animation
  timeline.to(title, {
    scale: 0,
    alpha: 0,
    duration: 1,
    ease: 'power2.in'
  }, 4);

  gsap.play();
}

/**
 * Example 7: Interactive Controls
 */
export function createInteractiveExample(): { scene: Scene; gsap: GSAPAnimationManager; controls: any } {
  const { scene, gsap } = createGSAPScene({ x: 400, y: 300, width: 500, height: 350 });

  // Create object to control
  const controllableObject = new Graphics();
  controllableObject.rect(-30, -20, 60, 40);
  controllableObject.fill({ color: 0xff6b6b });
  scene.addObject(controllableObject);

  // Create control interface
  const controls = {
    // Play/pause controls
    play: () => gsap.play(),
    pause: () => gsap.pause(),
    
    // Time controls
    setTime: (t: number) => gsap.setTime(t),
    getTime: () => gsap.getTime(),
    
    // Animation controls
    animateToPosition: (x: number, y: number) => {
      gsap.createCustomAnimation(controllableObject, {
        x: x,
        y: y,
        duration: 1,
        ease: 'power2.out'
      });
    },
    
    // Property controls
    animateScale: (scale: number) => {
      gsap.animateObjectProperties(controllableObject, {
        scale: scale,
        duration: 0.5,
        ease: 'back.out(1.7)'
      });
    },
    
    // Easing options
    getAvailableEasings: () => GSAPAnimationManager.getAvailableEasings(),
    
    // Direct GSAP access
    getTimeline: () => gsap.getGSAPTimeline(),
    
    // Cleanup
    destroy: () => gsap.destroy()
  };

  return { scene, gsap, controls };
}

/**
 * Example 8: Educational Animation Sequence
 */
export function createEducationalExample(): void {
  const { scene, gsap } = createGSAPScene({ x: 200, y: 100, width: 600, height: 400 });

  // Create educational elements
  const diagram = new Container();
  
  // Central concept
  const centerCircle = new Graphics();
  centerCircle.circle(0, 0, 40);
  centerCircle.fill({ color: 0x3498db });
  diagram.addChild(centerCircle);
  
  const centerLabel = new Text({
    text: 'Main Concept',
    style: { fontSize: 14, fill: 0xffffff, align: 'center' }
  });
  centerLabel.anchor.set(0.5);
  centerCircle.addChild(centerLabel);

  // Surrounding concepts
  const concepts: Container[] = [];
  const conceptTexts = ['Idea 1', 'Idea 2', 'Idea 3', 'Idea 4'];
  
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const concept = new Graphics();
    concept.circle(0, 0, 25);
    concept.fill({ color: 0xe74c3c });
    
    const label = new Text({
      text: conceptTexts[i],
      style: { fontSize: 12, fill: 0xffffff, align: 'center' }
    });
    label.anchor.set(0.5);
    concept.addChild(label);
    
    // Position around center
    concept.position.set(
      Math.cos(angle) * 120,
      Math.sin(angle) * 120
    );
    
    diagram.addChild(concept);
    concepts.push(concept);
  }

  scene.addObject(diagram);

  // Create educational animation sequence
  const timeline = gsap.getGSAPTimeline();
  
  // 1. Main concept appears
  timeline.from(centerCircle, {
    scale: 0,
    alpha: 0,
    duration: 1,
    ease: 'back.out(1.7)'
  }, 0);
  
  // 2. Concepts fly in from center with stagger
  concepts.forEach((concept, index) => {
    timeline.from(concept, {
      x: 0,
      y: 0,
      scale: 0,
      alpha: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, 1 + index * 0.2);
  });
  
  // 3. Pulsing effect for emphasis
  timeline.to([centerCircle, ...concepts], {
    scale: 1.1,
    duration: 0.3,
    ease: 'power2.inOut',
    yoyo: true,
    repeat: 2
  }, 3);

  // 4. Connection lines appear (simulated with alpha animation)
  timeline.to(diagram, {
    alpha: 1,
    duration: 0.5
  }, 4);

  gsap.play();
}

// Export all examples for easy access
export const GSAPExamples = {
  createBasicGSAPExample,
  createPathAnimationExample,
  createStaggeredEntranceExample,
  createPropertyAnimationExample,
  createMultiplePathsExample,
  createComplexTimelineExample,
  createInteractiveExample,
  createEducationalExample
};