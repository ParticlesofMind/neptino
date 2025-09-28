import { Container, Graphics, Rectangle, Text, Point } from 'pixi.js';
import { snapManager } from '../SnapManager';
import { SpatialIndex } from '../utils/SpatialIndex';

interface GuideColors {
  alignment: number;      // Red for temporary alignments
  equalSpacing: number;   // Green for equal spacing
  smartSelection: number; // Pink for smart selection/reordering
  resize: number;         // Blue for resize guides
  distance: number;       // Gray for distance indicators
}

interface DynamicSnapResult {
  snapX?: { pos: number; target: 'left' | 'center' | 'right'; type: 'equal-spacing' | 'alignment' };
  snapY?: { pos: number; target: 'top' | 'center' | 'bottom'; type: 'equal-spacing' | 'alignment' };
  equalSpacingHints?: Array<{ axis: 'x' | 'y'; objects: Rectangle[]; gap: number }>;
}

export class SmartGuides {
  private uiContainer: Container | null = null;
  private guideGfx: Graphics | null = null;
  private guideLabels: Container | null = null;
  private spatialIndex: SpatialIndex | null = null;
  private lastUpdateTime = 0;
  private indexDirty = true;

  private colors: GuideColors = {
    alignment: 0xff4444,      // Red
    equalSpacing: 0x10b981,   // Green  
    smartSelection: 0xff69b4, // Pink
    resize: 0x3b82f6,         // Blue
    distance: 0x888888        // Gray
  };

  public setUILayer(container: Container) { 
    this.uiContainer = container; 
    this.indexDirty = true;
  }

  public clear(): void {
    if (this.guideGfx && this.guideGfx.parent) this.guideGfx.parent.removeChild(this.guideGfx);
    try { this.guideGfx?.destroy({ children: false }); } catch {}
    this.guideGfx = null;
    if (this.guideLabels && this.guideLabels.parent) this.guideLabels.parent.removeChild(this.guideLabels);
    try { this.guideLabels?.destroy({ children: true }); } catch {}
    this.guideLabels = null;
  }

  /**
   * Main update method - enhanced with performance optimizations and new features
   */
  public update(container: Container, selected: any[], groupBounds: Rectangle): void {
    if (!this.uiContainer && !container) return;
    if (!snapManager.isSmartEnabled()) { this.clear(); return; }
    
    const ui = this.uiContainer || container;
    const b = groupBounds;

    this.initializeGraphics(ui);
    this.updateSpatialIndex(container, selected);

    const prefs = snapManager.getPrefs();
    const candidates = snapManager.getCandidates({ exclude: selected, container, rect: groupBounds, margin: 200 });
    
    // Get nearby objects using spatial index for better performance
    const nearbyObjects = this.getNearbyObjects(groupBounds, prefs.guideFadeDistance);
    
    // Generate alignment guides
    this.generateAlignmentGuides(b, nearbyObjects, candidates, prefs);
    
    // Generate equal spacing guides
    this.generateEqualSpacingGuides(b, nearbyObjects, prefs);
    
    // Generate distance labels to nearest objects
    if (prefs.showDistToAll) {
      this.generateDistanceLabels(b, nearbyObjects, prefs);
    }
    
    // Generate symmetry guides
    if (prefs.enableSymmetryGuides) {
      this.generateSymmetryGuides(b, candidates, prefs);
    }
    
    // Generate smart selection indicators
    if (prefs.enableSmartSelection) {
      this.generateSmartSelectionIndicators(b, nearbyObjects, prefs);
    }
  }

