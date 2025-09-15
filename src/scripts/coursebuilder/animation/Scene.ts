/**
 * Scene - A sophisticated animation container with playback controls
 * Can only be scaled and deleted - no rotation or individual manipulation
 */

import { Container, Point, Graphics, Text, TextStyle } from 'pixi.js';
import { animationState } from './AnimationState';

export interface SceneBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationPath {
  objectId: string;
  points: Point[];
  startTime: number;
  duration: number;
}

export class Scene {
  private root: Container;
  private bounds: SceneBounds;
  private id: string;
  private isPlaying: boolean = false;
  private t: number = 0; // Animation time 0-1
  private duration: number = 3000; // Default 3 seconds
  private borderGraphics: Graphics;
  private controlsContainer!: Container;
  private playButton!: Graphics;
  private timelineBar!: Graphics;
  private timelineHandle!: Graphics;
  private timeText!: Text;
  private isSelected: boolean = false;
  private animationPaths: Map<string, AnimationPath> = new Map();
  private animationFrame: number | null = null;
  private lastTime: number = 0;

  constructor(bounds: SceneBounds, id?: string) {
    this.bounds = bounds;
    this.id = id || `scene_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    
    // Create pure container
    this.root = new Container();
    this.root.name = 'AnimationScene';
    this.root.position.set(bounds.x, bounds.y);
    
    // Add subtle border graphics for visual feedback
    this.borderGraphics = new Graphics();
    this.borderGraphics.name = 'SceneBorder';
    this.drawBorder();
    this.root.addChild(this.borderGraphics);
    
    // Create playback controls
    this.createPlaybackControls();
    
    // Set the scene ID for identification
    (this.root as any).__sceneRef = this;
    (this.root as any).__sceneId = this.id;
    
    // Make the container interactive for selection/scaling only
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    
    // Add hover effects
    this.root.on('pointerover', () => this.setHovered(true));
    this.root.on('pointerout', () => this.setHovered(false));
    this.root.on('pointerdown', () => this.setSelected(true));
    
    // Register with animation state
    const uiLayer = animationState.getUiLayer();
    if (uiLayer) {
      uiLayer.addChild(this.root);
      animationState.addScene(this);
    }
  }

  private createPlaybackControls(): void {
    this.controlsContainer = new Container();
    this.controlsContainer.name = 'SceneControls';
    
    const controlsY = this.bounds.height + 5;
    
    // Play/Pause button
    this.playButton = new Graphics();
    this.drawPlayButton();
    this.playButton.position.set(5, controlsY);
    this.playButton.eventMode = 'static';
    this.playButton.cursor = 'pointer';
    this.playButton.on('pointerdown', () => this.togglePlayback());
    this.controlsContainer.addChild(this.playButton);
    
    // Timeline bar
    const timelineWidth = this.bounds.width - 120;
    this.timelineBar = new Graphics();
    this.timelineBar.position.set(40, controlsY + 10);
    this.drawTimeline(timelineWidth);
    this.controlsContainer.addChild(this.timelineBar);
    
    // Timeline handle
    this.timelineHandle = new Graphics();
    this.timelineHandle.position.set(40, controlsY + 6);
    this.drawTimelineHandle();
    this.timelineHandle.eventMode = 'static';
    this.timelineHandle.cursor = 'pointer';
    this.setupTimelineDragging(timelineWidth);
    this.controlsContainer.addChild(this.timelineHandle);
    
    // Time display
    this.timeText = new Text({
      text: '0.0s / 3.0s',
      style: new TextStyle({
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x666666
      })
    });
    this.timeText.position.set(timelineWidth + 50, controlsY + 8);
    this.controlsContainer.addChild(this.timeText);
    
    this.root.addChild(this.controlsContainer);
  }

  private drawPlayButton(): void {
    this.playButton.clear();
    const size = 20;
    this.playButton.roundRect(0, 0, size, size, 3).fill({ color: 0x4a79a4 });
    
    // Draw play or pause icon
    this.playButton.fill({ color: 0xffffff });
    if (this.isPlaying) {
      // Pause icon (two bars)
      this.playButton.rect(6, 5, 3, 10);
      this.playButton.rect(11, 5, 3, 10);
    } else {
      // Play icon (triangle)
      this.playButton.poly([6, 5, 6, 15, 14, 10]);
    }
    this.playButton.fill();
  }

  private drawTimeline(width: number): void {
    this.timelineBar.clear();
    // Background
    this.timelineBar.roundRect(0, 0, width, 8, 4).fill({ color: 0xe0e0e0 });
    // Progress
    const progress = width * this.t;
    if (progress > 0) {
      this.timelineBar.roundRect(0, 0, progress, 8, 4).fill({ color: 0x4a79a4 });
    }
  }

  private drawTimelineHandle(): void {
    this.timelineHandle.clear();
    this.timelineHandle.circle(0, 4, 6).fill({ color: 0x4a79a4 });
  }

  private setupTimelineDragging(timelineWidth: number): void {
    let isDragging = false;
    
    this.timelineHandle.on('pointerdown', (event) => {
      isDragging = true;
      event.stopPropagation();
    });
    
    this.root.on('pointermove', (event) => {
      if (isDragging) {
        const local = this.timelineBar.toLocal(event.global);
        const newT = Math.max(0, Math.min(1, local.x / timelineWidth));
        this.setTime(newT);
        event.stopPropagation();
      }
    });
    
    this.root.on('pointerup', () => {
      isDragging = false;
    });
  }

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private updateControls(): void {
    this.drawPlayButton();
    this.drawTimeline(this.bounds.width - 120);
    
    // Update timeline handle position
    const timelineWidth = this.bounds.width - 120;
    this.timelineHandle.position.x = 40 + (timelineWidth * this.t);
    
    // Update time text
    const currentTime = (this.t * this.duration / 1000).toFixed(1);
    const totalTime = (this.duration / 1000).toFixed(1);
    this.timeText.text = `${currentTime}s / ${totalTime}s`;
  }

  private drawBorder(): void {
    this.borderGraphics.clear();
    
    const alpha = this.isSelected ? 0.6 : 0.3;
    const color = this.isSelected ? 0x4a79a4 : 0x666666;
    
    // Draw subtle border
    this.borderGraphics
      .roundRect(0, 0, this.bounds.width, this.bounds.height, 4)
      .stroke({ 
        color: color, 
        width: this.isSelected ? 2 : 1, 
        alpha: alpha 
      });
    
    // Add corner indicators for resize handles when selected
    if (this.isSelected) {
      const cornerSize = 6;
      const corners = [
        { x: 0, y: 0 },
        { x: this.bounds.width, y: 0 },
        { x: 0, y: this.bounds.height },
        { x: this.bounds.width, y: this.bounds.height }
      ];
      
      corners.forEach(corner => {
        this.borderGraphics
          .rect(corner.x - cornerSize/2, corner.y - cornerSize/2, cornerSize, cornerSize)
          .fill({ color: 0x4a79a4, alpha: 0.8 });
      });
    }
  }

  private setHovered(hovered: boolean): void {
    if (!this.isSelected) {
      this.borderGraphics.alpha = hovered ? 0.8 : 0.5;
    }
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.drawBorder();
  }

  getRoot(): Container {
    return this.root;
  }

  getId(): string {
    return this.id;
  }

  contains(pt: Point): boolean {
    const uiLayer = animationState.getUiLayer();
    if (!uiLayer) return false;
    
    const local = this.root.toLocal(pt, uiLayer);
    return local.x >= 0 && local.x <= this.bounds.width && 
           local.y >= 0 && local.y <= this.bounds.height;
  }

  getBounds(): SceneBounds {
    return { ...this.bounds };
  }

  getContentBounds(): SceneBounds {
    return { ...this.bounds };
  }

  setBounds(newBounds: SceneBounds): void {
    this.bounds = { ...newBounds };
    this.root.position.set(newBounds.x, newBounds.y);
    this.drawBorder(); // Redraw border with new dimensions
    
    // Recreate controls with new dimensions
    if (this.controlsContainer) {
      this.root.removeChild(this.controlsContainer);
      this.createPlaybackControls();
    }
  }

  scale(scaleX: number, scaleY: number): void {
    this.root.scale.set(scaleX, scaleY);
  }

  addObject(object: Container): void {
    const uiLayer = animationState.getUiLayer();
    if (uiLayer) {
      const globalPos = object.getGlobalPosition();
      const localPos = this.root.toLocal(globalPos, uiLayer);
      
      if (object.parent) {
        object.parent.removeChild(object);
      }
      
      // Assign unique ID for animation tracking
      if (!(object as any).objectId) {
        (object as any).objectId = `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      }
      
