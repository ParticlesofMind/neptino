/**
 * Scene - A sophisticated animation container with playback controls
 * Can only be scaled and deleted - no rotation or individual manipulation
 */

import { Container, Point, Graphics, FederatedPointerEvent } from 'pixi.js';
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
  boundsOffsetX?: number;
  boundsOffsetY?: number;
}

type ResizeHandlePosition = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'r' | 'b' | 'l';

interface SceneInteractionState {
  mode: 'drag' | 'resize';
  handle?: ResizeHandlePosition;
  startPointer: Point;
  startBounds: SceneBounds;
}

interface PathVisual {
  container: Container;
  pathGraphic: Graphics;
  anchors: Graphics[];
}

export class Scene {
  private root: Container;
  private bounds: SceneBounds;
  private id: string;
  private isPlaying: boolean = false;
  private t: number = 0; // Animation time 0-1
  private duration: number;
  private borderGraphics: Graphics;
  private controlsContainer!: Container;
  private hideTrajButton!: HTMLButtonElement;
  private isTimelineDragging: boolean = false;
  private isSelected: boolean = false;
  private animationPaths: Map<string, AnimationPath> = new Map();
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private interactionLayer: Container | null = null;
  private dragOverlay: Graphics | null = null;
  private dragHandle: Graphics | null = null;
  private pathOverlay: Container | null = null;
  private pathVisuals: Map<string, PathVisual> = new Map();
  private resizeHandles: Map<ResizeHandlePosition, Graphics> = new Map();
  private interactionState: SceneInteractionState | null = null;
  private pointerMoveHandler: ((event: FederatedPointerEvent) => void) | null = null;
  private pointerUpHandler: ((event: FederatedPointerEvent) => void) | null = null;
  private usingGlobalPointerTracking: boolean = false;
  private activeAnchor: { objectId: string; index: number } | null = null;
  private contentContainer: Container;
  private contentMask: Graphics;
  private hideTrajDuringPlayback: boolean = false;
  private loopEnabled: boolean = false;
  private livePreview: Graphics | null = null;
  private maxVisibleAnchors: number = 7; // Reduced from 9 to 7 (includes start + end + 5 in between)
  // Dynamic aspect ratio support
  private readonly aspectWidth: number;
  private readonly aspectHeight: number;
  private readonly aspectRatio: number;
  private readonly minWidth: number;
  private readonly minHeight: number;