  /**
   * Enhanced snap calculation with dynamic equal-spacing snap
   */
  public calculateDynamicSnap(
    groupBounds: Rectangle, 
    container: Container, 
    selected: any[]
  ): DynamicSnapResult {
    const prefs = snapManager.getPrefs();
    this.updateSpatialIndex(container, selected);
    const nearbyObjects = this.getNearbyObjects(groupBounds, prefs.threshold * 5);
    const result: DynamicSnapResult = {};

    // Calculate equal spacing opportunities
    const equalSpacingOpportunities = this.findEqualSpacingOpportunities(groupBounds, nearbyObjects, prefs);
    
    for (const opp of equalSpacingOpportunities) {
      if (opp.axis === 'x') {
        const targetX = opp.targetPosition;
        const currentCenter = groupBounds.x + groupBounds.width / 2;
        const distance = Math.abs(targetX - currentCenter);
        
        if (distance <= prefs.threshold * prefs.equalSpacingBias) {
          result.snapX = {
            pos: targetX,
            target: 'center',
            type: 'equal-spacing'
          };
        }
      } else {
        const targetY = opp.targetPosition;
        const currentCenter = groupBounds.y + groupBounds.height / 2;
        const distance = Math.abs(targetY - currentCenter);
        
        if (distance <= prefs.threshold * prefs.equalSpacingBias) {
          result.snapY = {
            pos: targetY,
            target: 'center',
            type: 'equal-spacing'
          };
        }
      }
    }

    // Add equal spacing hints for visualization
    result.equalSpacingHints = equalSpacingOpportunities.map(opp => ({
      axis: opp.axis,
      objects: opp.objects,
      gap: opp.gap
    }));

    return result;
  }

  /**
   * Generate resize guides for matching dimensions
   */
  public updateResizeGuides(
    container: Container, 
    selected: any[], 
    resizeBounds: Rectangle,
    resizeType: 'width' | 'height' | 'both'
  ): void {
    if (!snapManager.getPrefs().enableResizeGuides) return;
    
    this.initializeGraphics(this.uiContainer || container);
    this.updateSpatialIndex(container, selected);
    
    const nearbyObjects = this.getNearbyObjects(resizeBounds, 100);
    const prefs = snapManager.getPrefs();
    
    if (resizeType === 'width' || resizeType === 'both') {
      this.generateWidthMatchingGuides(resizeBounds, nearbyObjects, prefs);
    }
    
    if (resizeType === 'height' || resizeType === 'both') {
      this.generateHeightMatchingGuides(resizeBounds, nearbyObjects, prefs);
    }
  }

  private initializeGraphics(ui: Container): void {
    if (!this.guideGfx) {
      this.guideGfx = new Graphics();
      this.guideGfx.zIndex = 10000;
      this.guideGfx.eventMode = 'none';
      ui.addChild(this.guideGfx);
    } else { 
      this.guideGfx.clear(); 
    }

    if (!this.guideLabels) {
      this.guideLabels = new Container();
      this.guideLabels.zIndex = 10001;
      this.guideLabels.eventMode = 'none';
      ui.addChild(this.guideLabels);
    } else { 
      try { this.guideLabels.removeChildren(); } catch {} 
    }
  }

  private updateSpatialIndex(container: Container, selected: any[]): void {
    const now = Date.now();
    // Rebuild index every 100ms or when marked dirty
    if (this.indexDirty || now - this.lastUpdateTime > 100) {
      const canvasBounds = this.getCanvasBounds(container);
      this.spatialIndex = new SpatialIndex(canvasBounds);
      this.spatialIndex.buildFromContainer(container, new Set(selected));
      this.lastUpdateTime = now;
      this.indexDirty = false;
    }
  }

  private getNearbyObjects(groupBounds: Rectangle, margin: number): Rectangle[] {
    if (!this.spatialIndex) return [];
    
    const spatialObjects = this.spatialIndex.queryRegion(groupBounds, margin);
    return spatialObjects.map(obj => obj.bounds);
  }

