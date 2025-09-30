/**
 * Alignment guide detection and generation
 */

import { Rectangle, Container } from 'pixi.js';
import { snapManager } from '../../SnapManager';
import { AlignmentGuide } from './types';

export class AlignmentDetector {
  
  /**
   * Generate alignment guides for canvas and objects
   */
  public generateAlignmentGuides(
    targetBounds: Rectangle, 
    nearbyObjects: Rectangle[], 
    container: Container
  ): AlignmentGuide[] {
    const canvasGuides = this.getCanvasAlignmentGuides(container);
    const objectGuides = this.getObjectAlignmentGuides(nearbyObjects);
    
    return [...canvasGuides, ...objectGuides]
      .filter(guide => this.isGuideRelevant(guide, targetBounds))
      .sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get canvas edge and center alignment guides
   */
  private getCanvasAlignmentGuides(container: Container): AlignmentGuide[] {
    const guides: AlignmentGuide[] = [];
    const candidates = snapManager.getCandidates({ container });
    
    // Canvas vertical guides
    for (const x of candidates.canvas.v) {
      guides.push({
        type: 'vertical',
        position: x,
        alignmentType: x === candidates.dims.width / 2 ? 'center' : 'edge',
        objects: [],
        strength: x === candidates.dims.width / 2 ? 2 : 1
      });
    }
    
    // Canvas horizontal guides
    for (const y of candidates.canvas.h) {
      guides.push({
        type: 'horizontal',
        position: y,
        alignmentType: y === candidates.dims.height / 2 ? 'center' : 'edge',
        objects: [],
        strength: y === candidates.dims.height / 2 ? 2 : 1
      });
    }
    
    return guides;
  }

  /**
   * Get object-to-object alignment guides
   */
  private getObjectAlignmentGuides(nearbyObjects: Rectangle[]): AlignmentGuide[] {
    const guides: AlignmentGuide[] = [];
    const threshold = snapManager.getPrefs().threshold;
    
    const verticalAlignments = new Map<number, Rectangle[]>();
    const horizontalAlignments = new Map<number, Rectangle[]>();
    
    // Group objects by alignment positions
    for (const obj of nearbyObjects) {
      this.addToAlignmentMap(verticalAlignments, obj.x, obj, threshold);
      this.addToAlignmentMap(verticalAlignments, obj.x + obj.width / 2, obj, threshold);
      this.addToAlignmentMap(verticalAlignments, obj.x + obj.width, obj, threshold);
      
      this.addToAlignmentMap(horizontalAlignments, obj.y, obj, threshold);
      this.addToAlignmentMap(horizontalAlignments, obj.y + obj.height / 2, obj, threshold);
      this.addToAlignmentMap(horizontalAlignments, obj.y + obj.height, obj, threshold);
    }
    
    // Convert to guides
    this.convertAlignmentsToGuides(verticalAlignments, 'vertical', guides);
    this.convertAlignmentsToGuides(horizontalAlignments, 'horizontal', guides);
    
    return guides;
  }

  private addToAlignmentMap(
    map: Map<number, Rectangle[]>, 
    position: number, 
    rect: Rectangle, 
    threshold: number
  ): void {
    for (const [existingPos, objects] of map.entries()) {
      if (Math.abs(existingPos - position) <= threshold) {
        objects.push(rect);
        return;
      }
    }
    map.set(position, [rect]);
  }

  private convertAlignmentsToGuides(
    alignments: Map<number, Rectangle[]>,
    type: 'vertical' | 'horizontal',
    guides: AlignmentGuide[]
  ): void {
    alignments.forEach((objects, position) => {
      if (objects.length >= 2) {
        guides.push({
          type,
          position,
          alignmentType: this.determineAlignmentType(objects, position, type),
          objects,
          strength: objects.length
        });
      }
    });
  }

  private determineAlignmentType(
    objects: Rectangle[], 
    position: number, 
    type: 'vertical' | 'horizontal'
  ): 'edge' | 'center' {
    let centerCount = 0;
    
    for (const obj of objects) {
      const center = type === 'vertical' 
        ? obj.x + obj.width / 2 
        : obj.y + obj.height / 2;
      
      if (Math.abs(center - position) <= 2) {
        centerCount++;
      }
    }
    
    return centerCount > objects.length / 2 ? 'center' : 'edge';
  }

  private isGuideRelevant(guide: AlignmentGuide, targetBounds: Rectangle): boolean {
    const threshold = snapManager.getPrefs().threshold * 2;
    
    if (guide.type === 'vertical') {
      const distances = [
        Math.abs(targetBounds.x - guide.position),
        Math.abs(targetBounds.x + targetBounds.width / 2 - guide.position),
        Math.abs(targetBounds.x + targetBounds.width - guide.position)
      ];
      return Math.min(...distances) <= threshold;
    } else {
      const distances = [
        Math.abs(targetBounds.y - guide.position),
        Math.abs(targetBounds.y + targetBounds.height / 2 - guide.position),
        Math.abs(targetBounds.y + targetBounds.height - guide.position)
      ];
      return Math.min(...distances) <= threshold;
    }
  }
}