  constructor(bounds: SceneBounds, id?: string, aspectRatio: string = '16:9') {
    this.bounds = bounds;
    this.id = id || `scene_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    this.duration = animationState.getSceneDuration();
    
    // Calculate dimensions based on aspect ratio
    if (aspectRatio === '9:16') {
      // Portrait: narrower width
      this.aspectWidth = 270;
      this.aspectHeight = 480;
    } else if (aspectRatio === '21:9') {
      // Ultrawide: much wider
      this.aspectWidth = 560;
      this.aspectHeight = 240;
    } else {
      // Default 16:9: standard landscape
      this.aspectWidth = 480;
      this.aspectHeight = 270;
    }
    
    this.aspectRatio = this.aspectWidth / this.aspectHeight;
    this.minWidth = this.aspectWidth;
    this.minHeight = this.aspectHeight;
    
    // Create pure container
    this.root = new Container();
    this.root.name = 'AnimationScene';
    this.root.position.set(bounds.x, bounds.y);
    this.root.sortableChildren = true;
    
    // Create content container with masking for animated objects
    // Center the content container so (0,0) is at the center of the scene
    this.contentContainer = new Container();
    this.contentContainer.name = 'SceneContent';
    this.contentContainer.position.set(bounds.width / 2, bounds.height / 2);
    this.contentContainer.zIndex = 1; // Above path overlay but below interaction layer
    
    // Create mask to clip content to scene bounds
    this.contentMask = new Graphics();
    this.contentMask.name = 'SceneMask';
    this.drawContentMask();
    
    // Apply mask to content container
    this.contentContainer.mask = this.contentMask;
    
    this.root.addChild(this.contentMask);
    this.root.addChild(this.contentContainer);
    
    // Add subtle border graphics for visual feedback
    this.borderGraphics = new Graphics();
    this.borderGraphics.name = 'SceneBorder';
    this.borderGraphics.zIndex = 0;
    this.drawBorder();
    this.root.addChild(this.borderGraphics);
    
    // Create interaction handles and playback controls
    this.createInteractionHandles();
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
    this.root.on('pointerdown', (event) => this.handleRootPointerDown(event));
    
    // Register with animation state
    const uiLayer = animationState.getUiLayer();
    if (uiLayer) {
      uiLayer.addChild(this.root);
      animationState.addScene(this);
    }
  }

  private drawContentMask(): void {
    this.contentMask.clear();
    this.contentMask.rect(0, 0, this.bounds.width, this.bounds.height);
    this.contentMask.fill({ color: 0xffffff });
  }

  private registerSceneControl(obj: Graphics | Container, cursor?: string): void {
    obj.eventMode = 'static';
    if (cursor) {
      (obj as any).cursor = cursor;
    }
    (obj as any).__sceneControl = true;
  }

  private createInteractionHandles(): void {
    this.interactionLayer = new Container();
    this.interactionLayer.name = 'SceneInteractionLayer';
    this.interactionLayer.zIndex = 2; // Above content and paths
    this.interactionLayer.eventMode = 'passive';
    this.root.addChild(this.interactionLayer);

    this.dragOverlay = new Graphics();
    this.dragOverlay.name = 'SceneDragOverlay';
    this.dragOverlay.alpha = 0.0001;
    // Overlay only provides visual feedback; leave it non-interactive so drags inside
    // the scene manipulate the selected object rather than the scene container.
    this.dragOverlay.eventMode = 'none';
    this.interactionLayer.addChild(this.dragOverlay);

    this.pathOverlay = new Container();
    this.pathOverlay.name = 'ScenePathOverlay';
    this.pathOverlay.zIndex = 0; // Below content container
    this.pathOverlay.eventMode = 'passive';
    this.root.addChild(this.pathOverlay);

    this.dragHandle = new Graphics();
    this.dragHandle.name = 'SceneDragHandle';
    this.registerSceneControl(this.dragHandle, 'move');
    this.drawDragHandle(60);
    this.dragHandle.on('pointerdown', (event: FederatedPointerEvent) => this.beginSceneDrag(event));
    this.interactionLayer.addChild(this.dragHandle);

    const handles: Array<{ key: ResizeHandlePosition; cursor: string }> = [
      { key: 'tl', cursor: 'nwse-resize' },
      { key: 'tr', cursor: 'nesw-resize' },
      { key: 'br', cursor: 'nwse-resize' },
      { key: 'bl', cursor: 'nesw-resize' }
    ];

    handles.forEach(({ key, cursor }) => {
      const handle = new Graphics();
      handle.name = `SceneHandle-${key}`;
      this.registerSceneControl(handle, cursor);
      this.drawResizeHandle(handle);
      handle.on('pointerdown', (event: FederatedPointerEvent) => this.beginSceneResize(key, event));
      this.resizeHandles.set(key, handle);
      this.interactionLayer!.addChild(handle);
    });

    this.layoutInteractionHandles();
  }

  private drawResizeHandle(handle: Graphics): void {
    handle.clear();
    handle.roundRect(-6, -6, 12, 12, 2);
    handle.fill({ color: 0x80bfff, alpha: 0.9 });
    handle.stroke({ color: 0x4a79a4, width: 1 });
  }

  private drawDragHandle(handleWidth: number): void {
    if (!this.dragHandle) return;
    this.dragHandle.clear();
    this.dragHandle.roundRect(0, 0, handleWidth, 12, 4);
    this.dragHandle.fill({ color: 0x80bfff, alpha: 0.9 }); // Updated to match theme blue
  }

  private layoutInteractionHandles(): void {
    if (!this.dragOverlay) return;

    this.dragOverlay.clear();
    this.dragOverlay.rect(0, 0, this.bounds.width, this.bounds.height);
    const overlayAlpha = this.isSelected ? 0.0001 : 0.0;
    this.dragOverlay.fill({ color: 0xffffff, alpha: overlayAlpha });
    this.dragOverlay.visible = this.isSelected;

    const w = this.bounds.width;
    const h = this.bounds.height;
    const midX = w / 2;
    const midY = h / 2;

    const positions: Record<ResizeHandlePosition, Point> = {
      tl: new Point(0, 0),
      tr: new Point(w, 0),
      br: new Point(w, h),
      bl: new Point(0, h),
      t: new Point(midX, 0),
      r: new Point(w, midY),
      b: new Point(midX, h),
      l: new Point(0, midY)
    };

    this.resizeHandles.forEach((handle, key) => {
      const pos = positions[key];
      if (!pos) return;
      handle.position.set(pos.x, pos.y);
      handle.visible = this.isSelected;
      handle.eventMode = this.isSelected ? 'static' : 'none';
    });

    if (this.dragHandle) {
      const handleWidth = Math.min(Math.max(w * 0.4, 40), 120);
      this.drawDragHandle(handleWidth);
      this.dragHandle.visible = this.isSelected;
      this.dragHandle.eventMode = this.isSelected ? 'static' : 'none';
      
      // Position drag handle below the PIXI playback controls
      const controlsHeight = 60; // PIXI controls are smaller
      this.dragHandle.position.set(
        midX - handleWidth / 2,
        h + controlsHeight + 20 // Controls + gap
      );
    }

    // Show/hide PIXI controls with selection state
    if (this.controlsContainer) {
      this.controlsContainer.visible = this.isSelected;
      this.controlsContainer.eventMode = this.isSelected ? 'static' : 'none';
    }

    this.updatePathInteractivity();
  }

  private refreshPathVisual(objectId: string): void {
    if (!this.pathOverlay) return;
    const path = this.animationPaths.get(objectId);
    if (!path) return;

    let visual = this.pathVisuals.get(objectId);
    if (!visual) {
      const container = new Container();
      container.name = `ScenePath-${objectId}`;
      container.zIndex = 0; // Path visual below animated objects
      container.eventMode = 'passive';
      this.pathOverlay.addChild(container);

      const pathGraphic = new Graphics();
      pathGraphic.name = `ScenePathLine-${objectId}`;
      pathGraphic.eventMode = 'none';
      container.addChild(pathGraphic);

      visual = { container, pathGraphic, anchors: [] };
      this.pathVisuals.set(objectId, visual);
    }

    const pathVisual = visual;

    pathVisual.anchors.forEach(anchor => anchor.destroy());
    pathVisual.anchors = [];

    // Convert scene-relative points to pathOverlay coordinates for visual display
    const pathOverlayPointsFull = path.points.map(point => {
      // Points are in content container space (centered), convert to pathOverlay space
      return this.pathOverlay!.toLocal(this.contentContainer.toGlobal(point));
    });

    // Better anchor distribution: always show start, end, and evenly spaced points
    const indices: number[] = [];
    const count = pathOverlayPointsFull.length;
    
    if (count > 0) {
      indices.push(0); // Start point
      
      if (count > 1) {
        const maxInterior = Math.max(0, Math.min(this.maxVisibleAnchors - 2, count - 2));
        
        // Distribute interior points more evenly
        if (maxInterior > 0) {
          for (let i = 1; i <= maxInterior; i++) {
            const ratio = i / (maxInterior + 1);
            const idx = Math.round(ratio * (count - 1));
            if (idx > 0 && idx < count - 1 && !indices.includes(idx)) {
              indices.push(idx);
            }
          }
        }
        
        indices.push(count - 1); // End point
      }
    }
    
    // Sort indices to maintain order
    indices.sort((a, b) => a - b);
    const pathOverlayPoints = indices.map(i => pathOverlayPointsFull[i]);

    this.redrawPathGraphic(pathVisual.pathGraphic, pathOverlayPointsFull);

    pathOverlayPoints.forEach((point, displayIndex) => {
      const anchor = this.createAnchor(objectId, indices[displayIndex], point);
      pathVisual.anchors.push(anchor);
      pathVisual.container.addChild(anchor);
    });
  }

  private redrawPathGraphic(graphic: Graphics, points: Point[]): void {
    graphic.clear();
    if (points.length === 0) return;

    
    graphic.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      graphic.lineTo(points[i].x, points[i].y);
    }
    graphic.stroke({ color: 0x4a79a4, width: 2, alpha: 0.8 });
    graphic.alpha = this.isSelected ? 0.9 : 0.4;
  }

  private createAnchor(objectId: string, index: number, point: Point): Graphics {
    const anchor = new Graphics();
    anchor.name = `ScenePathAnchor-${objectId}-${index}`;
    anchor.circle(0, 0, 5);
    anchor.fill({ color: 0xffffff, alpha: 1 });
    anchor.stroke({ color: 0x4a79a4, width: 2, alpha: 0.9 });
    anchor.position.set(point.x, point.y);
    this.registerSceneControl(anchor, 'pointer');
    anchor.on('pointerdown', (event: FederatedPointerEvent) => this.beginAnchorDrag(objectId, index, event));
    anchor.on('pointerover', () => this.highlightAnchor(anchor, true));
    anchor.on('pointerout', () => this.highlightAnchor(anchor, false));
    return anchor;
  }

  private highlightAnchor(anchor: Graphics, hovered: boolean): void {
    anchor.scale.set(hovered ? 1.25 : 1);
    anchor.alpha = hovered ? 1 : (this.isSelected ? 1 : 0.7);
  }

  private beginAnchorDrag(objectId: string, index: number, event: FederatedPointerEvent): void {
    this.setSelected(true);
    this.activeAnchor = { objectId, index };
    this.attachGlobalPointerListeners();
    this.updateActiveAnchorPosition(event);
    event.stopPropagation();
  }

  private updateActiveAnchorPosition(event: FederatedPointerEvent): void {
    if (!this.activeAnchor) return;
    const { objectId, index } = this.activeAnchor;
    const path = this.animationPaths.get(objectId);
    const visual = this.pathVisuals.get(objectId);
    if (!path || !visual) return;

    // Convert global position to content container coordinates (scene-relative)
    const contentLocal = this.contentContainer.toLocal(event.global);
    
    // Clamp to scene bounds (centered coordinates)
    const halfWidth = this.bounds.width / 2;
    const halfHeight = this.bounds.height / 2;
    const clampedX = Math.max(-halfWidth, Math.min(halfWidth, contentLocal.x));
    const clampedY = Math.max(-halfHeight, Math.min(halfHeight, contentLocal.y));

    // Update the path point in scene-relative coordinates
    if (!path.points[index]) {
      path.points[index] = new Point(clampedX, clampedY);
    } else {
      path.points[index].x = clampedX;
      path.points[index].y = clampedY;
    }

    // Update visual anchor position (convert to pathOverlay coordinates)
    const anchor = visual.anchors.find(a => a.name === `ScenePathAnchor-${objectId}-${index}`);
    if (anchor) {
      const pathOverlayPoint = this.pathOverlay!.toLocal(this.contentContainer.toGlobal(new Point(clampedX, clampedY)));
      anchor.position.set(pathOverlayPoint.x, pathOverlayPoint.y);
    }

    // Redraw path with converted coordinates
    const pathOverlayPoints = path.points.map(point => {
      return this.pathOverlay!.toLocal(this.contentContainer.toGlobal(point));
    });
    this.redrawPathGraphic(visual.pathGraphic, pathOverlayPoints);
    this.updateAnimationObjects();
  }

  private updatePathInteractivity(): void {
    this.pathVisuals.forEach(({ pathGraphic, anchors }) => {
      pathGraphic.alpha = this.isSelected ? 0.9 : 0.45;
      anchors.forEach(anchor => {
        anchor.visible = this.isSelected;
        anchor.eventMode = this.isSelected ? 'static' : 'none';
        if (!this.isSelected) {
          anchor.scale.set(1);
          anchor.alpha = 0.7;
        } else {
          anchor.alpha = 1;
        }
      });
    });
  }

  private beginSceneDrag(event: FederatedPointerEvent): void {
    const uiLayer = animationState.getUiLayer();
    if (!uiLayer) return;
    const local = uiLayer.toLocal(event.global);
    this.interactionState = {
      mode: 'drag',
      startPointer: new Point(local.x, local.y),
      startBounds: { ...this.bounds }
    };
    this.setSelected(true);
    this.attachGlobalPointerListeners();
    event.stopPropagation();
  }

  private beginSceneResize(handle: ResizeHandlePosition, event: FederatedPointerEvent): void {
    const uiLayer = animationState.getUiLayer();
    if (!uiLayer) return;
    const local = uiLayer.toLocal(event.global);
    this.interactionState = {
      mode: 'resize',
      handle,
      startPointer: new Point(local.x, local.y),
      startBounds: { ...this.bounds }
    };
    this.setSelected(true);
    this.attachGlobalPointerListeners();
    event.stopPropagation();
  }

  private updateSceneInteraction(event: FederatedPointerEvent): void {
    if (!this.interactionState) return;
    const uiLayer = animationState.getUiLayer();
    if (!uiLayer) return;
    const local = uiLayer.toLocal(event.global);
    const dx = local.x - this.interactionState.startPointer.x;
    const dy = local.y - this.interactionState.startPointer.y;

    if (this.interactionState.mode === 'drag') {
      const nextBounds: SceneBounds = {
        x: this.interactionState.startBounds.x + dx,
        y: this.interactionState.startBounds.y + dy,
        width: this.interactionState.startBounds.width,
        height: this.interactionState.startBounds.height
      };
      this.applyBounds(nextBounds);
      return;
    }

    if (!this.interactionState.handle) return;
    const resized = this.computeResizedBounds(this.interactionState.startBounds, this.interactionState.handle, dx, dy);
    this.applyBounds(resized);
  }

  private computeResizedBounds(start: SceneBounds, handle: ResizeHandlePosition, dx: number, dy: number): SceneBounds {
    const widthFromDx = (() => {
      switch (handle) {
        case 'br':
        case 'tr':
          return start.width + dx;
        case 'bl':
        case 'tl':
          return start.width - dx;
        default:
          return start.width;
      }
    })();

    const heightFromDy = (() => {
      switch (handle) {
        case 'br':
        case 'bl':
          return start.height + dy;
        case 'tr':
        case 'tl':
          return start.height - dy;
        default:
          return start.height;
      }
    })();

    const candidateWidthFromDx = Math.max(this.minWidth, widthFromDx);
    const candidateWidthFromDy = Math.max(this.minWidth, Math.max(this.minHeight, heightFromDy) * this.aspectRatio);

    const changeFromDx = Math.abs(candidateWidthFromDx - start.width);
    const changeFromDy = Math.abs(candidateWidthFromDy - start.width);

    let width = changeFromDy > changeFromDx ? candidateWidthFromDy : candidateWidthFromDx;
    width = Math.max(this.minWidth, width);
    let height = width / this.aspectRatio;
    if (height < this.minHeight) {
      height = this.minHeight;
      width = height * this.aspectRatio;
    }

    let x = start.x;
    let y = start.y;

    switch (handle) {
      case 'tr':
        y = start.y + (start.height - height);
        break;
      case 'bl':
        x = start.x + (start.width - width);
        break;
      case 'tl':
        x = start.x + (start.width - width);
        y = start.y + (start.height - height);
        break;
      case 'br':
      default:
        break;
    }

    return {
      x,
      y,
      width,
      height
    };
  }

  private applyBounds(newBounds: SceneBounds): void {
    this.bounds = { ...newBounds };
    this.root.position.set(newBounds.x, newBounds.y);
    this.drawBorder();
    this.drawContentMask(); // Update the content mask when bounds change
    this.layoutInteractionHandles();
  }

  private handleRootPointerDown(event: FederatedPointerEvent): void {
    const target = event.target as any;
    if (target && target.__sceneControl) {
      return;
    }
    this.setSelected(true);
  }

  private createPlaybackControls(): void {
    
    // Create PIXI container for controls - positioned like the drag handle
    this.controlsContainer = new Container();
    this.controlsContainer.name = 'SceneControls';
    this.controlsContainer.zIndex = 2;
    this.controlsContainer.eventMode = 'passive';
    
    // Position controls just like the drag handle - relative to scene bounds
    const w = this.bounds.width;
    const h = this.bounds.height;
    const midX = w / 2;
    
    // Create control background - wider to accommodate all buttons
    const controlsBg = new Graphics();
    controlsBg.roundRect(-150, -30, 300, 60, 8); // 300px wide, 60px tall, centered
    controlsBg.fill({ color: 0xffffff, alpha: 0.95 });
    controlsBg.stroke({ color: 0x000000, width: 1, alpha: 0.1 });
    controlsBg.eventMode = 'none'; // Background doesn't need interactions
    this.controlsContainer.addChild(controlsBg);
    
    // Timeline container (above buttons)
    const timelineY = -15;
    
    // Create timeline background
    const timelineBg = new Graphics();
    timelineBg.roundRect(-120, -3, 240, 6, 3); // 240px wide timeline
    timelineBg.fill({ color: 0xf0f0f0 });
    timelineBg.position.set(0, timelineY);
    this.controlsContainer.addChild(timelineBg);
    
    // Create timeline progress
    const timelineProgress = new Graphics();
    timelineProgress.roundRect(0, 0, 120, 6, 3); // Half width initially for demo
    timelineProgress.fill({ color: 0x80bfff });
    timelineProgress.position.set(-120, timelineY - 3);
    this.controlsContainer.addChild(timelineProgress);
    
    // Create timeline handle
    const timelineHandle = new Graphics();
    timelineHandle.circle(0, 0, 8);
    timelineHandle.fill({ color: 0x80bfff });
    timelineHandle.stroke({ color: 0xffffff, width: 2 });
    timelineHandle.position.set(-60, timelineY); // Middle of timeline
    timelineHandle.eventMode = 'static';
    timelineHandle.cursor = 'pointer';
    this.registerSceneControl(timelineHandle);
    this.controlsContainer.addChild(timelineHandle);
    
    // Button container (below timeline)
    const buttonY = 8;
    const buttonSize = 24;
    const buttonSpacing = 36;
    
    // Back button (left arrow)
    const backButton = this.createPixiButton(-buttonSpacing * 1.5, buttonY, buttonSize, 0x80bfff);
    this.drawChevronLeft(backButton);
    backButton.on('pointerdown', () => this.nudgeTimeSeconds(-0.5));
    this.controlsContainer.addChild(backButton);
    
    // Play/Pause button (triangle/pause)
    const playButton = this.createPixiButton(-buttonSpacing * 0.5, buttonY, buttonSize + 8, 0x80bfff); // Slightly larger
    this.drawPlayIcon(playButton);
    playButton.on('pointerdown', () => this.togglePlayback());
    this.controlsContainer.addChild(playButton);
    
    // Forward button (right arrow)
    const forwardButton = this.createPixiButton(buttonSpacing * 0.5, buttonY, buttonSize, 0x80bfff);
    this.drawChevronRight(forwardButton);
    forwardButton.on('pointerdown', () => this.nudgeTimeSeconds(0.5));
    this.controlsContainer.addChild(forwardButton);
    
    // Hide trajectory button (eye icon)
    const hideButton = this.createPixiButton(buttonSpacing * 1.5, buttonY, buttonSize, 0x66bb6a); // Different color
    this.drawEyeIcon(hideButton, false); // Start with eye open
    hideButton.on('pointerdown', () => this.toggleTrajectoryVisibility());
    this.controlsContainer.addChild(hideButton);
    
    // Store references for updates
    (this.controlsContainer as any).timelineProgress = timelineProgress;
    (this.controlsContainer as any).timelineHandle = timelineHandle;
    (this.controlsContainer as any).playButton = playButton;
    (this.controlsContainer as any).hideButton = hideButton;
    
    // Position the controls container just below the scene, centered
    this.controlsContainer.position.set(midX, h + 50); // 50px below scene
    this.controlsContainer.visible = this.isSelected;
    
    // Add to the scene's interaction layer
    if (this.interactionLayer) {
      this.interactionLayer.addChild(this.controlsContainer);
    }
    
    console.log('Enhanced PIXI controls created with all buttons:', {
      position: this.controlsContainer.position,
      sceneBounds: this.bounds,
      buttons: ['back', 'play', 'forward', 'hide-trajectory']
    });
  }

  private createPixiButton(x: number, y: number, size: number, color: number): Container {
    const button = new Container();
    button.position.set(x, y);
    button.eventMode = 'static';
    button.cursor = 'pointer';
    
    // Button background
    const bg = new Graphics();
    bg.circle(0, 0, size / 2);
    bg.fill({ color: color, alpha: 0.9 });
    bg.stroke({ color: 0xffffff, width: 1 });
    button.addChild(bg);
    
    // Hover effects
    button.on('pointerover', () => {
      bg.scale.set(1.1);
      bg.alpha = 1;
    });
    
    button.on('pointerout', () => {
      bg.scale.set(1);
      bg.alpha = 0.9;
    });
    
    this.registerSceneControl(button);
    return button;
  }

  private drawChevronLeft(button: Container): void {
    const icon = new Graphics();
    icon.moveTo(4, -6);
    icon.lineTo(-4, 0);
    icon.lineTo(4, 6);
    icon.stroke({ color: 0xffffff, width: 2, cap: 'round', join: 'round' });
    button.addChild(icon);
  }

  private drawChevronRight(button: Container): void {
    const icon = new Graphics();
    icon.moveTo(-4, -6);
    icon.lineTo(4, 0);
    icon.lineTo(-4, 6);
    icon.stroke({ color: 0xffffff, width: 2, cap: 'round', join: 'round' });
    button.addChild(icon);
  }

  private drawPlayIcon(button: Container): void {
    const icon = new Graphics();
    if (this.isPlaying) {
      // Pause icon (two bars)
      icon.rect(-3, -6, 2, 12);
      icon.rect(1, -6, 2, 12);
      icon.fill({ color: 0xffffff });
    } else {
      // Play icon (triangle)
      icon.moveTo(-4, -6);
      icon.lineTo(-4, 6);
      icon.lineTo(6, 0);
      icon.fill({ color: 0xffffff });
    }
    button.addChild(icon);
  }

  private drawEyeIcon(button: Container, crossed: boolean): void {
    const icon = new Graphics();
    
    if (crossed) {
      // Eye with slash
      icon.ellipse(0, 0, 8, 5);
      icon.stroke({ color: 0xffffff, width: 1.5 });
      icon.circle(0, 0, 2);
      icon.fill({ color: 0xffffff });
      // Diagonal slash
      icon.moveTo(-6, -4);
      icon.lineTo(6, 4);
      icon.stroke({ color: 0xff4444, width: 2 });
    } else {
      // Regular eye
      icon.ellipse(0, 0, 8, 5);
      icon.stroke({ color: 0xffffff, width: 1.5 });
      icon.circle(0, 0, 2);
      icon.fill({ color: 0xffffff });
    }
    
    button.addChild(icon);
  }

  private updatePlayButtonIcon(): void {
    const playButton = (this.controlsContainer as any)?.playButton;
    if (!playButton) return;
    
    // Remove old icon
    playButton.children.slice(1).forEach((child: any) => playButton.removeChild(child));
    
    // Redraw icon
    this.drawPlayIcon(playButton);
  }

  private updateTimelineProgress(): void {
    const timelineProgress = (this.controlsContainer as any)?.timelineProgress;
    const timelineHandle = (this.controlsContainer as any)?.timelineHandle;
    
    if (timelineProgress && timelineHandle) {
      // Update progress bar width (240px total timeline width)
      const progressWidth = 240 * this.t;
      timelineProgress.clear();
      timelineProgress.roundRect(0, 0, progressWidth, 6, 3);
      timelineProgress.fill({ color: 0x80bfff });
      
      // Update handle position (-120 to +120 range)
      timelineHandle.position.x = -120 + (240 * this.t);
    }
  }

  private updatePathVisibility(): void {
    const hide = this.hideTrajDuringPlayback && this.isPlaying;
    if (this.livePreview) this.livePreview.visible = true; // live preview always visible
    this.pathVisuals.forEach(v => {
      v.pathGraphic.visible = !hide;
      v.anchors.forEach(a => a.visible = !hide);
    });
  }

  private updateHideToggleIcon(): void {
    if (!this.hideTrajButton) return;
    const icon = this.hideTrajButton.querySelector('img') as HTMLImageElement;
    if (icon) {
      icon.src = this.hideTrajDuringPlayback ? '/src/assets/icons/eye-off-icon.svg' : '/src/assets/icons/eye.svg';
    }
  }

  private toggleTrajectoryVisibility(): void {
    this.hideTrajDuringPlayback = !this.hideTrajDuringPlayback;
    this.updateHideToggleIcon();
    this.updatePathVisibility();
  }

  private attachGlobalPointerListeners(): void {
    if (this.usingGlobalPointerTracking) return;
    const stage = animationState.getApp()?.stage;
    if (!stage) return;
    if (!this.pointerMoveHandler) {
      this.pointerMoveHandler = (evt: FederatedPointerEvent) => this.onGlobalPointerMove(evt);
    }
    if (!this.pointerUpHandler) {
      this.pointerUpHandler = (evt: FederatedPointerEvent) => this.onGlobalPointerUp(evt);
    }
    stage.on('pointermove', this.pointerMoveHandler);
    stage.on('pointerup', this.pointerUpHandler);
    stage.on('pointerupoutside', this.pointerUpHandler);
    this.usingGlobalPointerTracking = true;
  }

  private detachGlobalPointerListeners(): void {
    if (!this.usingGlobalPointerTracking) return;
    const stage = animationState.getApp()?.stage;
    if (!stage) return;
    if (this.pointerMoveHandler) {
      stage.off('pointermove', this.pointerMoveHandler);
    }
    if (this.pointerUpHandler) {
      stage.off('pointerup', this.pointerUpHandler);
      stage.off('pointerupoutside', this.pointerUpHandler);
    }
    this.usingGlobalPointerTracking = false;
  }

  private onGlobalPointerMove(event: FederatedPointerEvent): void {
    if (this.activeAnchor) {
      this.updateActiveAnchorPosition(event);
      event.stopPropagation();
      return;
    }
    if (this.isTimelineDragging) {
      this.updateTimelineFromEvent(event);
      event.stopPropagation();
      return;
    }
    if (this.interactionState) {
      this.updateSceneInteraction(event);
      event.stopPropagation();
    }
  }

  private onGlobalPointerUp(event: FederatedPointerEvent): void {
    let handled = false;
    if (this.activeAnchor) {
      this.activeAnchor = null;
      handled = true;
    }
    if (this.isTimelineDragging) {
      this.isTimelineDragging = false;
      handled = true;
    }
    if (this.interactionState) {
      this.interactionState = null;
      this.drawBorder();
      this.layoutInteractionHandles();
      handled = true;
    }
    if (!this.isTimelineDragging && !this.interactionState) {
      this.detachGlobalPointerListeners();
    }
    if (handled) {
      event.stopPropagation();
    }
  }

  private updateTimelineFromEvent(_event: FederatedPointerEvent): void {
    // This method is no longer needed since we handle timeline interaction in DOM
    // The addTimelineInteraction method handles click and drag for DOM timeline
  }

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  private updateControls(): void {
    // Update PIXI controls instead of DOM controls
    this.updatePlayButtonIcon();
    this.updateTimelineProgress();
    this.updatePathVisibility();
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
    
  }

  private setHovered(hovered: boolean): void {
    if (!this.isSelected) {
      this.borderGraphics.alpha = hovered ? 0.8 : 0.5;
    }
  }

  setSelected(selected: boolean): void {
    this.isSelected = selected;
    this.drawBorder();
    this.layoutInteractionHandles();
  }

  getRoot(): Container {
    return this.root;
  }

  getContentContainer(): Container {
    return this.contentContainer;
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
    this.applyBounds(newBounds);
  }

  scale(scaleX: number, scaleY: number): void {
    this.root.scale.set(scaleX, scaleY);
  }

  addObject(object: Container): void {
    const uiLayer = animationState.getUiLayer();
    if (uiLayer) {
      const globalPos = object.getGlobalPosition();
      // Convert to content container local coordinates (centered coordinate system)
      const localPos = this.contentContainer.toLocal(globalPos, uiLayer);
      
      if (object.parent) {
        object.parent.removeChild(object);
      }
      
      // Assign unique ID for animation tracking
      if (!(object as any).objectId) {
        (object as any).objectId = `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      }

      
      object.position.set(localPos.x, localPos.y);
      // Add to content container instead of root so it gets clipped
      this.contentContainer.addChild(object);
          }
  }

  removeObject(object: Container): void {
    if (object.parent === this.contentContainer) {
      this.contentContainer.removeChild(object);
    } else if (object.parent === this.root) {
      this.root.removeChild(object);
    }
  }

  getObjects(): Container[] {
    return this.contentContainer.children.filter(child => child instanceof Container) as Container[];
  }

  destroy(): void {
    // Stop animation
    this.pause();
    this.detachGlobalPointerListeners();
    
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
      // Check both scene-specific and global loop settings
      const shouldLoop = this.loopEnabled || animationState.getLoop();
      if (shouldLoop) {
        this.t = 0; // Reset to beginning
        this.lastTime = performance.now(); // Reset timing for smooth looping
      } else {
        this.t = 1;
        this.pause();
        return; // Exit early when not looping
      }
    }
    
    this.updateAnimationObjects();
    this.updateControls();
    
    // Continue animation loop
    if (this.isPlaying) {
      this.animationFrame = requestAnimationFrame(() => this.startAnimationLoop());
    }
  }

  private updateAnimationObjects(): void {
    // Animate objects along their paths using scene-relative coordinates
    this.animationPaths.forEach((path, objectId) => {
      const object = this.findObjectById(objectId);
      if (object && path.points.length >= 2) {
        const pathPosition = this.interpolateAlongPath(path.points, this.t);
        
        // Since path points represent the desired center position of the object,
        // we need to position the object so its center aligns with the path point
        const bounds = object.getBounds();
        const objectCenterGlobal = new Point(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2
        );
        
        // Convert the current object center to content container coordinates
        const currentCenterLocal = this.contentContainer.toLocal(objectCenterGlobal);
        
        // Calculate the offset needed to move the center to the path position
        const centerOffsetX = pathPosition.x - currentCenterLocal.x;
        const centerOffsetY = pathPosition.y - currentCenterLocal.y;
        
        // Move the object by the offset
        object.position.x += centerOffsetX;
        object.position.y += centerOffsetY;
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
    for (const child of this.contentContainer.children) {
      if ((child as any).objectId === objectId) {
        return child as Container;
      }
    }
    return null;
  }

  // Method for PathTool to add animation paths
  addAnimationPath(objectId: string, points: Point[]): void {
    const targetObject = this.findObjectById(objectId);
    let boundsOffsetX = 0;
    let boundsOffsetY = 0;
    
    if (targetObject) {
      // Get the object's bounds to account for visual offset
      const bounds = targetObject.getBounds();
      boundsOffsetX = bounds.x - targetObject.position.x;
      boundsOffsetY = bounds.y - targetObject.position.y;
    }
    
    this.animationPaths.set(objectId, {
      objectId,
      points: [...points],
      startTime: 0,
      duration: this.duration,
      boundsOffsetX,
      boundsOffsetY
    });
    const first = points[0];
    if (targetObject && first) {
      
      // Get the object's bounds to account for visual offset
      const bounds = targetObject.getBounds();
      
      // Try center-based positioning approach
      // Convert path point from root space to contentContainer local space
      const localFirst = this.contentContainer.toLocal(new Point(first.x, first.y), this.root);
      
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;
      const centerOffsetX = centerX - targetObject.position.x;
      const centerOffsetY = centerY - targetObject.position.y;
      
      // Position the object so its center aligns with the local path point
      targetObject.position.set(localFirst.x - centerOffsetX, localFirst.y - centerOffsetY);
      
      const boundsAfter = targetObject.getBounds();
      // Clear any existing debug markers
      const existingMarker = this.pathOverlay!.getChildByName('DebugMarker');
      if (existingMarker) {
        this.pathOverlay!.removeChild(existingMarker);
      }
      const existingObjectMarker = this.contentContainer.getChildByName('ObjectDebugMarker');
      if (existingObjectMarker) {
        this.contentContainer.removeChild(existingObjectMarker);
      }
      
      // Add a visual debug marker at the first path point in pathOverlay
      const debugMarker = new Graphics();
      debugMarker.circle(0, 0, 8);
      debugMarker.fill({ color: 0xff0000, alpha: 0.7 }); // Red circle
      debugMarker.position.set(first.x, first.y);
      debugMarker.name = 'DebugMarker';
      this.pathOverlay!.addChild(debugMarker);

      
      // Add a blue marker at object center in contentContainer
      const objectMarker = new Graphics();
      objectMarker.circle(0, 0, 6);
      objectMarker.fill({ color: 0x0000ff, alpha: 0.7 }); // Blue circle
      // Position the blue marker at the local path point (where object center should be)
      objectMarker.position.set(localFirst.x, localFirst.y);
      objectMarker.name = 'ObjectDebugMarker';
      this.contentContainer.addChild(objectMarker);

    }
    this.refreshPathVisual(objectId);
    this.updatePathInteractivity();
    this.setTime(0);
  }

  // NEW: Method for PathTool to add animation paths directly in scene-relative coordinates
  addAnimationPathSceneRelative(objectId: string, points: Point[]): void {

    
    // Store animation path with scene-relative coordinates directly
    this.animationPaths.set(objectId, {
      objectId,
      points: [...points],
      startTime: 0,
      duration: this.duration
    });
    
    // Position object at the first path point
    const targetObject = this.findObjectById(objectId);
    if (targetObject && points.length > 0) {
      const firstPoint = points[0];
      
      // Get the object's current center position in scene coordinates
      const bounds = targetObject.getBounds();
      const objectCenterGlobal = new Point(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      );
      const currentCenterLocal = this.contentContainer.toLocal(objectCenterGlobal);
      
      // Calculate offset to move center to first path point
      const offsetX = firstPoint.x - currentCenterLocal.x;
      const offsetY = firstPoint.y - currentCenterLocal.y;
      
      // Apply the offset to position object correctly
      targetObject.position.x += offsetX;
      targetObject.position.y += offsetY;
      
    }
    
    this.refreshPathVisual(objectId);
    this.updatePathInteractivity();
    this.setTime(0);
  }

  // NEW: Method for PathTool to add animation paths in container space
  addAnimationPathInContainerSpace(objectId: string, points: Point[], sourceContainer: Container): void {
    // Convert points from source container space to our coordinate system
    const convertedPoints = points.map(p => {
      // Convert from source container to global, then to our root space
      const globalPoint = sourceContainer.toGlobal(new Point(p.x, p.y));
      return this.root.toLocal(globalPoint);
    });

    
    // Use the standard method with converted points
    this.addAnimationPath(objectId, convertedPoints);
  }

  // Method to set animation duration
  setDuration(milliseconds: number): void {
    this.duration = Math.max(100, milliseconds);
    this.updateControls();
  }

  getDuration(): number {
    return this.duration;
  }

  getTime(): number {
    return this.t;
  }

  isPlayingAnimation(): boolean {
    return this.isPlaying;
  }

  setLoop(enabled: boolean): void {
    this.loopEnabled = enabled;
  }

  showBorder(visible: boolean): void {
    this.borderGraphics.visible = visible;
  }

  setBorderVisible(visible: boolean): void {
    this.borderGraphics.visible = visible;
  }

  // --- Helpers & new behaviors ---
  private nudgeTimeSeconds(deltaSec: number): void {
    const totalSec = this.duration / 1000;
    const currentSec = this.t * totalSec;
    const nextSec = Math.max(0, Math.min(totalSec, currentSec + deltaSec));
    this.setTime(nextSec / totalSec);
  }

  // Live trajectory preview during drag
  showLivePathPreview(points: Point[]): void {
    if (!this.pathOverlay) return;
    if (!this.livePreview) {
      this.livePreview = new Graphics();
      this.livePreview.name = 'SceneLivePathPreview';
      this.pathOverlay.addChild(this.livePreview);
    }
    const overlayPts = points.map(p => this.pathOverlay!.toLocal(this.contentContainer.toGlobal(p)));
    this.livePreview.clear();
    if (overlayPts.length >= 2) {
      this.livePreview.moveTo(overlayPts[0].x, overlayPts[0].y);
      for (let i = 1; i < overlayPts.length; i++) this.livePreview.lineTo(overlayPts[i].x, overlayPts[i].y);
      this.livePreview.stroke({ color: 0x4a79a4, width: 2, alpha: 0.85 });
    }
    this.livePreview.visible = true;
  }

  clearLivePathPreview(): void {
    if (this.livePreview) {
      this.livePreview.clear();
      this.livePreview.visible = false;
    }
  }
}
