/**
 * Alignment guide detection and generation
 */

import { Rectangle, Container } from 'pixi.js';
import { snapManager } from './SnapManager';
import { AlignmentGuide } from './types';

export class AlignmentDetector {
  
  /**
   * Generate alignment guides for canvas and objects
   */
  public generateAlignmentGuides(
    targetBounds: Rectangle, 
    nearbyObjects: Rectangle[], 
    container: Container,
    referenceMode: 'canvas' | 'object' | 'grid' = 'canvas'
  ): AlignmentGuide[] {
    console.log('🔍 AlignmentDetector.generateAlignmentGuides called');
    console.log('🎯 Target bounds:', targetBounds);
    console.log('📦 Nearby objects:', nearbyObjects.length);
    console.log('📐 Reference mode:', referenceMode);

    // Get precision threshold from SnapManager
    const threshold = snapManager.getPrefs().threshold || 8;
    console.log('📏 Alignment threshold:', threshold);
    
    // Object-to-object alignment guides (higher priority)
    const objectGuides = this.getObjectAlignmentGuides(nearbyObjects, targetBounds, threshold, referenceMode);
    console.log('🎯 Object guides generated:', objectGuides.length);
    
    // For canvas mode, also include canvas alignment guides
    let canvasGuides: AlignmentGuide[] = [];
    if (referenceMode === 'canvas') {
      canvasGuides = this.getCanvasAlignmentGuides(container, targetBounds, threshold);
      console.log('🖼️ Canvas guides generated:', canvasGuides.length);
    }
    
    // Combine and sort by relevance and strength
    const allGuides = [...objectGuides, ...canvasGuides];
    
    const filteredGuides = allGuides
      .filter(guide => this.isGuideRelevant(guide, targetBounds, threshold * 3))
      .sort((a, b) => {
        // Prioritize object-to-object guides over canvas guides
        if (a.objects.length > 0 && b.objects.length === 0) return -1;
        if (a.objects.length === 0 && b.objects.length > 0) return 1;
        // Then by strength (number of aligned objects)
        return b.strength - a.strength;
      })
      .slice(0, 10); // Limit to most relevant guides

    console.log('✅ Final filtered guides:', filteredGuides.length);
    filteredGuides.forEach((guide, i) => {
      console.log(`  ${i + 1}. ${guide.type} at ${guide.position}, strength: ${guide.strength}, objects: ${guide.objects.length}`);
    });

    return filteredGuides;
  }

  /**
   * Generate only object-to-object alignment guides (for object reference mode)
   */
  public generateObjectOnlyGuides(
    targetBounds: Rectangle, 
    nearbyObjects: Rectangle[],
    referenceMode: 'object' = 'object'
  ): AlignmentGuide[] {
    console.log('🎯 AlignmentDetector.generateObjectOnlyGuides called');
    console.log('🎯 Target bounds:', targetBounds);
    console.log('📦 Nearby objects:', nearbyObjects.length);

    // Get precision threshold from SnapManager
    const threshold = snapManager.getPrefs().threshold || 8;
    console.log('📏 Alignment threshold:', threshold);
    
    // Only object-to-object alignment guides with limited extension
    const objectGuides = this.getObjectAlignmentGuides(nearbyObjects, targetBounds, threshold, referenceMode);
    console.log('🎯 Object-only guides generated:', objectGuides.length);
    
    const filteredGuides = objectGuides
      .filter(guide => this.isGuideRelevant(guide, targetBounds, threshold * 2)) // Tighter filtering for object mode
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 8); // Fewer guides for cleaner object mode

