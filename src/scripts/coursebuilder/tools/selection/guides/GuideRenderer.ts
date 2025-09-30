/**
 * Visual rendering of guide lines and labels
 */

import { Graphics, Container, Text } from 'pixi.js';
import { AlignmentGuide, DistanceLabel, EqualSpacingGroup } from './types';
import { GUIDE_COLORS, GUIDE_LIMITS, VISUAL_SETTINGS } from './config';

export class GuideRenderer {
  private guideGfx: Graphics | null = null;
  private distanceGfx: Graphics | null = null;
  private labelContainer: Container | null = null;

  public initialize(ui: Container): void {
    this.initializeGuideGraphics(ui);
    this.initializeDistanceGraphics(ui);
    this.initializeLabelContainer(ui);
  }

  public clear(): void {
    this.clearGraphics();
  }

  /**
   * Render alignment guides as red lines
   */
  public drawAlignmentGuides(guides: AlignmentGuide[]): void {
    if (!this.guideGfx) return;
    
    for (const guide of guides.slice(0, GUIDE_LIMITS.MAX_ALIGNMENT_GUIDES)) {
      const alpha = Math.min(
        VISUAL_SETTINGS.GUIDE_ALPHA_MAX, 
        VISUAL_SETTINGS.GUIDE_ALPHA_BASE + guide.strength * VISUAL_SETTINGS.GUIDE_ALPHA_PER_STRENGTH
      );
      
      if (guide.type === 'vertical') {
        this.guideGfx
          .moveTo(Math.round(guide.position) + 0.5, 0)
          .lineTo(Math.round(guide.position) + 0.5, 10000)
          .stroke({ width: 1, color: GUIDE_COLORS.alignment, alpha });
      } else {
        this.guideGfx
          .moveTo(0, Math.round(guide.position) + 0.5)
          .lineTo(10000, Math.round(guide.position) + 0.5)
          .stroke({ width: 1, color: GUIDE_COLORS.alignment, alpha });
      }
    }
  }

  /**
   * Render distance labels with red backgrounds
   */
  public drawDistanceLabels(labels: DistanceLabel[]): void {
    if (!this.labelContainer) return;
    
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
    if (!this.guideGfx) return;
    
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
      ui.addChild(this.distanceGfx);
    } else {
      this.distanceGfx.clear();
    }
  }

  private initializeLabelContainer(ui: Container): void {
    if (!this.labelContainer) {
      this.labelContainer = new Container();
      this.labelContainer.zIndex = 10003;
      this.labelContainer.eventMode = 'none';
      ui.addChild(this.labelContainer);
    } else {
      try { this.labelContainer.removeChildren(); } catch {}
    }
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
}