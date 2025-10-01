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
import { AlignmentGuide, DistanceLabel, EqualSpacingGroup, GuideVisualStyle } from './types';
import { GUIDE_COLORS, GUIDE_LIMITS, VISUAL_SETTINGS } from './config';

export class GuideRenderer {
  private guideGfx: Graphics | null = null;
  private distanceGfx: Graphics | null = null;
  private gridGfx: Graphics | null = null;
  private labelContainer: Container | null = null;
  private ui: Container | null = null;
  private theme: 'auto' | 'light' | 'dark' = 'auto';

  public initialize(ui: Container): void {
    this.ui = ui;
    this.initializeGuideGraphics(ui);
    this.initializeDistanceGraphics(ui);
    this.initializeGridGraphics(ui);
    this.initializeLabelContainer(ui);
  }

  public setTheme(theme: 'auto' | 'light' | 'dark'): void {
    this.theme = theme;
  }

  private resolveAccentColor(): number {
    const prefersDark = this.theme === 'dark' || (this.theme === 'auto' && typeof document !== 'undefined' && document.body?.classList.contains('theme-dark'));
    return prefersDark ? GUIDE_COLORS.darkThemeAlternate : GUIDE_COLORS.alignment;
  }

  private resolveTextColor(): number {
    const prefersDark = this.theme === 'dark' || (this.theme === 'auto' && typeof document !== 'undefined' && document.body?.classList.contains('theme-dark'));
    return prefersDark ? 0xffffff : 0x1f1f1f;
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

    const accent = this.resolveAccentColor();

    for (const guide of guides.slice(0, GUIDE_LIMITS.MAX_ALIGNMENT_GUIDES)) {
      const baseAlpha = VISUAL_SETTINGS.GUIDE_ALPHA_BASE;
      const alpha = Math.min(
        VISUAL_SETTINGS.GUIDE_ALPHA_MAX,
        baseAlpha + guide.strength * VISUAL_SETTINGS.GUIDE_ALPHA_PER_STRENGTH
      );

      const isObjectGuide = guide.source.startsWith('object');
      const lineWidth = isObjectGuide ? 2.2 : 1.6;
      const style = guide.visualStyle || (guide.alignmentType === 'center' ? 'dashed' : 'solid');

      this.drawGuideLine(guide, accent, lineWidth, alpha, style);
    }
  }

  private drawGuideLine(
    guide: AlignmentGuide,
    color: number,
    lineWidth: number,
    alpha: number,
    style: GuideVisualStyle
  ): void {
    if (!this.guideGfx) return;

    const dashLength = VISUAL_SETTINGS.DASH_PHASE;
    const gap = VISUAL_SETTINGS.DASH_GAP;
    const verticalStart = -6000;
    const verticalEnd = 16000;
    const horizontalStart = -6000;
    const horizontalEnd = 16000;
    const position = Math.round(guide.position) + 0.5;

    const drawSegment = (x1: number, y1: number, x2: number, y2: number) => {
      this.guideGfx!.moveTo(x1, y1);
      this.guideGfx!.lineTo(x2, y2);
      this.guideGfx!.stroke({ width: lineWidth, color, alpha });
    };

    if (style === 'dashed') {
      if (guide.type === 'vertical') {
        for (let y = verticalStart; y < verticalEnd; y += dashLength + gap) {
          const yEnd = Math.min(verticalEnd, y + dashLength);
          drawSegment(position, y, position, yEnd);
        }
      } else {
        for (let x = horizontalStart; x < horizontalEnd; x += dashLength + gap) {
          const xEnd = Math.min(horizontalEnd, x + dashLength);
          drawSegment(x, position, xEnd, position);
        }
      }
    } else {
      if (guide.type === 'vertical') {
        drawSegment(position, verticalStart, position, verticalEnd);
      } else {
        drawSegment(horizontalStart, position, horizontalEnd, position);
      }
    }
  }

