/**
 * GSAP Animation Manager for Scene Enhancement
 * Adds GSAP capabilities to existing Scene instances via composition
 */

import { Container, Point, Graphics, Filter, ColorMatrixFilter, BlurFilter } from 'pixi.js';
import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Scene } from './Scene';

// Register GSAP plugins
gsap.registerPlugin(PixiPlugin, MotionPathPlugin);
PixiPlugin.registerPIXI({ Container, Graphics, Point });

export interface GSAPAnimationOptions {
  duration?: number;
  ease?: string;
  delay?: number;
  repeat?: number;
  yoyo?: boolean;
  onComplete?: () => void;
  onUpdate?: () => void;
}

export interface PropertyAnimationOptions extends GSAPAnimationOptions {
  scale?: number;
  rotation?: number;
  alpha?: number;
  blur?: number;
  tint?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export interface PathAnimationOptions extends GSAPAnimationOptions {
  rotation?: boolean;
  autoRotate?: boolean;
  stagger?: number;
}

export interface StaggerAnimationOptions extends GSAPAnimationOptions {
  stagger?: number;
  from?: 'start' | 'center' | 'end' | number;
}

/**
 * GSAP Animation Manager - enhances existing Scene instances
 */
export class GSAPAnimationManager {
  private scene: Scene;
  private gsapTimeline: gsap.core.Timeline;
  private gsapAnimations: Map<string, gsap.core.Tween> = new Map();
  private pathAnimations: Map<string, gsap.core.Tween> = new Map();
  private filterAnimations: Map<string, gsap.core.Tween> = new Map();
  private isGSAPControlled: boolean = false;

  constructor(scene: Scene) {
    this.scene = scene;
    this.gsapTimeline = this.initializeGSAPTimeline();
  }

  private initializeGSAPTimeline(): gsap.core.Timeline {
    return gsap.timeline({
      paused: true,
      duration: this.scene.getDuration() / 1000, // Convert to seconds
      repeat: -1,
      yoyo: false,
      onUpdate: () => this.onGSAPTimelineUpdate(),
      onComplete: () => this.onGSAPTimelineComplete(),
      onRepeat: () => this.onGSAPTimelineRepeat()
    });
  }

  private onGSAPTimelineUpdate(): void {
    if (!this.isGSAPControlled) return;
    
    // Sync our timeline progress with GSAP
    const progress = this.gsapTimeline.progress();
    this.scene.setTime(progress);
  }

  private onGSAPTimelineComplete(): void {
    // Handle completion - check if scene should loop
    if (!this.scene.isPlayingAnimation()) {
      this.pause();
    }
  }

  private onGSAPTimelineRepeat(): void {
    console.log('🔄 GSAP Animation loop completed');
  }

  // Main Animation Methods

  /**
   * Animate object along a path with advanced GSAP features
   */
  animateObjectAlongPath(
    object: Container, 
    points: Point[], 
    options: PathAnimationOptions = {}
  ): gsap.core.Tween {
    const {
      duration = this.scene.getDuration() / 1000,
      ease = 'power2.inOut',
      rotation = false,
      autoRotate = false,
      delay = 0,
      onComplete,
      ...gsapOptions
    } = options;

    // Convert points to GSAP MotionPath format
    const motionPath = this.convertPointsToMotionPath(points);
    
    const animationProps: any = {
      motionPath: {
        path: motionPath,
        autoRotate: autoRotate,
        alignOrigin: [0.5, 0.5] // Center the object on the path
      },
      duration,
      ease,
      delay,
      ...gsapOptions
    };

    if (rotation && !autoRotate) {
      // Manual rotation control
      animationProps.rotation = `+=${Math.PI * 2}`;
    }

    if (onComplete) {
      animationProps.onComplete = onComplete;
    }

    const tween = gsap.to(object, animationProps);
    
    // Store animation for management
    const objectId = (object as any).objectId || this.generateObjectId();
    (object as any).objectId = objectId;
    this.pathAnimations.set(objectId, tween);

    // Add to main timeline
    this.gsapTimeline.add(tween, 0);

    return tween;
  }

