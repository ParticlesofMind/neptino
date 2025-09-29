/**
 * Brush Tool
 * Authentic marker experience with professional colors and realistic behavior
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 BRUSH_COLORS,
 STROKE_SIZES,
 BRUSH_CONSTANTS,
 hexToNumber,
} from "./SharedResources";
import { BoundaryUtils } from "./BoundaryUtils";
import { createHighQualityGraphics, alignToPixel } from "../utils/graphicsQuality";
import { historyManager } from "../canvas/HistoryManager.js";

interface BrushSettings {
 color: string;
 size: number;
 opacity?: number;
}

export class BrushTool extends BaseTool {
  public isDrawing: boolean = false;
  private currentStroke: Graphics | null = null;
  private lastPoint: Point = new Point(0, 0);
  private strokePoints: Point[] = [];
  private constrainStart: Point | null = null; // anchor for shift-straight-line
    private currentStrokeOpacity: number = BRUSH_CONSTANTS.FIXED_OPACITY;

 constructor() {
         super("brush", "url('/src/assets/cursors/brush-cursor.svg') 3 21, crosshair");
 this.settings = {
 color: BRUSH_COLORS[0], // Start with classic yellow
 size: STROKE_SIZES.BRUSH[1], // Start with 12px
 opacity: BRUSH_CONSTANTS.FIXED_OPACITY,
 };
 console.log(`🎨 BRUSH constructor: Initial settings=${JSON.stringify(this.settings)}`);
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 this.isDrawing = true;

 // Create new graphics object for this stroke with authentic marker properties
 this.currentStroke = createHighQualityGraphics();
 this.currentStroke.eventMode = "static";
 const baseOpacity = this.resolveOpacity();
 this.currentStrokeOpacity = baseOpacity;
 this.currentStroke.alpha = baseOpacity; // Fixed opacity like real markers
  // Tag for selection-based option routing
  (this.currentStroke as any).__toolType = 'brush';

  // Use local coordinates relative to the container
  const localPoint = container.toLocal(event.global);

  // 🎨 CANVAS AREA: Allow drawing in canvas area
  const canvasBounds = BoundaryUtils.getCanvasDrawingBounds();
  console.log('🖌️ BrushTool onPointerDown: Point', localPoint, 'Bounds:', canvasBounds);
  
  if (!BoundaryUtils.isPointWithinBounds(localPoint, canvasBounds)) {
    console.log('🚫 BrushTool: Point outside canvas bounds, blocking draw');
    return; // Exit early - outside canvas area
  }
  
  console.log('✅ BrushTool: Point within canvas, allowing draw');

  // Align coordinates for pixel-perfect rendering, then clamp to canvas bounds
  const alignedPoint = { x: alignToPixel(localPoint.x), y: alignToPixel(localPoint.y) };
  const clampedAligned = BoundaryUtils.clampPoint(new Point(alignedPoint.x, alignedPoint.y), canvasBounds);

  this.lastPoint.copyFrom(clampedAligned);
  this.strokePoints = [new Point(clampedAligned.x, clampedAligned.y)];
  // If shift is held at stroke start, initialize constrain anchor
  this.constrainStart = (event as any).shiftKey ? new Point(clampedAligned.x, clampedAligned.y) : null;

 console.log(
 `🖍️ BRUSH: Container local point: (${Math.round(alignedPoint.x)}, ${Math.round(alignedPoint.y)})`,
 );

 // Set stroke style with authentic marker characteristics
 const color = hexToNumber(this.settings.color);
 console.log(
 `🎨 BRUSH onPointerDown: color=${this.settings.color} -> ${color} (hex: 0x${color.toString(16)}), width=${this.settings.size}, opacity=${baseOpacity}`,
 );

 // Start the drawing path - just moveTo, don't stroke yet
 this.currentStroke.moveTo(clampedAligned.x, clampedAligned.y);

 // Add to container
 container.addChild(this.currentStroke);
 console.log(
 `🖍️ BRUSH: Marker stroke started at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 // Only respond to move events when actively drawing
 if (!this.isDrawing || !this.currentStroke) return;

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);
 // Clamp to canvas bounds
 const canvasBoundsMove = BoundaryUtils.getCanvasDrawingBounds();
 let clampedLocal = BoundaryUtils.clampPoint(localPoint, canvasBoundsMove);
 // If shift is held, snap to straight line from constrainStart (or first point)
 const shiftHeld = (event as any).shiftKey === true;
 if (shiftHeld) {
   const anchor = this.constrainStart || (this.strokePoints.length > 0 ? this.strokePoints[0] : null);
   if (anchor) {
     const dx = clampedLocal.x - anchor.x;
     const dy = clampedLocal.y - anchor.y;
     const angle = Math.atan2(dy, dx);
     const step = Math.PI / 4; // 45-degree increments
     const snapped = Math.round(angle / step) * step;
     const dist = Math.hypot(dx, dy);
     clampedLocal = new Point(anchor.x + Math.cos(snapped) * dist, anchor.y + Math.sin(snapped) * dist);
     // Clamp the snapped point again to be safe
     clampedLocal = BoundaryUtils.clampPoint(clampedLocal, canvasBoundsMove);
   }
 } else {
   // If shift released, clear constrain anchor
   this.constrainStart = null;
 }

 // Implement stroke smoothing for authentic marker feel
 if (BRUSH_CONSTANTS.STROKE_SMOOTHING) {
 const distance = Math.sqrt(
   Math.pow(clampedLocal.x - this.lastPoint.x, 2) +
   Math.pow(clampedLocal.y - this.lastPoint.y, 2),
 );

 // Only draw if we've moved a minimum distance (reduces jitter)
 if (distance < BRUSH_CONSTANTS.MIN_DISTANCE) return;
 }

 console.log(
 `🖍️ BRUSH: Brushing to (${Math.round(clampedLocal.x)}, ${Math.round(clampedLocal.y)})`,
 );

 // Clear the current stroke and redraw the entire path
 this.currentStroke.clear();
 
 // Redraw the entire path
 if (this.strokePoints.length > 0) {
 this.currentStroke.moveTo(this.strokePoints[0].x, this.strokePoints[0].y);
 
 for (let i = 1; i < this.strokePoints.length; i++) {
 this.currentStroke.lineTo(this.strokePoints[i].x, this.strokePoints[i].y);
 }
 
 // Add the current point
 this.currentStroke.lineTo(clampedLocal.x, clampedLocal.y);
 
 // Apply the stroke style
 const previewColor = hexToNumber(this.settings.color);
 console.log(
   `🎨 BRUSH onPointerMove: PREVIEW stroke - color=${this.settings.color} -> ${previewColor} (hex: 0x${previewColor.toString(16)}), width=${this.settings.size}`
 );
 this.currentStroke.stroke({
 width: this.settings.size,
 color: previewColor,
 cap: "round",
 join: "round",
 });
 }

 // Add slight texture variation for authentic marker feel (preview only)
 const baseOpacity = this.resolveOpacity();
 const opacityVariation =
 1 + (Math.random() - 0.5) * BRUSH_CONSTANTS.TEXTURE_VARIATION;
 const adjustedOpacity = Math.max(
 0,
 Math.min(1, baseOpacity * opacityVariation),
 );

 // Apply subtle opacity variation to preview, but keep consistent base for final
 this.currentStrokeOpacity = baseOpacity; // Use base opacity for final stroke
 this.currentStroke.alpha = adjustedOpacity; // Use variation for preview
 
 console.log(
   `🎨 BRUSH onPointerMove: opacity - base=${baseOpacity}, variation=${opacityVariation.toFixed(3)}, adjusted=${adjustedOpacity.toFixed(3)}, final will use=${this.currentStrokeOpacity}`
 );

 // Update tracking
 this.lastPoint.copyFrom(clampedLocal);
 this.strokePoints.push(clampedLocal.clone());
 }

  onPointerUp(): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

  if (this.isDrawing) {
    console.log(
      `🖍️ BRUSH: Finished marker stroke with ${this.strokePoints.length} points`,
    );

    // Apply final authentic marker properties
    if (this.currentStroke) {
      // 🎨 CRITICAL FIX: Re-apply the final stroke style to ensure color consistency
      // Clear and redraw the final stroke with exact settings
      console.log(`🎨 BRUSH onPointerUp: STARTING FINAL STROKE RENDERING`);
      console.log(`🎨 BRUSH onPointerUp: settings.color=${this.settings.color}, final opacity=${this.currentStrokeOpacity}`);
      
      this.currentStroke.clear();
      
      if (this.strokePoints.length > 0) {
        this.currentStroke.moveTo(this.strokePoints[0].x, this.strokePoints[0].y);
        
        for (let i = 1; i < this.strokePoints.length; i++) {
          this.currentStroke.lineTo(this.strokePoints[i].x, this.strokePoints[i].y);
        }
        
        // Apply final stroke style with consistent color
        const finalColor = hexToNumber(this.settings.color);
        console.log(
          `🎨 BRUSH onPointerUp: FINAL stroke - color=${this.settings.color} -> ${finalColor} (hex: 0x${finalColor.toString(16)}), width=${this.settings.size}`
        );
        
        this.currentStroke.stroke({
          width: this.settings.size,
          color: finalColor,
          cap: "round",
          join: "round",
        });
        
        console.log(`🎨 BRUSH onPointerUp: Applied final stroke style`);
      }
      
      // Set final opacity
      this.currentStroke.alpha = this.currentStrokeOpacity;
      
      // 🎨 CRITICAL FIX: Ensure no tint is applied (tint can wash out colors)
      this.currentStroke.tint = 0xFFFFFF; // Explicitly set to white (no tint)
      
      // 🎨 DEBUG: Check for potential double-alpha issues
      const worldAlpha = (this.currentStroke as any).worldAlpha || this.currentStroke.alpha;
      const parentAlpha = this.currentStroke.parent ? (this.currentStroke.parent as any).alpha || 1 : 1;
      
      console.log(`🎨 BRUSH onPointerUp: Set final alpha to ${this.currentStrokeOpacity}`);
      console.log(`🎨 BRUSH onPointerUp: Alpha check - object: ${this.currentStroke.alpha}, world: ${worldAlpha}, parent: ${parentAlpha}`);
      
      // Log final Graphics object state
      console.log(`🎨 BRUSH onPointerUp: FINAL GRAPHICS STATE:`, {
        alpha: this.currentStroke.alpha,
        visible: this.currentStroke.visible,
        renderable: this.currentStroke.renderable,
        tint: (this.currentStroke as any).tint,
        blendMode: (this.currentStroke as any).blendMode,
        worldAlpha: (this.currentStroke as any).worldAlpha
      });
      
      // Try to inspect the graphics internal data
      try {
        const graphicsData = (this.currentStroke as any).geometry || (this.currentStroke as any)._geometry;
        if (graphicsData) {
          console.log(`🎨 BRUSH onPointerUp: Graphics geometry data:`, graphicsData);
        }
      } catch (e) {
        console.log(`🎨 BRUSH onPointerUp: Could not inspect graphics geometry:`, e);
      }
      
      // Attach metadata for later re-styling via selection
      try {
        const pts = this.strokePoints.map(p => ({ x: p.x, y: p.y }));
        (this.currentStroke as any).__meta = {
          kind: 'brush',
          points: pts,
          size: this.settings.size,
          color: this.settings.color,
          opacity: this.currentStrokeOpacity,
        };
      } catch {}

      // 🚨 CRITICAL: Register with DisplayObjectManager so it shows in layers panel
      if (this.displayManager) {
        try {
          // Check if already registered (object was added to container in onPointerDown)
          const existingId = this.displayManager.getIdForObject(this.currentStroke);
          if (!existingId) {
            // Register the completed stroke
            this.displayManager.add(this.currentStroke, this.currentStroke.parent || undefined);
            console.log('🖍️ BRUSH: Registered completed stroke with DisplayObjectManager');
          } else {
            console.log('🖍️ BRUSH: Stroke already registered with DisplayObjectManager');
          }
        } catch (error) {
          console.warn('Failed to register brush stroke with DisplayObjectManager:', error);
        }
      }

      // Add history entry for brush stroke creation
      try {
        const strokeRef = this.currentStroke;
        const parentContainer = strokeRef.parent as Container;
        const index = parentContainer ? parentContainer.getChildIndex(strokeRef) : -1;
        
        historyManager.push({
          label: 'Brush Stroke',
          undo: () => {
            try {
              // Remove from display
              if (strokeRef.parent) {
                strokeRef.parent.removeChild(strokeRef);
              }
              
              // Remove from DisplayObjectManager
              if (this.displayManager && (this.displayManager as any).remove) {
                (this.displayManager as any).remove(strokeRef);
              }
            } catch (error) {
              console.warn('Failed to undo brush stroke:', error);
            }
          },
          redo: () => {
            try {
              // Re-add to display
              if (parentContainer) {
                if (index >= 0 && index <= parentContainer.children.length) {
                  parentContainer.addChildAt(strokeRef, Math.min(index, parentContainer.children.length));
                } else {
                  parentContainer.addChild(strokeRef);
                }
              }
              
              // Re-register with DisplayObjectManager
              if (this.displayManager && (this.displayManager as any).add) {
                (this.displayManager as any).add(strokeRef, parentContainer);
              }
            } catch (error) {
              console.warn('Failed to redo brush stroke:', error);
            }
          }
        });
      } catch (error) {
        console.warn('Failed to add brush stroke to history:', error);
      }
    }
  }

 this.isDrawing = false;
 this.currentStroke = null;
 this.strokePoints = [];
 this.constrainStart = null;
 this.currentStrokeOpacity = this.resolveOpacity();
}

 updateSettings(settings: BrushSettings): void {
 console.log(`🎨 BRUSH updateSettings: OLD=${JSON.stringify(this.settings)} NEW=${JSON.stringify(settings)}`);
 this.settings = { ...this.settings, ...settings };
 if (typeof this.settings.opacity === 'number') {
   this.settings.opacity = Math.max(0, Math.min(1, this.settings.opacity));
 }
 console.log(`🎨 BRUSH updateSettings: FINAL=${JSON.stringify(this.settings)}`);
 }

 // Get available brush colors for UI
 static getAvailableColors(): string[] {
 return BRUSH_COLORS;
 }

 // Get available brush sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.BRUSH;
 }

 // Get authentic marker opacity (fixed like real brushes)
 static getMarkerOpacity(): number {
 return BRUSH_CONSTANTS.FIXED_OPACITY;
 }

 private resolveOpacity(): number {
 const settingOpacity = typeof this.settings?.opacity === 'number'
   ? this.settings.opacity
   : undefined;
 const opacity = settingOpacity ?? BRUSH_CONSTANTS.FIXED_OPACITY;
 const result = Math.max(0, Math.min(1, opacity));
 
 // 🎨 TEMPORARY FIX: Ensure minimum viable opacity for color vibrancy
 const minOpacity = 0.6; // Minimum 60% for good color visibility
 const finalResult = Math.max(result, minOpacity);
 
 console.log(`🎨 BRUSH resolveOpacity: setting=${settingOpacity}, fixed=${BRUSH_CONSTANTS.FIXED_OPACITY}, calculated=${result}, final=${finalResult}`);
 return finalResult;
 }
}
