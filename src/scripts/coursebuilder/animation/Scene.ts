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
    // Mark content container for internal tracking (but don't make it appear in layers)
    (this.contentContainer as any).__sceneContent = true;
    (this.contentContainer as any).__parentSceneId = this.id;
    
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
    
    // Set the scene ID for identification and mark as user content for layers
    (this.root as any).__sceneRef = this;
    (this.root as any).__sceneId = this.id;
    (this.root as any).__toolType = 'scene'; // Mark as user content for layers panel
    (this.root as any).__meta = { kind: 'video', name: `Animation Scene ${this.id.split('_')[1]}` };
    
    // Make the container interactive for selection/scaling only
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    
    // Add hover effects
    this.root.on('pointerover', () => this.setHovered(true));
    this.root.on('pointerout', () => this.setHovered(false));
    this.root.on('pointerdown', (event) => this.handleRootPointerDown(event));
    
    // Register with animation state - add to drawing layer so it appears in layers panel
    const displayManager = animationState.getDisplayManager();
    if (displayManager) {
      // Use display manager to add to drawing layer so it appears in layers panel
      displayManager.add(this.root);
      animationState.addScene(this);
    } else {
      // Fallback to UI layer if display manager not available
      const uiLayer = animationState.getUiLayer();
      if (uiLayer) {
        uiLayer.addChild(this.root);
        animationState.addScene(this);
      }
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

    // Drag handle removed - scenes are now draggable like regular objects

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
      // Only show resize handles when selected
      handle.visible = this.isSelected;
      handle.eventMode = this.isSelected ? 'static' : 'none';
      handle.alpha = 1.0;
    });

    // Drag handle removed - scenes now behave like regular selectable objects

    // Update PIXI controls position and scale - now positioned inside scene
    if (this.controlsContainer) {
      // Always show controls
      this.controlsContainer.visible = true;
      this.controlsContainer.eventMode = 'static';
      this.controlsContainer.alpha = 0.9; // Slightly transparent
      
      // Position controls INSIDE the scene at the bottom
      this.controlsContainer.position.set(midX, h - 35); // 35px from bottom, inside scene
      
      // Scale controls proportionally with scene size (but with reasonable limits)
      const scaleX = w / 400; // Base scene width for reference
      const scaleY = h / 300; // Base scene height for reference
      const avgScale = (scaleX + scaleY) / 2;
      const controlScale = Math.max(0.6, Math.min(1.0, avgScale)); // Smaller scale since inside scene
      this.controlsContainer.scale.set(controlScale);
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
    (anchor as any).__isVisualAid = true; // Mark for layer filtering
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
    // Don't interfere with scene controls
    if (target && target.__sceneControl) {
      return;
    }
    
    // Let the selection tool handle selection and movement
    // Don't prevent event propagation - let SelectionTool see this event
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
    
    // Create timeline background - THICKER for better visibility
    const timelineBg = new Graphics();
    timelineBg.roundRect(-120, -5, 240, 10, 5); // 240px wide timeline, 10px thick
    timelineBg.fill({ color: 0xf0f0f0 });
    timelineBg.position.set(0, timelineY);
    timelineBg.eventMode = 'static';
    timelineBg.cursor = 'pointer';
    
    // Add timeline click functionality for direct seeking
    timelineBg.on('pointerdown', (e) => {
      const local = timelineBg.toLocal(e.global);
      const relativeX = local.x + 120; // Convert to 0-240 range
      const newT = Math.max(0, Math.min(1, relativeX / 240));
      this.setTime(newT);
      e.stopPropagation();
    });
    
    this.registerSceneControl(timelineBg);
    this.controlsContainer.addChild(timelineBg);
    
    // Create timeline progress - THICKER to match background
    const timelineProgress = new Graphics();
    const initialProgress = 240 * this.t; // Start with current time progress
    timelineProgress.roundRect(0, 0, initialProgress, 10, 5);
    timelineProgress.fill({ color: 0x80bfff });
    timelineProgress.position.set(-120, timelineY - 5);
    this.controlsContainer.addChild(timelineProgress);
    
    // Create timeline handle - LARGER for better visibility
    const timelineHandle = new Graphics();
    timelineHandle.circle(0, 0, 10);
    timelineHandle.fill({ color: 0x80bfff });
    timelineHandle.stroke({ color: 0xffffff, width: 2 });
    timelineHandle.position.set(-120 + (240 * this.t), timelineY); // Position based on current time
    timelineHandle.eventMode = 'static';
    timelineHandle.cursor = 'pointer';
    this.registerSceneControl(timelineHandle);
    
    // Add timeline handle drag functionality
    timelineHandle.on('pointerdown', (e) => {
      this.isTimelineDragging = true;
      this.attachGlobalPointerListeners();
      e.stopPropagation();
    });
    
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
    
    // Hide trajectory button (eye icon) - NOW BLUE like other controls
    const hideButton = this.createPixiButton(buttonSpacing * 1.5, buttonY, buttonSize, 0x80bfff); // Blue like other buttons
    this.drawEyeIcon(hideButton, false); // Start with eye open
    hideButton.on('pointerdown', () => this.toggleTrajectoryVisibility());
    this.controlsContainer.addChild(hideButton);
    
    // Store references for updates
    (this.controlsContainer as any).timelineProgress = timelineProgress;
    (this.controlsContainer as any).timelineHandle = timelineHandle;
    (this.controlsContainer as any).playButton = playButton;
    (this.controlsContainer as any).hideButton = hideButton;
    
    // Position the controls container INSIDE the scene at the bottom
    this.controlsContainer.position.set(midX, h - 35); // 35px from bottom, inside scene
    // Always show controls when scene is visible
    this.controlsContainer.visible = true;
    this.controlsContainer.alpha = 0.9; // Slightly transparent so content behind is visible
    
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
      // Eye with WHITE slash (when trajectories are hidden)
      icon.ellipse(0, 0, 8, 5);
      icon.stroke({ color: 0xffffff, width: 1.5 });
      icon.circle(0, 0, 2);
      icon.fill({ color: 0xffffff });
      // WHITE diagonal slash through the eye
      icon.moveTo(-6, -4);
      icon.lineTo(6, 4);
      icon.stroke({ color: 0xffffff, width: 2.5 }); // WHITE and thicker for visibility
    } else {
      // Regular eye (when trajectories are visible)
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
      // Update progress bar width (240px total timeline width) - THICKER
      const progressWidth = 240 * this.t;
      timelineProgress.clear();
      timelineProgress.roundRect(0, 0, progressWidth, 10, 5);
      timelineProgress.fill({ color: 0x80bfff });
      
      // Update handle position (-120 to +120 range)
      const handleX = -120 + (240 * this.t);
      timelineHandle.position.x = handleX;
      
      // Update handle appearance when at the end - LARGER handle
      if (this.t >= 1) {
        timelineHandle.clear();
        timelineHandle.circle(0, 0, 10);
        timelineHandle.fill({ color: 0xff6b6b }); // Red color when at end
        timelineHandle.stroke({ color: 0xffffff, width: 2 });
      } else {
        timelineHandle.clear();
        timelineHandle.circle(0, 0, 10);
        timelineHandle.fill({ color: 0x80bfff }); // Normal blue color
        timelineHandle.stroke({ color: 0xffffff, width: 2 });
      }
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
    // Update PIXI eye button icon
    const hideButton = (this.controlsContainer as any)?.hideButton;
    if (hideButton) {
      // Remove old icon (keep background, remove icon graphics)
      hideButton.children.slice(1).forEach((child: any) => hideButton.removeChild(child));
      
      // Redraw icon with current state
      this.drawEyeIcon(hideButton, this.hideTrajDuringPlayback);
    }
    
    // Legacy HTML button support (if it exists)
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

  private updateTimelineFromEvent(event: FederatedPointerEvent): void {
    // Handle timeline dragging for PIXI controls
    if (!this.controlsContainer || !this.isTimelineDragging) return;
    
    const timelineBg = this.controlsContainer.children.find(child => 
      child instanceof Graphics && child.width > 200 // Find the timeline background
    ) as Graphics;
    
    if (timelineBg) {
      const local = timelineBg.toLocal(event.global);
      const relativeX = local.x + 120; // Convert to 0-240 range
      const newT = Math.max(0, Math.min(1, relativeX / 240));
      this.setTime(newT);
    }
  }

  private togglePlayback(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      // If at the end of the animation, restart from beginning
      if (this.t >= 1) {
        this.setTime(0);
      }
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
    
    if (this.isSelected) {
      // Full border with resize handles when selected
      const alpha = 0.6;
      const color = 0x4a79a4;
      
      this.borderGraphics
        .roundRect(0, 0, this.bounds.width, this.bounds.height, 4)
        .stroke({ 
          color: color, 
          width: 2, 
          alpha: alpha 
        });
    } else {
      // Subtle border when not selected (to remind that something is there)
      this.borderGraphics
        .roundRect(0, 0, this.bounds.width, this.bounds.height, 4)
        .stroke({ 
          color: 0x999999, 
          width: 1, 
          alpha: 0.2 
        });
    }
  }

  private setHovered(hovered: boolean): void {
    // Only show visual feedback on hover if not selected
    if (!this.isSelected && hovered) {
      // Show a subtle border on hover
      this.borderGraphics.clear();
      this.borderGraphics
        .roundRect(0, 0, this.bounds.width, this.bounds.height, 4)
        .stroke({ 
          color: 0x888888, 
          width: 1, 
          alpha: 0.4 
        });
    } else if (!this.isSelected && !hovered) {
      // Clear border when not hovered and not selected
      this.borderGraphics.clear();
    }
  }

  setSelected(selected: boolean): void {
    if (this.isSelected !== selected) {
      this.isSelected = selected;
      this.drawBorder();
      this.layoutInteractionHandles();
    }
  }

  getSelected(): boolean {
    return this.isSelected;
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
    // Simple and robust bounds checking using the scene's global position and size
    const globalBounds = this.getGlobalBounds();
    const result = pt.x >= globalBounds.x && pt.x <= globalBounds.x + globalBounds.width &&
                   pt.y >= globalBounds.y && pt.y <= globalBounds.y + globalBounds.height;
    
    console.log('🎬 Scene.contains:', {
      point: pt,
      globalBounds,
      result
    });
    
    return result;
  }
  
  getGlobalBounds(): { x: number; y: number; width: number; height: number } {
    // Use the scene border graphics which represents the actual visual bounds
    try {
      if (this.borderGraphics) {
        const borderBounds = this.borderGraphics.getBounds();
        return {
          x: borderBounds.x,
          y: borderBounds.y,
          width: borderBounds.width,
          height: borderBounds.height
        };
      }
    } catch (error) {
      console.warn('Failed to get border bounds:', error);
    }
    
    // Fallback: use the stored bounds directly since they should be in global coordinates
    return {
      x: this.bounds.x,
      y: this.bounds.y,
      width: this.bounds.width,
      height: this.bounds.height
    };
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
      
      // Get the DisplayObjectManager to properly handle the object transfer
      const displayManager = animationState.getDisplayManager();
      
      if (object.parent) {
        object.parent.removeChild(object);
      }
      
      // Assign unique ID for animation tracking
      if (!(object as any).objectId) {
        (object as any).objectId = `obj_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      }

      // Mark the object as scene content for layers panel
      (object as any).__inScene = true;
      (object as any).__parentSceneId = this.id;
      
      // Ensure the object has some tool type so it shows up in layers
      if (!(object as any).__toolType && !(object as any).__meta?.kind) {
        // Try to detect what type of object this is
        if (object.constructor?.name === 'Text') {
          (object as any).__toolType = 'text';
        } else if (object.constructor?.name === 'Graphics') {
          (object as any).__toolType = 'graphics';
        } else if (object.constructor?.name === 'Sprite') {
          (object as any).__toolType = 'sprite';
        } else if (object.children && object.children.length > 0) {
          (object as any).__toolType = 'container';
        } else {
          (object as any).__toolType = 'object';
        }
      }
      
      object.position.set(localPos.x, localPos.y);
      // Add to content container instead of root so it gets clipped
      this.contentContainer.addChild(object);
      
      // If there's a display manager, make sure it knows about the new parent relationship
      if (displayManager) {
        // Update the display manager's tracking of this object
        const objectId = (object as any).__id || (object as any).objectId;
        if (objectId && displayManager.get(objectId)) {
          // Object was previously managed by DisplayObjectManager
          // We don't remove it from the manager since it still exists, just in a different parent
          console.log('🎬 Scene: Object', objectId, 'moved to scene content container');
        }
      }
      
      // Notify layers panel that an object was added to scene
      try {
        document.dispatchEvent(new CustomEvent('displayObject:added', { 
          detail: { id: (object as any).objectId || (object as any).__id, object: object } 
        }));
      } catch { /* empty */ }
    }
  }

  removeObject(object: Container): void {
    if (object.parent === this.contentContainer) {
      this.contentContainer.removeChild(object);
      
      // Clean up scene-related properties
      delete (object as any).__inScene;
      delete (object as any).__parentSceneId;
      
      // Move object back to main drawing layer
      const displayManager = animationState.getDisplayManager();
      if (displayManager) {
        // Add back to drawing layer via display manager
        displayManager.add(object);
        console.log('🎬 Scene: Object moved from scene back to drawing layer');
      } else {
        // Fallback: add to UI layer
        const uiLayer = animationState.getUiLayer();
        if (uiLayer) {
          uiLayer.addChild(object);
        }
      }
      
      // Notify layers panel that object was removed from scene
      try {
        document.dispatchEvent(new CustomEvent('displayObject:removed', { 
          detail: { id: (object as any).objectId || (object as any).__id, object: object } 
        }));
        document.dispatchEvent(new CustomEvent('displayObject:added', { 
          detail: { id: (object as any).objectId || (object as any).__id, object: object } 
        }));
      } catch { /* empty */ }
    } else if (object.parent === this.root) {
      this.root.removeChild(object);
    }
  }

  getObjects(): Container[] {
    return this.contentContainer.children.filter(child => child instanceof Container) as Container[];
  }

  /**
   * Check if an object is currently inside this scene
   */
  containsObject(object: Container): boolean {
    return (object as any).__parentSceneId === this.id || object.parent === this.contentContainer;
  }

  /**
   * Move all objects out of this scene back to the main drawing layer
   */
  moveAllObjectsOut(): void {
    const objects = this.getObjects();
    objects.forEach(obj => this.removeObject(obj));
  }

  /**
   * Remove animation path from an object
   */
  removeAnimationPath(objectId: string): void {
    if (this.animationPaths.has(objectId)) {
      this.animationPaths.delete(objectId);
      
      // Find the object and remove trajectory marking
      const targetObject = this.findObjectById(objectId);
      if (targetObject) {
        delete (targetObject as any).__hasTrajectory;
        delete (targetObject as any).__trajectoryId;
        
        // Notify layers panel of the change
        try {
          document.dispatchEvent(new CustomEvent('displayObject:updated', { 
            detail: { id: objectId, object: targetObject } 
          }));
        } catch { /* empty */ }
      }
      
      // Clear path visual if it exists
      const visual = this.pathVisuals.get(objectId);
      if (visual) {
        // Remove visual elements from the scene
        if (visual.container.parent) {
          visual.container.parent.removeChild(visual.container);
        }
        visual.container.destroy({ children: true });
        this.pathVisuals.delete(objectId);
      }
      console.log('🎬 Scene: Removed animation path for object', objectId);
    }
  }

  /**
   * Check if an object has an animation path
   */
  hasAnimationPath(objectId: string): boolean {
    return this.animationPaths.has(objectId);
  }

  destroy(): void {
    // Stop animation
    this.pause();
    this.detachGlobalPointerListeners();
    
    // Remove from animation state
    animationState.removeScene(this);
    
    // Clean up HTML controls if they exist
    if (this.hideTrajButton && this.hideTrajButton.parentNode) {
      this.hideTrajButton.parentNode.removeChild(this.hideTrajButton);
    }
    
    // Clean up event listeners
    this.root.removeAllListeners();
    
    // Clear visual elements
    this.borderGraphics?.clear();
    this.pathVisuals.clear();
    this.resizeHandles.clear();
    
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

    // Apply property modifications from ModifyTool at current time
    this.updateObjectPropertyModifications();
  }

  private updateObjectPropertyModifications(): void {
    // Get all objects in the scene and apply their property modifications
    this.contentContainer.children.forEach(child => {
      try {
        // Get the modify tool and apply property changes for current time
        const modifyTool = this.getModifyTool();
        if (modifyTool) {
          modifyTool.updateObjectPropertiesForTime(child, this.t);
        }
      } catch (error) {
        // Silently handle any errors to prevent animation disruption
      }
    });
  }

  private getModifyTool(): any {
    try {
      const toolManager = (window as any).toolManager;
      return toolManager?.tools?.get?.('modify');
    } catch {
      return null;
    }
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