  /**
   * Animate object properties with smooth GSAP transitions
   */
  animateObjectProperties(
    object: Container,
    properties: PropertyAnimationOptions
  ): gsap.core.Tween {
    const {
      duration = 1,
      ease = 'power2.inOut',
      delay = 0,
      scale,
      rotation,
      alpha,
      blur,
      tint,
      brightness,
      contrast,
      saturation,
      onComplete,
      onUpdate,
      ...gsapOptions
    } = properties;

    const animationProps: any = {
      duration,
      ease,
      delay,
      ...gsapOptions
    };

    // Basic transform properties
    if (scale !== undefined) animationProps.scale = scale;
    if (rotation !== undefined) animationProps.rotation = rotation;
    if (alpha !== undefined) animationProps.alpha = alpha;
    if (tint !== undefined) animationProps.tint = tint;

    // Filter-based properties
    if (blur !== undefined || brightness !== undefined || contrast !== undefined || saturation !== undefined) {
      this.setupFiltersForAnimation(object, { blur, brightness, contrast, saturation });
    }

    if (onComplete) animationProps.onComplete = onComplete;
    if (onUpdate) animationProps.onUpdate = onUpdate;

    const tween = gsap.to(object, animationProps);
    
    const objectId = (object as any).objectId || this.generateObjectId();
    (object as any).objectId = objectId;
    this.gsapAnimations.set(objectId, tween);

    // Add to main timeline
    this.gsapTimeline.add(tween, 0);

    return tween;
  }

  /**
   * Create staggered animations for multiple objects
   */
  staggerObjectsAlongPaths(
    objects: Container[],
    pathsArray: Point[][],
    options: StaggerAnimationOptions = {}
  ): gsap.core.Timeline {
    const {
      stagger = 0.2,
      duration = this.scene.getDuration() / 1000,
      ease = 'power2.inOut',
      from = 'start',
      ...gsapOptions
    } = options;

    const staggerTimeline = gsap.timeline();

    objects.forEach((object, index) => {
      const pathPoints = pathsArray[index] || pathsArray[0]; // Fallback to first path
      const motionPath = this.convertPointsToMotionPath(pathPoints);
      
      let delay = 0;
      if (typeof from === 'number') {
        delay = from + (index * stagger);
      } else {
        switch (from) {
          case 'start':
            delay = index * stagger;
            break;
          case 'center':
            delay = Math.abs(index - objects.length / 2) * stagger;
            break;
          case 'end':
            delay = (objects.length - 1 - index) * stagger;
            break;
        }
      }

      const tween = gsap.to(object, {
        motionPath: {
          path: motionPath,
          alignOrigin: [0.5, 0.5]
        },
        duration,
        ease,
        delay,
        ...gsapOptions
      });

      staggerTimeline.add(tween, 0);
    });

    // Add stagger timeline to main timeline
    this.gsapTimeline.add(staggerTimeline, 0);

    return staggerTimeline;
  }

