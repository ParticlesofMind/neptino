/**
 * Visual rendering  public clearAll(): void {
    // Clear graphics content without destroying objects
    if (this.guideGfx) {
      this.guideGfx.clear();
    }
    if (this.distanceGfx) {
      this.distanceGfx.clear();
    }
    if (this.gridGfx) {
      this.gridGfx.clear();
    }
    if (this.labelContainer) {
      this.labelContainer.removeChildren();
    }
  }nes and labels
 */

import { Graphics, Container, Text } from 'pixi.js';
import { AlignmentGuide, DistanceLabel, EqualSpacingGroup } from './types';
import { GUIDE_COLORS, GUIDE_LIMITS, VISUAL_SETTINGS } from './config';

export class GuideRenderer {
  private guideGfx: Graphics | null = null;
  private distanceGfx: Graphics | null = null;
  private gridGfx: Graphics | null = null;
  private labelContainer: Container | null = null;
  private ui: Container | null = null;

  public initialize(ui: Container): void {
    this.ui = ui;
    this.initializeGuideGraphics(ui);
    this.initializeDistanceGraphics(ui);
    this.initializeGridGraphics(ui);
    this.initializeLabelContainer(ui);
  }

  public clear(): void {
    // Clear graphics content without destroying objects
    if (this.guideGfx) {
      this.guideGfx.clear();
    }
    if (this.distanceGfx) {
      this.distanceGfx.clear();
    }
    if (this.labelContainer) {
      this.labelContainer.removeChildren();
    }
  }

  /**
   * Render alignment guides as blue lines with enhanced visibility
   */
  public drawAlignmentGuides(guides: AlignmentGuide[]): void {
    // Ensure graphics object exists
    if (!this.guideGfx && this.ui) {
      this.initializeGuideGraphics(this.ui);
    }
    if (!this.guideGfx) return;
    
    // Clear previous guides
    this.guideGfx.clear();
    
    console.log(`🔵 Drawing ${guides.length} alignment guides`);
    
    for (const guide of guides.slice(0, GUIDE_LIMITS.MAX_ALIGNMENT_GUIDES)) {
      // Enhanced alpha calculation for better visibility
      const baseAlpha = 0.8;
      const strengthMultiplier = Math.min(0.2, guide.strength * 0.05);
      const alpha = Math.min(1.0, baseAlpha + strengthMultiplier);
      
      // Stronger lines for object-to-object alignments
      const lineWidth = guide.objects.length > 0 ? 2 : 1;
      const color = GUIDE_COLORS.alignment;
      
      console.log(`🔵 Guide: ${guide.type} at ${guide.position}, strength: ${guide.strength}, alpha: ${alpha}`);
      
      if (guide.type === 'vertical') {
        // Draw full-height vertical line
        this.guideGfx
          .moveTo(Math.round(guide.position) + 0.5, -5000)
          .lineTo(Math.round(guide.position) + 0.5, 15000)
          .stroke({ width: lineWidth, color, alpha });
      } else {
        // Draw full-width horizontal line  
        this.guideGfx
          .moveTo(-5000, Math.round(guide.position) + 0.5)
          .lineTo(15000, Math.round(guide.position) + 0.5)
          .stroke({ width: lineWidth, color, alpha });
      }
    }
  }

  /**
   * Render distance labels with red backgrounds
   */
  public drawDistanceLabels(labels: DistanceLabel[]): void {
    // Ensure label container exists
    if (!this.labelContainer && this.ui) {
      this.initializeLabelContainer(this.ui);
    }
    if (!this.labelContainer) return;
    
    console.log(`🏷️ Drawing ${labels.length} distance labels`);
    
    for (const label of labels) {
      this.createDistanceLabel(
        label.x, 
        label.y, 
        `${Math.round(label.distance)}px`
      );
    }
  }

  /**
   * Render equal spacing guides as pink lines
   */
  public drawEqualSpacingGuides(groups: EqualSpacingGroup[]): void {
    // Ensure graphics object exists
    if (!this.guideGfx && this.ui) {
      this.initializeGuideGraphics(this.ui);
    }
    if (!this.guideGfx) return;
    
    console.log(`📐 Drawing ${groups.length} equal spacing groups`);
    
    for (const group of groups.slice(0, GUIDE_LIMITS.MAX_EQUAL_SPACING_GROUPS)) {
      const color = GUIDE_COLORS.equalSpacing;
      
      if (group.axis === 'x') {
        const y = group.objects[0].y + group.objects[0].height / 2;
        this.guideGfx
          .moveTo(group.startPos, Math.round(y) + 0.5)
          .lineTo(group.endPos, Math.round(y) + 0.5)
          .stroke({ width: 2, color, alpha: 0.8 });
        
        this.drawSpacingLabels(group, y, 'horizontal');
      } else {
        const x = group.objects[0].x + group.objects[0].width / 2;
        this.guideGfx
          .moveTo(Math.round(x) + 0.5, group.startPos)
          .lineTo(Math.round(x) + 0.5, group.endPos)
          .stroke({ width: 2, color, alpha: 0.8 });
        
        this.drawSpacingLabels(group, x, 'vertical');
      }
    }
  }