  private generateAlignmentGuides(
    bounds: Rectangle, 
    nearbyObjects: Rectangle[], 
    candidates: any, 
    prefs: any
  ): void {
    const threshold = candidates.threshold;
    const bLeft = bounds.x, bRight = bounds.x + bounds.width;
    const bTop = bounds.y, bBottom = bounds.y + bounds.height;
    const bCx = bounds.x + bounds.width / 2, bCy = bounds.y + bounds.height / 2;

    type Line = { pos: number; rects: Rectangle[]; _acc?: { sum: number; count: number } };
    const vLines: Line[] = [], hLines: Line[] = [];

    const ensureLine = (list: Line[], pos: number): Line => {
      for (const l of list) {
        if (Math.abs(l.pos - pos) <= threshold) {
          l._acc = l._acc || { sum: l.pos, count: 1 };
          l._acc.sum += pos; l._acc.count += 1;
          l.pos = l._acc.sum / l._acc.count;
          return l;
        }
      }
      const l = { pos, rects: [] as Rectangle[] } as Line; 
      list.push(l); 
      return l;
    };

    // Process nearby objects for alignment
    for (const r of nearbyObjects) {
      const rLeft = r.x, rRight = r.x + r.width, rCx = r.x + r.width / 2;
      const rTop = r.y, rBottom = r.y + r.height, rCy = r.y + r.height / 2;
      
      // Vertical alignments
      if (Math.abs(bLeft - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bLeft - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bLeft - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      if (Math.abs(bCx - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bCx - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bCx - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      if (Math.abs(bRight - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bRight - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bRight - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      
      // Horizontal alignments
      if (Math.abs(bTop - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bTop - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bTop - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
      if (Math.abs(bCy - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bCy - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bCy - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
      if (Math.abs(bBottom - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bBottom - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bBottom - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
    }

    // Include canvas guides
    this.addCanvasGuides(bounds, candidates, vLines, hLines, prefs);

    // Draw alignment guides
    this.drawAlignmentLines(bounds, vLines, hLines, prefs);
  }

  private generateEqualSpacingGuides(bounds: Rectangle, nearbyObjects: Rectangle[], prefs: any): void {
    const opportunities = this.findEqualSpacingOpportunities(bounds, nearbyObjects, prefs);
    
    for (const opp of opportunities) {
      if (opp.confidence > 0.7) { // Only show high-confidence equal spacing
        this.drawEqualSpacingGuide(opp, prefs);
      }
    }
  }

  private findEqualSpacingOpportunities(
    bounds: Rectangle, 
    nearbyObjects: Rectangle[], 
    prefs: any
  ): Array<{
    axis: 'x' | 'y';
    objects: Rectangle[];
    gap: number;
    targetPosition: number;
    confidence: number;
  }> {
    const opportunities: Array<{
      axis: 'x' | 'y';
      objects: Rectangle[];
      gap: number;
      targetPosition: number;
      confidence: number;
    }> = [];

    // Find horizontal equal spacing opportunities
    const horizontalSorted = nearbyObjects
      .filter(r => Math.abs(r.y - bounds.y) < prefs.threshold * 2) // Same horizontal level
      .sort((a, b) => a.x - b.x);

    for (let i = 0; i < horizontalSorted.length - 1; i++) {
      const a = horizontalSorted[i];
      const b = horizontalSorted[i + 1];
      const gap = b.x - (a.x + a.width);
      
      if (gap > 0) {
        // Check if inserting the selection would create equal spacing
        const boundsGap1 = bounds.x - (a.x + a.width);
        const boundsGap2 = b.x - (bounds.x + bounds.width);
        
        if (Math.abs(gap - boundsGap1) < prefs.equalTolerance && 
            Math.abs(gap - boundsGap2) < prefs.equalTolerance) {
          opportunities.push({
            axis: 'x',
            objects: [a, bounds, b],
            gap,
            targetPosition: a.x + a.width + gap + bounds.width / 2,
            confidence: 1.0 - Math.abs(gap - boundsGap1) / prefs.equalTolerance
          });
        }
      }
    }

    // Find vertical equal spacing opportunities
    const verticalSorted = nearbyObjects
      .filter(r => Math.abs(r.x - bounds.x) < prefs.threshold * 2) // Same vertical level
      .sort((a, b) => a.y - b.y);

    for (let i = 0; i < verticalSorted.length - 1; i++) {
      const a = verticalSorted[i];
      const b = verticalSorted[i + 1];
      const gap = b.y - (a.y + a.height);
      
      if (gap > 0) {
        const boundsGap1 = bounds.y - (a.y + a.height);
        const boundsGap2 = b.y - (bounds.y + bounds.height);
        
        if (Math.abs(gap - boundsGap1) < prefs.equalTolerance && 
            Math.abs(gap - boundsGap2) < prefs.equalTolerance) {
          opportunities.push({
            axis: 'y',
            objects: [a, bounds, b],
            gap,
            targetPosition: a.y + a.height + gap + bounds.height / 2,
            confidence: 1.0 - Math.abs(gap - boundsGap1) / prefs.equalTolerance
          });
        }
      }
    }

    return opportunities;
  }

  private generateDistanceLabels(bounds: Rectangle, nearbyObjects: Rectangle[], prefs: any): void {
    const nearest = this.findNearestObjects(bounds, nearbyObjects, 5);
    
    for (const obj of nearest) {
      if (obj.distance > 0) {
        const label = this.formatDistance(obj.distance, prefs.distanceUnits);
        const pos = this.calculateLabelPosition(bounds, obj.bounds);
        this.drawDistanceLabel(pos.x, pos.y, label, this.colors.distance);
      }
    }
  }

  private generateSymmetryGuides(bounds: Rectangle, candidates: any, prefs: any): void {
    const allV = (candidates.canvas.v || []).concat(candidates.vLines || []);
    const allH = (candidates.canvas.h || []).concat(candidates.hLines || []);
    
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    const nearestV = this.findNearestLine(centerX, allV);
    const nearestH = this.findNearestLine(centerY, allH);
    
    const threshold = candidates.threshold * prefs.centerBiasMultiplier;
    
    if (nearestV && nearestV.distance <= threshold) {
      this.drawSymmetryGuide('vertical', nearestV.pos, bounds, prefs);
    }
    
    if (nearestH && nearestH.distance <= threshold) {
      this.drawSymmetryGuide('horizontal', nearestH.pos, bounds, prefs);
    }
  }

  private generateSmartSelectionIndicators(bounds: Rectangle, nearbyObjects: Rectangle[], prefs: any): void {
    const equalGroups = this.detectEqualSpacedGroups(nearbyObjects, prefs);
    
    for (const group of equalGroups) {
      if (this.boundsIntersectsGroup(bounds, group)) {
        this.drawSmartSelectionDots(group, prefs);
      }
    }
  }

  private generateWidthMatchingGuides(bounds: Rectangle, nearbyObjects: Rectangle[], prefs: any): void {
    const matches = nearbyObjects.filter(r => 
      Math.abs(r.width - bounds.width) <= prefs.threshold
    );
    
    for (const match of matches) {
      this.drawDimensionMatchGuide('width', bounds, match, prefs);
    }
  }

  private generateHeightMatchingGuides(bounds: Rectangle, nearbyObjects: Rectangle[], prefs: any): void {
    const matches = nearbyObjects.filter(r => 
      Math.abs(r.height - bounds.height) <= prefs.threshold
    );
    
    for (const match of matches) {
      this.drawDimensionMatchGuide('height', bounds, match, prefs);
    }
  }

  // Helper methods for drawing guides
  private drawAlignmentLines(bounds: Rectangle, vLines: any[], hLines: any[], prefs: any): void {
    const segmentMargin = prefs.guideExtendMode === 'viewport' ? 200 : 24;
    const color = prefs.enableColorCoding ? this.colors.alignment : 0x3b82f6;
    
    // Draw vertical lines
    for (const line of vLines) {
      if (line.rects.length < 2) continue;
      
      const yMin = bounds.y - segmentMargin;
      const yMax = bounds.y + bounds.height + segmentMargin;
      const alpha = this.calculateAlpha(line.pos, bounds, prefs);
      
      this.guideGfx!
        .moveTo(Math.round(line.pos) + 0.5, yMin)
        .lineTo(Math.round(line.pos) + 0.5, yMax)
        .stroke({ width: 1, color, alpha });
    }
    
    // Draw horizontal lines
    for (const line of hLines) {
      if (line.rects.length < 2) continue;
      
      const xMin = bounds.x - segmentMargin;
      const xMax = bounds.x + bounds.width + segmentMargin;
      const alpha = this.calculateAlpha(line.pos, bounds, prefs);
      
      this.guideGfx!
        .moveTo(xMin, Math.round(line.pos) + 0.5)
        .lineTo(xMax, Math.round(line.pos) + 0.5)
        .stroke({ width: 1, color, alpha });
    }
  }

  private drawEqualSpacingGuide(opportunity: any, prefs: any): void {
    const color = prefs.enableColorCoding ? this.colors.equalSpacing : 0x10b981;
    
    if (opportunity.axis === 'x') {
      const y = opportunity.objects[0].y + opportunity.objects[0].height / 2;
      const startX = opportunity.objects[0].x;
      const endX = opportunity.objects[opportunity.objects.length - 1].x + 
                   opportunity.objects[opportunity.objects.length - 1].width;
      
      // Draw pink guide line
      this.guideGfx!
        .moveTo(startX, Math.round(y) + 0.5)
        .lineTo(endX, Math.round(y) + 0.5)
        .stroke({ width: 2, color, alpha: 0.8 });
        
      // Draw gap labels
      for (let i = 0; i < opportunity.objects.length - 1; i++) {
        const a = opportunity.objects[i];
        const b = opportunity.objects[i + 1];
        const midX = (a.x + a.width + b.x) / 2;
        this.drawGuideLabel(midX - 10, y - 16, `${Math.round(opportunity.gap)}px`, color);
      }
    } else {
      const x = opportunity.objects[0].x + opportunity.objects[0].width / 2;
      const startY = opportunity.objects[0].y;
      const endY = opportunity.objects[opportunity.objects.length - 1].y + 
                   opportunity.objects[opportunity.objects.length - 1].height;
      
      this.guideGfx!
        .moveTo(Math.round(x) + 0.5, startY)
        .lineTo(Math.round(x) + 0.5, endY)
        .stroke({ width: 2, color, alpha: 0.8 });
        
      for (let i = 0; i < opportunity.objects.length - 1; i++) {
        const a = opportunity.objects[i];
        const b = opportunity.objects[i + 1];
        const midY = (a.y + a.height + b.y) / 2;
        this.drawGuideLabel(x + 6, midY - 8, `${Math.round(opportunity.gap)}px`, color);
      }
    }
  }

  private drawDistanceLabel(x: number, y: number, text: string, color: number): void {
    this.drawGuideLabel(x, y, text, color);
  }

  private drawSymmetryGuide(type: 'vertical' | 'horizontal', pos: number, bounds: Rectangle, prefs: any): void {
    const color = prefs.enableColorCoding ? this.colors.alignment : 0x3b82f6;
    const shortMargin = 20;
    const tick = 6;
    
    if (type === 'vertical') {
      const px = Math.round(pos) + 0.5;
      this.guideGfx!
        .moveTo(px, bounds.y - shortMargin)
        .lineTo(px, bounds.y + bounds.height + shortMargin)
        .stroke({ width: 1, color, alpha: 0.98 });
        
      // Tick markers
      this.guideGfx!
        .moveTo(px - tick, Math.round(bounds.y) + 0.5)
        .lineTo(px + tick, Math.round(bounds.y) + 0.5)
        .stroke({ width: 1, color, alpha: 0.98 });
      this.guideGfx!
        .moveTo(px - tick, Math.round(bounds.y + bounds.height) + 0.5)
        .lineTo(px + tick, Math.round(bounds.y + bounds.height) + 0.5)
        .stroke({ width: 1, color, alpha: 0.98 });
    } else {
      const py = Math.round(pos) + 0.5;
      this.guideGfx!
        .moveTo(bounds.x - shortMargin, py)
        .lineTo(bounds.x + bounds.width + shortMargin, py)
        .stroke({ width: 1, color, alpha: 0.98 });
        
      this.guideGfx!
        .moveTo(Math.round(bounds.x) + 0.5, py - tick)
        .lineTo(Math.round(bounds.x) + 0.5, py + tick)
        .stroke({ width: 1, color, alpha: 0.98 });
      this.guideGfx!
        .moveTo(Math.round(bounds.x + bounds.width) + 0.5, py - tick)
        .lineTo(Math.round(bounds.x + bounds.width) + 0.5, py + tick)
        .stroke({ width: 1, color, alpha: 0.98 });
    }
  }

  private drawSmartSelectionDots(group: Rectangle[], prefs: any): void {
    const color = prefs.enableColorCoding ? this.colors.smartSelection : 0xff69b4;
    
    for (const rect of group) {
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      
      // Draw pink reorder dot
      this.guideGfx!
        .circle(centerX, centerY, 4)
        .fill({ color, alpha: 0.8 });
    }
  }

  private drawDimensionMatchGuide(type: 'width' | 'height', bounds: Rectangle, match: Rectangle, prefs: any): void {
    const color = prefs.enableColorCoding ? this.colors.resize : 0x3b82f6;
    
    if (type === 'width') {
      const y1 = bounds.y - 10;
      const y2 = match.y - 10;
      
      // Draw dimension lines
      this.guideGfx!
        .moveTo(bounds.x, y1)
        .lineTo(bounds.x + bounds.width, y1)
        .stroke({ width: 1, color, alpha: 0.8 });
      this.guideGfx!
        .moveTo(match.x, y2)
        .lineTo(match.x + match.width, y2)
        .stroke({ width: 1, color, alpha: 0.8 });
        
      // Draw connecting line
      this.guideGfx!
        .moveTo(bounds.x + bounds.width / 2, y1)
        .lineTo(match.x + match.width / 2, y2)
        .stroke({ width: 1, color, alpha: 0.5 });
    } else {
      const x1 = bounds.x - 10;
      const x2 = match.x - 10;
      
      this.guideGfx!
        .moveTo(x1, bounds.y)
        .lineTo(x1, bounds.y + bounds.height)
        .stroke({ width: 1, color, alpha: 0.8 });
      this.guideGfx!
        .moveTo(x2, match.y)
        .lineTo(x2, match.y + match.height)
        .stroke({ width: 1, color, alpha: 0.8 });
        
      this.guideGfx!
        .moveTo(x1, bounds.y + bounds.height / 2)
        .lineTo(x2, match.y + match.height / 2)
        .stroke({ width: 1, color, alpha: 0.5 });
    }
  }

  private drawGuideLabel(x: number, y: number, text: string, strokeColor: number = 0x3b82f6): void {
    if (!this.guideLabels) return;
    
    const bg = new Graphics();
    const t = new Text({ text, style: { fontFamily: 'Arial', fontSize: 10, fill: 0x111111 } });
    const paddingX = 4, paddingY = 2;
    const boxW = Math.ceil(((t as any).width || 0) + paddingX * 2);
    const boxH = Math.ceil(((t as any).height || 0) + paddingY * 2);
    
    bg.rect(0, 0, boxW, boxH)
      .fill({ color: 0xffffff, alpha: 1 })
      .stroke({ width: 1, color: strokeColor, alpha: 1 });
    
    const container = new Container();
    container.eventMode = 'none';
    bg.eventMode = 'none';
    (t as any).eventMode = 'none';
    
    container.addChild(bg);
    container.addChild(t);
    t.position.set(paddingX, paddingY - 1);
    container.position.set(x, y);
    
    this.guideLabels.addChild(container);
  }

  // Utility methods
  private addCanvasGuides(bounds: Rectangle, candidates: any, vLines: any[], hLines: any[], prefs: any): void {
    try {
      const bias = Math.max(1, prefs.centerBiasMultiplier || 1);
      const canvasThresh = (candidates.threshold || 6) * bias;
      
      for (const x of candidates.canvas.v) {
        const dx = Math.min(
          Math.abs(bounds.x - x),
          Math.abs(bounds.x + bounds.width / 2 - x),
          Math.abs(bounds.x + bounds.width - x)
        );
        if (dx <= canvasThresh) {
          const line: any = this.ensureLine(vLines, x, candidates.threshold);
          line.isCanvas = true;
        }
      }
      
      for (const y of candidates.canvas.h) {
        const dy = Math.min(
          Math.abs(bounds.y - y),
          Math.abs(bounds.y + bounds.height / 2 - y),
          Math.abs(bounds.y + bounds.height - y)
        );
        if (dy <= canvasThresh) {
          const line: any = this.ensureLine(hLines, y, candidates.threshold);
          line.isCanvas = true;
        }
      }
    } catch {}
  }

  private ensureLine(list: any[], pos: number, threshold: number): any {
    for (const l of list) {
      if (Math.abs(l.pos - pos) <= threshold) {
        l._acc = l._acc || { sum: l.pos, count: 1 };
        l._acc.sum += pos;
        l._acc.count += 1;
        l.pos = l._acc.sum / l._acc.count;
        return l;
      }
    }
    const l = { pos, rects: [] };
    list.push(l);
    return l;
  }

  private calculateAlpha(linePos: number, bounds: Rectangle, prefs: any): number {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance = Math.min(
      Math.abs(linePos - bounds.x),
      Math.abs(linePos - centerX),
      Math.abs(linePos - (bounds.x + bounds.width)),
      Math.abs(linePos - bounds.y),
      Math.abs(linePos - centerY),
      Math.abs(linePos - (bounds.y + bounds.height))
    );
    
    if (distance > prefs.guideFadeDistance) {
      return Math.max(0.2, 1 - (distance - prefs.guideFadeDistance) / prefs.guideFadeDistance);
    }
    
    return 0.98;
  }

  private findNearestObjects(bounds: Rectangle, objects: Rectangle[], limit: number): Array<{ bounds: Rectangle; distance: number }> {
    return objects
      .map(obj => ({
        bounds: obj,
        distance: this.distanceBetweenRects(bounds, obj)
      }))
      .filter(item => item.distance > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  private findNearestLine(pos: number, lines: number[]): { pos: number; distance: number } | null {
    let nearest: { pos: number; distance: number } | null = null;
    
    for (const line of lines) {
      const distance = Math.abs(pos - line);
      if (!nearest || distance < nearest.distance) {
        nearest = { pos: line, distance };
      }
    }
    
    return nearest;
  }

  private detectEqualSpacedGroups(objects: Rectangle[], prefs: any): Rectangle[][] {
    const groups: Rectangle[][] = [];
    
    // Sort by x position for horizontal groups
    const horizontalSorted = [...objects].sort((a, b) => a.x - b.x);
    
    for (let i = 0; i < horizontalSorted.length - 2; i++) {
      const group = [horizontalSorted[i]];
      let lastGap = 0;
      
      for (let j = i + 1; j < horizontalSorted.length; j++) {
        const current = horizontalSorted[j];
        const prev = group[group.length - 1];
        const gap = current.x - (prev.x + prev.width);
        
        if (group.length === 1) {
          lastGap = gap;
          group.push(current);
        } else if (Math.abs(gap - lastGap) <= prefs.equalTolerance) {
          group.push(current);
        } else {
          break;
        }
      }
      
      if (group.length >= 3) {
        groups.push(group);
      }
    }
    
    return groups;
  }

  private boundsIntersectsGroup(bounds: Rectangle, group: Rectangle[]): boolean {
    return group.some(rect => this.boundsIntersect(bounds, rect));
  }

  private boundsIntersect(a: Rectangle, b: Rectangle): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  private distanceBetweenRects(a: Rectangle, b: Rectangle): number {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateLabelPosition(bounds1: Rectangle, bounds2: Rectangle): Point {
    const center1 = new Point(bounds1.x + bounds1.width / 2, bounds1.y + bounds1.height / 2);
    const center2 = new Point(bounds2.x + bounds2.width / 2, bounds2.y + bounds2.height / 2);
    
    return new Point(
      (center1.x + center2.x) / 2,
      (center1.y + center2.y) / 2
    );
  }

  private formatDistance(distance: number, units: string): string {
    switch (units) {
      case '%':
        return `${Math.round(distance * 100 / 1000)}%`; // Rough conversion
      case 'pt':
        return `${Math.round(distance * 0.75)}pt`; // px to pt conversion
      default:
        return `${Math.round(distance)}px`;
    }
  }

  private getCanvasBounds(container: Container): Rectangle {
    try {
      const bounds = container.getBounds();
      return new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
    } catch {
      return new Rectangle(0, 0, 1920, 1080); // Default fallback
    }
  }
}