  /**
   * Create entrance animations with various easing options
   */
  createEntranceAnimation(
    objects: Container[],
    type: 'fadeIn' | 'scaleUp' | 'slideIn' | 'bounce' | 'elastic',
    options: StaggerAnimationOptions = {}
  ): gsap.core.Timeline {
    const {
      stagger = 0.1,
      duration = 0.8,
      delay = 0,
      ...gsapOptions
    } = options;

    // Set initial states
    objects.forEach(obj => {
      switch (type) {
        case 'fadeIn':
          obj.alpha = 0;
          break;
        case 'scaleUp':
          obj.scale.set(0);
          break;
        case 'slideIn':
          obj.y -= 50;
          obj.alpha = 0;
          break;
        case 'bounce':
        case 'elastic':
          obj.scale.set(0);
          obj.alpha = 0;
          break;
      }
    });

    const entrance = gsap.timeline();

    objects.forEach((obj, index) => {
      let animProps: any = {
        duration,
        delay: delay + (index * stagger),
        ...gsapOptions
      };

      switch (type) {
        case 'fadeIn':
          animProps.alpha = 1;
          animProps.ease = 'power2.out';
          break;
        case 'scaleUp':
          animProps.scale = 1;
          animProps.ease = 'back.out(1.7)';
          break;
        case 'slideIn':
          animProps.y = '+=50';
          animProps.alpha = 1;
          animProps.ease = 'power3.out';
          break;
        case 'bounce':
          animProps.scale = 1;
          animProps.alpha = 1;
          animProps.ease = 'bounce.out';
          break;
        case 'elastic':
          animProps.scale = 1;
          animProps.alpha = 1;
          animProps.ease = 'elastic.out(1, 0.3)';
          break;
      }

      entrance.to(obj, animProps, index * stagger);
    });

    this.gsapTimeline.add(entrance, 0);
    return entrance;
  }

  /**
   * Setup and animate filters
   */
  private setupFiltersForAnimation(
    object: Container,
    filterProps: { blur?: number; brightness?: number; contrast?: number; saturation?: number }
  ): void {
    const filters: Filter[] = object.filters ? [...object.filters] : [];
    
    // Setup blur filter
    if (filterProps.blur !== undefined) {
      let blurFilter = filters.find(f => f instanceof BlurFilter) as BlurFilter;
      if (!blurFilter) {
        blurFilter = new BlurFilter();
        filters.push(blurFilter);
      }
      
      gsap.to(blurFilter, {
        blur: filterProps.blur,
        duration: 1,
        ease: 'power2.inOut'
      });
    }

    // Setup color matrix filter for brightness, contrast, saturation
    if (filterProps.brightness !== undefined || filterProps.contrast !== undefined || filterProps.saturation !== undefined) {
      let colorFilter = filters.find(f => f instanceof ColorMatrixFilter) as ColorMatrixFilter;
      if (!colorFilter) {
        colorFilter = new ColorMatrixFilter();
        filters.push(colorFilter);
      }

      if (filterProps.brightness !== undefined) {
        // Brightness adjustment
        const brightness = filterProps.brightness;
        gsap.to(colorFilter, {
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => {
            colorFilter.brightness(brightness, false);
          }
        });
      }

      if (filterProps.contrast !== undefined) {
        gsap.to(colorFilter, {
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => {
            colorFilter.contrast(filterProps.contrast!, false);
          }
        });
      }

      if (filterProps.saturation !== undefined) {
        gsap.to(colorFilter, {
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => {
            colorFilter.saturate(filterProps.saturation!, false);
          }
        });
      }
    }

    object.filters = filters;
  }

  /**
   * Convert Point array to GSAP MotionPath format
   */
  private convertPointsToMotionPath(points: Point[]): string {
    if (points.length < 2) return 'M0,0';
    
    let path = `M${points[0].x},${points[0].y}`;
    
    if (points.length === 2) {
      // Simple line
      path += `L${points[1].x},${points[1].y}`;
    } else {
      // Smooth curve using quadratic Bézier
      for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        
        if (i === 1) {
          path += `Q${current.x},${current.y} ${midX},${midY}`;
        } else {
          path += `T${midX},${midY}`;
        }
      }
      
      // End point
      const lastPoint = points[points.length - 1];
      path += `T${lastPoint.x},${lastPoint.y}`;
    }
    
    return path;
  }