  private drawSpacingLabels(
    group: EqualSpacingGroup, 
    position: number, 
    orientation: 'horizontal' | 'vertical'
  ): void {
    for (let i = 0; i < group.objects.length - 1; i++) {
      const obj1 = group.objects[i];
      const obj2 = group.objects[i + 1];
      
      if (orientation === 'horizontal') {
        const midX = (obj1.x + obj1.width + obj2.x) / 2;
        this.createDistanceLabel(midX, position - 20, `${Math.round(group.gap)}px`);
      } else {
        const midY = (obj1.y + obj1.height + obj2.y) / 2;
        this.createDistanceLabel(position + 20, midY, `${Math.round(group.gap)}px`);
      }
    }
  }

  private createDistanceLabel(x: number, y: number, text: string): void {
    if (!this.labelContainer) return;
    
    const bg = new Graphics();
    const textObj = new Text({ 
      text, 
      style: { 
        fontFamily: 'Arial', 
        fontSize: 10, 
        fill: 0xffffff,
        fontWeight: 'bold'
      } 
    });
    
    const boxW = Math.ceil(textObj.width + VISUAL_SETTINGS.LABEL_PADDING_X * 2);
    const boxH = Math.ceil(textObj.height + VISUAL_SETTINGS.LABEL_PADDING_Y * 2);
    
    bg.rect(0, 0, boxW, boxH)
      .fill({ color: GUIDE_COLORS.distance, alpha: 1 });
    
    const container = new Container();
    container.eventMode = 'none';
    
    container.addChild(bg);
    container.addChild(textObj);
    textObj.position.set(VISUAL_SETTINGS.LABEL_PADDING_X, VISUAL_SETTINGS.LABEL_PADDING_Y);
    container.position.set(x - boxW / 2, y - boxH / 2);
    
    this.labelContainer.addChild(container);
  }

  private initializeGuideGraphics(ui: Container): void {
    if (!this.guideGfx) {
      this.guideGfx = new Graphics();
      this.guideGfx.zIndex = 10000;
      this.guideGfx.eventMode = 'none';
      // Mark as guide graphics so object detection can skip it
      (this.guideGfx as any).__isGuide = true;
      ui.addChild(this.guideGfx);
    } else {
      this.guideGfx.clear();
    }
  }

  private initializeDistanceGraphics(ui: Container): void {
    if (!this.distanceGfx) {
      this.distanceGfx = new Graphics();
      this.distanceGfx.zIndex = 10001;
      this.distanceGfx.eventMode = 'none';
      // Mark as guide graphics so object detection can skip it
      (this.distanceGfx as any).__isGuide = true;
      ui.addChild(this.distanceGfx);
    } else {
      this.distanceGfx.clear();
    }
  }

  private initializeGridGraphics(ui: Container): void {
    if (!this.gridGfx) {
      this.gridGfx = new Graphics();
      this.gridGfx.zIndex = 9999; // Below guides but above content
      this.gridGfx.eventMode = 'none';
      // Mark as guide graphics so object detection can skip it
      (this.gridGfx as any).__isGuide = true;
      ui.addChild(this.gridGfx);
    } else {
      this.gridGfx.clear();
    }
  }

  private initializeLabelContainer(ui: Container): void {
    if (!this.labelContainer) {
      this.labelContainer = new Container();
      this.labelContainer.zIndex = 10003;
      this.labelContainer.eventMode = 'none';
      // Mark as guide graphics so object detection can skip it
      (this.labelContainer as any).__isGuide = true;
      ui.addChild(this.labelContainer);
    } else {
      try { this.labelContainer.removeChildren(); } catch {}
    }
  }

  /**
   * Destroy and clean up all graphics (called when renderer is destroyed)
   */
  public destroy(): void {
    this.clearGraphics();
  }

  private clearGraphics(): void {
    if (this.guideGfx && this.guideGfx.parent) {
      this.guideGfx.parent.removeChild(this.guideGfx);
      this.guideGfx.destroy();
      this.guideGfx = null;
    }
    
    if (this.distanceGfx && this.distanceGfx.parent) {
      this.distanceGfx.parent.removeChild(this.distanceGfx);
      this.distanceGfx.destroy();
      this.distanceGfx = null;
    }
    
    if (this.labelContainer && this.labelContainer.parent) {
      this.labelContainer.parent.removeChild(this.labelContainer);
      this.labelContainer.destroy();
      this.labelContainer = null;
    }
  }

  /**
   * Render grid lines for grid reference mode
   */
  public renderGrid(ui: Container, canvasWidth: number, canvasHeight: number, spacing: number): void {
    // Initialize grid graphics if needed
    if (!this.gridGfx && ui) {
      this.initializeGridGraphics(ui);
    }
    
    if (!this.gridGfx) {
      console.warn('⚠️ Grid graphics not initialized for grid rendering');
      return;
    }

    console.log('📐 Rendering grid:', { canvasWidth, canvasHeight, spacing });

    // Clear existing grid
    this.gridGfx.clear();

    // Set grid line style - lighter and more subtle than guide lines
    this.gridGfx.stroke({ width: 1, color: 0x007AFF, alpha: 0.2 });

    // Draw vertical grid lines
    for (let x = 0; x <= canvasWidth; x += spacing) {
      this.gridGfx.moveTo(x, 0);
      this.gridGfx.lineTo(x, canvasHeight);
    }

    // Draw horizontal grid lines
    for (let y = 0; y <= canvasHeight; y += spacing) {
      this.gridGfx.moveTo(0, y);
      this.gridGfx.lineTo(canvasWidth, y);
    }

    console.log('✅ Grid rendered with spacing:', spacing);
  }

  public clearGrid(): void {
    if (this.gridGfx) {
      this.gridGfx.clear();
      console.log('✅ Grid cleared');
    }
  }
}