    console.log('✅ Final object-only guides:', filteredGuides.length);
    return filteredGuides;
  }

  /**
   * Get canvas edge and center alignment guides
   */
  private getCanvasAlignmentGuides(
    container: Container, 
    targetBounds?: Rectangle, 
    threshold: number = 8
  ): AlignmentGuide[] {
    const guides: AlignmentGuide[] = [];
    
    // Get canvas bounds
    const canvasBounds = container.getBounds();
    
    // Canvas vertical positions (left, center, right)
    const canvasVerticals = [
      { pos: canvasBounds.x, type: 'edge' as const },
      { pos: canvasBounds.x + canvasBounds.width / 2, type: 'center' as const },
      { pos: canvasBounds.x + canvasBounds.width, type: 'edge' as const }
    ];
    
    // Canvas horizontal positions (top, center, bottom)
    const canvasHorizontals = [
      { pos: canvasBounds.y, type: 'edge' as const },
      { pos: canvasBounds.y + canvasBounds.height / 2, type: 'center' as const },
      { pos: canvasBounds.y + canvasBounds.height, type: 'edge' as const }
    ];
    
    // Only show canvas guides if target is close to them
    if (targetBounds) {
      const targetLeft = targetBounds.x;
      const targetCenterX = targetBounds.x + targetBounds.width / 2;
      const targetRight = targetBounds.x + targetBounds.width;
      const targetTop = targetBounds.y;
      const targetCenterY = targetBounds.y + targetBounds.height / 2;
      const targetBottom = targetBounds.y + targetBounds.height;
      
      // Check vertical canvas alignments
      for (const canvas of canvasVerticals) {
        if (this.isWithinThreshold(targetLeft, canvas.pos, threshold * 2) ||
            this.isWithinThreshold(targetCenterX, canvas.pos, threshold * 2) ||
            this.isWithinThreshold(targetRight, canvas.pos, threshold * 2)) {
          guides.push({
            type: 'vertical',
            position: Math.round(canvas.pos),
            alignmentType: canvas.type,
            objects: [], // Canvas guides don't have objects
            strength: 0.5, // Lower priority than object guides
            source: canvas.type === 'center' ? 'canvas-center' : 'canvas-edge',
            visualStyle: 'solid'
          });
        }
      }
      
      // Check horizontal canvas alignments
      for (const canvas of canvasHorizontals) {
        if (this.isWithinThreshold(targetTop, canvas.pos, threshold * 2) ||
            this.isWithinThreshold(targetCenterY, canvas.pos, threshold * 2) ||
            this.isWithinThreshold(targetBottom, canvas.pos, threshold * 2)) {
          guides.push({
            type: 'horizontal',
            position: Math.round(canvas.pos),
            alignmentType: canvas.type,
            objects: [], // Canvas guides don't have objects
            strength: 0.5, // Lower priority than object guides
            source: canvas.type === 'center' ? 'canvas-center' : 'canvas-edge',
            visualStyle: 'solid'
          });
        }
      }
    }
    
    return guides;
  }

  /**
   * Get object-to-object alignment guides with enhanced precision
   */
  private getObjectAlignmentGuides(
    objects: Rectangle[], 
    targetBounds?: Rectangle, 
    threshold: number = 8,
    // eslint-disable-next-line no-unused-vars
    _referenceMode: 'canvas' | 'object' | 'grid' = 'canvas'
  ): AlignmentGuide[] {
    const guides: AlignmentGuide[] = [];
    
    if (objects.length === 0) return guides;
    
    // Create maps to group objects by alignment positions
    const verticalPositions = new Map<number, Rectangle[]>();
    const horizontalPositions = new Map<number, Rectangle[]>();
    
    // Collect alignment positions from all objects
    for (const obj of objects) {
      // Vertical alignment positions (left, center, right)
      const leftX = Math.round(obj.x);
      const centerX = Math.round(obj.x + obj.width / 2);
      const rightX = Math.round(obj.x + obj.width);
      
      this.addToPositionMap(verticalPositions, leftX, obj, threshold);
      this.addToPositionMap(verticalPositions, centerX, obj, threshold);
      this.addToPositionMap(verticalPositions, rightX, obj, threshold);
      
      // Horizontal alignment positions (top, center, bottom)
      const topY = Math.round(obj.y);
      const centerY = Math.round(obj.y + obj.height / 2);
      const bottomY = Math.round(obj.y + obj.height);
      
      this.addToPositionMap(horizontalPositions, topY, obj, threshold);
      this.addToPositionMap(horizontalPositions, centerY, obj, threshold);
      this.addToPositionMap(horizontalPositions, bottomY, obj, threshold);
    }
    
    // Check if target would align with any positions
    if (targetBounds) {
      const targetLeft = Math.round(targetBounds.x);
      const targetCenterX = Math.round(targetBounds.x + targetBounds.width / 2);
      const targetRight = Math.round(targetBounds.x + targetBounds.width);
      const targetTop = Math.round(targetBounds.y);
      const targetCenterY = Math.round(targetBounds.y + targetBounds.height / 2);
      const targetBottom = Math.round(targetBounds.y + targetBounds.height);
      
      // Check vertical alignments
      for (const [position, alignedObjects] of verticalPositions.entries()) {
        if (this.isWithinThreshold(targetLeft, position, threshold) ||
            this.isWithinThreshold(targetCenterX, position, threshold) ||
            this.isWithinThreshold(targetRight, position, threshold)) {
          guides.push({
            type: 'vertical',
            position,
            alignmentType: this.getAlignmentType(position, alignedObjects[0]),
            objects: alignedObjects,
            strength: alignedObjects.length + 1, // +1 for target
            source: this.getAlignmentType(position, alignedObjects[0]) === 'center' ? 'object-center' : 'object-edge',
            visualStyle: 'solid'
          });
        }
      }
      
      // Check horizontal alignments
      for (const [position, alignedObjects] of horizontalPositions.entries()) {
        if (this.isWithinThreshold(targetTop, position, threshold) ||
            this.isWithinThreshold(targetCenterY, position, threshold) ||
            this.isWithinThreshold(targetBottom, position, threshold)) {
          guides.push({
            type: 'horizontal',
            position,
            alignmentType: this.getAlignmentType(position, alignedObjects[0]),
            objects: alignedObjects,
            strength: alignedObjects.length + 1, // +1 for target
            source: this.getAlignmentType(position, alignedObjects[0]) === 'center' ? 'object-center' : 'object-edge',
            visualStyle: 'solid'
          });
        }
      }
    } else {
      // No target bounds, just create guides for existing alignments
      for (const [position, alignedObjects] of verticalPositions.entries()) {
        if (alignedObjects.length >= 2) {
          guides.push({
            type: 'vertical',
            position,
            alignmentType: this.getAlignmentType(position, alignedObjects[0]),
            objects: alignedObjects,
            strength: alignedObjects.length,
            source: this.getAlignmentType(position, alignedObjects[0]) === 'center' ? 'object-center' : 'object-edge',
            visualStyle: 'solid'
          });
        }
      }
      
      for (const [position, alignedObjects] of horizontalPositions.entries()) {
        if (alignedObjects.length >= 2) {
          guides.push({
            type: 'horizontal',
            position,
            alignmentType: this.getAlignmentType(position, alignedObjects[0]),
            objects: alignedObjects,
            strength: alignedObjects.length,
            source: this.getAlignmentType(position, alignedObjects[0]) === 'center' ? 'object-center' : 'object-edge',
            visualStyle: 'solid'
          });
        }
      }
    }
    
    return guides;
  }

  /**
   * Helper to add object to position map with tolerance
   */
  private addToPositionMap(
    map: Map<number, Rectangle[]>, 
    position: number, 
    rect: Rectangle, 
    threshold: number
  ): void {
    // Find existing position within threshold
    for (const [existingPos, objects] of map.entries()) {
      if (Math.abs(existingPos - position) <= threshold) {
        objects.push(rect);
        return;
      }
    }
    
    // No existing position found, create new one
    map.set(position, [rect]);
  }

  /**
   * Check if two positions are within threshold
   */
  private isWithinThreshold(pos1: number, pos2: number, threshold: number): boolean {
    return Math.abs(pos1 - pos2) <= threshold;
  }

  /**
   * Check if guide is relevant to target bounds
   */
  private isGuideRelevant(
    guide: AlignmentGuide, 
    targetBounds: Rectangle, 
    maxDistance: number = 100
  ): boolean {
    if (guide.type === 'vertical') {
      return Math.abs(guide.position - targetBounds.x) <= maxDistance ||
             Math.abs(guide.position - (targetBounds.x + targetBounds.width / 2)) <= maxDistance ||
             Math.abs(guide.position - (targetBounds.x + targetBounds.width)) <= maxDistance;
    } else {
      return Math.abs(guide.position - targetBounds.y) <= maxDistance ||
             Math.abs(guide.position - (targetBounds.y + targetBounds.height / 2)) <= maxDistance ||
             Math.abs(guide.position - (targetBounds.y + targetBounds.height)) <= maxDistance;
    }
  }

  /**
   * Determine alignment type based on position relative to object
   */
  private getAlignmentType(position: number, rect: Rectangle): 'edge' | 'center' {
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    
    if (Math.abs(position - centerX) < 1 || Math.abs(position - centerY) < 1) {
      return 'center';
    }
    
    return 'edge';
  }
}