  private generateObjectId(): string {
    return `gsap_obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  }

  // Control Methods

  /**
   * Enable GSAP control mode
   */
  enableGSAPControl(): void {
    this.isGSAPControlled = true;
    this.gsapTimeline.progress(this.scene.getTime());
  }

  /**
   * Disable GSAP control mode (return to native Scene control)
   */
  disableGSAPControl(): void {
    this.isGSAPControlled = false;
    this.gsapTimeline.pause();
  }

  /**
   * Play animation
   */
  play(): void {
    this.enableGSAPControl();
    this.gsapTimeline.play();
  }

  /**
   * Pause animation
   */
  pause(): void {
    this.gsapTimeline.pause();
  }

  /**
   * Set animation time (0-1)
   */
  setTime(t: number): void {
    const clampedT = Math.max(0, Math.min(1, t));
    this.gsapTimeline.progress(clampedT);
    if (!this.isGSAPControlled) {
      this.scene.setTime(clampedT);
    }
  }

  /**
   * Set animation duration
   */
  setDuration(milliseconds: number): void {
    this.scene.setDuration(milliseconds);
    this.gsapTimeline.duration(milliseconds / 1000);
  }

  /**
   * Set loop mode
   */
  setLoop(enabled: boolean): void {
    this.scene.setLoop(enabled);
    this.gsapTimeline.repeat(enabled ? -1 : 0);
  }

  /**
   * Get current time
   */
  getTime(): number {
    return this.gsapTimeline.progress();
  }

  /**
   * Get duration in milliseconds
   */
  getDuration(): number {
    return this.scene.getDuration();
  }

  // Advanced Methods

  /**
   * Create custom GSAP animation
   */
  createCustomAnimation(
    target: any,
    properties: any,
    addToTimeline: boolean = true
  ): gsap.core.Tween {
    const tween = gsap.to(target, properties);
    
    if (addToTimeline) {
      this.gsapTimeline.add(tween, 0);
    }
    
    return tween;
  }

  /**
   * Get GSAP timeline for advanced control
   */
  getGSAPTimeline(): gsap.core.Timeline {
    return this.gsapTimeline;
  }

  /**
   * Get Scene instance
   */
  getScene(): Scene {
    return this.scene;
  }

  /**
   * Clear all GSAP animations
   */
  clearAnimations(): void {
    this.gsapAnimations.forEach(tween => tween.kill());
    this.pathAnimations.forEach(tween => tween.kill());
    this.filterAnimations.forEach(tween => tween.kill());
    
    this.gsapAnimations.clear();
    this.pathAnimations.clear();
    this.filterAnimations.clear();
    
    this.gsapTimeline.clear();
  }

  /**
   * Destroy the animation manager
   */
  destroy(): void {
    this.clearAnimations();
    this.gsapTimeline.kill();
  }

  /**
   * Get all available GSAP easing options
   */
  static getAvailableEasings(): string[] {
    return [
      'none',
      'power1.in', 'power1.out', 'power1.inOut',
      'power2.in', 'power2.out', 'power2.inOut',
      'power3.in', 'power3.out', 'power3.inOut',
      'power4.in', 'power4.out', 'power4.inOut',
      'back.in(1.7)', 'back.out(1.7)', 'back.inOut(1.7)',
      'elastic.in(1, 0.3)', 'elastic.out(1, 0.3)', 'elastic.inOut(1, 0.3)',
      'bounce.in', 'bounce.out', 'bounce.inOut',
      'circ.in', 'circ.out', 'circ.inOut',
      'expo.in', 'expo.out', 'expo.inOut',
      'sine.in', 'sine.out', 'sine.inOut'
    ];
  }
}

/**
 * Factory function to create GSAP-enhanced scenes
 */
export function createGSAPScene(bounds: any, id?: string, aspectRatio?: string): { scene: Scene; gsap: GSAPAnimationManager } {
  const scene = new Scene(bounds, id, aspectRatio);
  const gsapManager = new GSAPAnimationManager(scene);
  
  return { scene, gsap: gsapManager };
}

/**
 * Add GSAP capabilities to existing Scene
 */
export function enhanceSceneWithGSAP(scene: Scene): GSAPAnimationManager {
  return new GSAPAnimationManager(scene);
}