  private drawSpacingTick(
    x: number,
    y: number,
    orientation: 'vertical' | 'horizontal',
    color: number,
    alpha: number
  ): void {
    if (!this.guideGfx) return;

    const length = VISUAL_SETTINGS.DISTANCE_LABEL_OFFSET * 0.6;
    if (orientation === 'vertical') {
      const pos = Math.round(x) + 0.5;
      this.guideGfx
        .moveTo(pos, y - length)
        .lineTo(pos, y + length)
        .stroke({ width: 1.2, color, alpha });
    } else {
      const pos = Math.round(y) + 0.5;
      this.guideGfx
        .moveTo(x - length, pos)
        .lineTo(x + length, pos)
        .stroke({ width: 1.2, color, alpha });
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

    const accent = this.resolveAccentColor();
    const alpha = 0.85;

    for (const group of groups.slice(0, GUIDE_LIMITS.MAX_EQUAL_SPACING_GROUPS)) {
      const color = accent;
      const baselineAlpha = alpha;

      if (group.axis === 'x') {
        const y = group.objects[0].y + group.objects[0].height / 2;
        this.guideGfx
          .moveTo(group.startPos, Math.round(y) + 0.5)
          .lineTo(group.endPos, Math.round(y) + 0.5)
          .stroke({ width: 1.6, color, alpha: baselineAlpha });

        for (let i = 0; i < group.objects.length - 1; i++) {
          const current = group.objects[i];
          const next = group.objects[i + 1];
          const rightEdge = current.x + current.width;
          const leftEdge = next.x;
          this.drawSpacingTick(rightEdge, Math.round(y) + 0.5, 'vertical', color, baselineAlpha);
          this.drawSpacingTick(leftEdge, Math.round(y) + 0.5, 'vertical', color, baselineAlpha);
        }

        this.drawSpacingLabels(group, y, 'horizontal');
      } else {
        const x = group.objects[0].x + group.objects[0].width / 2;
        this.guideGfx
          .moveTo(Math.round(x) + 0.5, group.startPos)
          .lineTo(Math.round(x) + 0.5, group.endPos)
          .stroke({ width: 1.6, color, alpha: baselineAlpha });

        for (let i = 0; i < group.objects.length - 1; i++) {
          const current = group.objects[i];
          const next = group.objects[i + 1];
          const bottomEdge = current.y + current.height;
          const topEdge = next.y;
          this.drawSpacingTick(Math.round(x) + 0.5, bottomEdge, 'horizontal', color, baselineAlpha);
          this.drawSpacingTick(Math.round(x) + 0.5, topEdge, 'horizontal', color, baselineAlpha);
        }

        this.drawSpacingLabels(group, x, 'vertical');
      }
    }
  }

  private drawSpacingLabels(
    group: EqualSpacingGroup, 
    position: number, 
    orientation: 'horizontal' | 'vertical'
  ): void {
    const offset = VISUAL_SETTINGS.DISTANCE_LABEL_OFFSET;
    for (let i = 0; i < group.objects.length - 1; i++) {
      const obj1 = group.objects[i];
      const obj2 = group.objects[i + 1];
      
      if (orientation === 'horizontal') {
        const midX = (obj1.x + obj1.width + obj2.x) / 2;
        this.createDistanceLabel(midX, position - offset, `${Math.round(group.gap)}px`);
      } else {
        const midY = (obj1.y + obj1.height + obj2.y) / 2;
        this.createDistanceLabel(position + offset, midY, `${Math.round(group.gap)}px`);
      }
    }
  }

  private createDistanceLabel(x: number, y: number, text: string): void {
    if (!this.labelContainer) return;

    const accent = this.resolveAccentColor();
    const textObj = new Text({
      text,
      style: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 10,
        fill: this.resolveTextColor(),
        fontWeight: '600'
      }
    });

    const boxW = Math.ceil(textObj.width + VISUAL_SETTINGS.LABEL_PADDING_X * 2);
    const boxH = Math.ceil(textObj.height + VISUAL_SETTINGS.LABEL_PADDING_Y * 2);

    const bg = new Graphics();
    bg.roundRect(0, 0, boxW, boxH, 3)
      .fill({ color: 0xffffff, alpha: VISUAL_SETTINGS.LABEL_BACKGROUND_ALPHA })
      .stroke({ width: 1, color: accent, alpha: 0.25 });

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
  public renderGrid(
    ui: Container,
    canvasWidth: number,
    canvasHeight: number,
    spacing: number,
    style: 'dots' | 'lines' | 'hybrid' = 'dots',
    theme: 'auto' | 'light' | 'dark' = 'auto'
  ): void {
    // Initialize grid graphics if needed
    if (!this.gridGfx && ui) {
      this.initializeGridGraphics(ui);
    }
    
    if (!this.gridGfx) {
      console.warn('⚠️ Grid graphics not initialized for grid rendering');
      return;
    }

  this.setTheme(theme);
  const grid = this.gridGfx;

    // Clear existing grid
  grid.clear();

    const accent = this.resolveAccentColor();
    const dotSize = VISUAL_SETTINGS.GRID_DOT_SIZE;
    const majorInterval = Math.max(1, VISUAL_SETTINGS.GRID_MAJOR_INTERVAL);

    const drawLines = (step: number, alpha: number) => {
      for (let x = 0; x <= canvasWidth; x += step) {
        grid
          .moveTo(Math.round(x) + 0.5, 0)
          .lineTo(Math.round(x) + 0.5, canvasHeight)
          .stroke({ width: 1, color: accent, alpha });
      }
      for (let y = 0; y <= canvasHeight; y += step) {
        grid
          .moveTo(0, Math.round(y) + 0.5)
          .lineTo(canvasWidth, Math.round(y) + 0.5)
          .stroke({ width: 1, color: accent, alpha });
      }
    };

    const drawDots = (step: number, alpha: number) => {
      for (let x = 0; x <= canvasWidth; x += step) {
        for (let y = 0; y <= canvasHeight; y += step) {
          grid
            .rect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize)
            .fill({ color: accent, alpha });
        }
      }
    };

    switch (style) {
      case 'lines':
        drawLines(spacing, 0.18);
        break;
      case 'hybrid': {
        drawLines(spacing * majorInterval, 0.22);
        drawDots(spacing, 0.12);
        break;
      }
      case 'dots':
      default:
        drawDots(spacing, 0.16);
        break;
    }
  }

  public clearGrid(): void {
    if (this.gridGfx) {
      this.gridGfx.clear();
      console.log('✅ Grid cleared');
    }
  }
}