      console.log(`🎬 Scene.addObject Debug:`);
      console.log(`🎬   - Object global position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
      console.log(`🎬   - Scene root position: (${this.root.x.toFixed(1)}, ${this.root.y.toFixed(1)})`);
      console.log(`🎬   - Converted local position: (${localPos.x.toFixed(1)}, ${localPos.y.toFixed(1)})`);
      
      object.position.set(localPos.x, localPos.y);
      this.root.addChild(object);
      
      console.log(`🎬 Added object ${(object as any).objectId} to scene ${this.id}`);
    }
  }

  removeObject(object: Container): void {
    if (object.parent === this.root) {
      this.root.removeChild(object);
    }
  }

  getObjects(): Container[] {
    return this.root.children.filter(child => child instanceof Container) as Container[];
  }

  destroy(): void {
    // Stop animation
    this.pause();
    
    animationState.removeScene(this);
    
    // Clean up event listeners
    this.root.removeAllListeners();
    
    if (this.root.parent) {
      this.root.parent.removeChild(this.root);
    }
    
    this.root.destroy({ children: true });
  }

  play(): void {
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.startAnimationLoop();
    this.updateControls();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.updateControls();
  }

  setTime(t: number): void {
    this.t = Math.max(0, Math.min(1, t));
    this.updateAnimationObjects();
    this.updateControls();
  }

  private startAnimationLoop(): void {
    if (!this.isPlaying) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update animation time
    this.t += deltaTime / this.duration;
    
    if (this.t >= 1) {
      this.t = 1;
      this.pause(); // Stop at end, or could loop here
    }
    
    this.updateAnimationObjects();
    this.updateControls();
    
    if (this.isPlaying) {
      this.animationFrame = requestAnimationFrame(() => this.startAnimationLoop());
    }
  }

  private updateAnimationObjects(): void {
    // Animate objects along their paths
    this.animationPaths.forEach((path, objectId) => {
      const object = this.findObjectById(objectId);
      if (object && path.points.length >= 2) {
        const position = this.interpolateAlongPath(path.points, this.t);
        object.position.set(position.x, position.y);
      }
    });
  }

  private interpolateAlongPath(points: Point[], t: number): Point {
    if (points.length < 2) return points[0] || new Point(0, 0);
    
    const totalSegments = points.length - 1;
    const segmentT = t * totalSegments;
    const segmentIndex = Math.floor(segmentT);
    const localT = segmentT - segmentIndex;
    
    if (segmentIndex >= totalSegments) {
      return points[points.length - 1];
    }
    
    const startPoint = points[segmentIndex];
    const endPoint = points[segmentIndex + 1];
    
    return new Point(
      startPoint.x + (endPoint.x - startPoint.x) * localT,
      startPoint.y + (endPoint.y - startPoint.y) * localT
    );
  }

  private findObjectById(objectId: string): Container | null {
    for (const child of this.root.children) {
      if ((child as any).objectId === objectId) {
        return child as Container;
      }
    }
    return null;
  }

  // Method for PathTool to add animation paths
  addAnimationPath(objectId: string, points: Point[]): void {
    this.animationPaths.set(objectId, {
      objectId,
      points: [...points],
      startTime: 0,
      duration: this.duration
    });
    console.log(`🎬 Added animation path for object ${objectId} with ${points.length} points`);
  }

  // Method to set animation duration
  setDuration(milliseconds: number): void {
    this.duration = Math.max(100, milliseconds);
    this.updateControls();
  }

  getTime(): number {
    return this.t;
  }

  isPlayingAnimation(): boolean {
    return this.isPlaying;
  }

  setLoop(enabled: boolean): void {
    // Basic loop implementation for future use
    console.log(`Scene ${this.id} loop set to: ${enabled}`);
  }

  showBorder(visible: boolean): void {
    this.borderGraphics.visible = visible;
  }

  setBorderVisible(visible: boolean): void {
    this.borderGraphics.visible = visible;
  }
}