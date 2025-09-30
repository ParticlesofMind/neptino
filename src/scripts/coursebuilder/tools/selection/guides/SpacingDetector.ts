/**
 * Equal spacing detection and analysis
 */

import { Rectangle } from 'pixi.js';
import { snapManager } from '../../SnapManager';
import { EqualSpacingGroup } from './types';
import { GUIDE_THRESHOLDS } from './config';

export class SpacingDetector {
  
  /**
   * Detect equal spacing opportunities for target bounds
   */
  public detectEqualSpacing(
    targetBounds: Rectangle, 
    nearbyObjects: Rectangle[]
  ): EqualSpacingGroup[] {
    const tolerance = snapManager.getPrefs().equalTolerance || 2;
    
    const horizontalGroups = this.findEqualSpacingGroups(nearbyObjects, 'x', tolerance);
    const verticalGroups = this.findEqualSpacingGroups(nearbyObjects, 'y', tolerance);
    
    return [...horizontalGroups, ...verticalGroups]
      .filter(group => this.couldTargetJoinGroup(targetBounds, group))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find groups of objects with equal spacing
   */
  private findEqualSpacingGroups(
    objects: Rectangle[], 
    axis: 'x' | 'y', 
    tolerance: number
  ): EqualSpacingGroup[] {
    const groups: EqualSpacingGroup[] = [];
    const sortedObjects = [...objects].sort((a, b) => 
      axis === 'x' ? a.x - b.x : a.y - b.y
    );
    
    for (let i = 0; i < sortedObjects.length - 2; i++) {
      const group = [sortedObjects[i]];
      const gaps: number[] = [];
      
      for (let j = i + 1; j < sortedObjects.length; j++) {
        const prev = group[group.length - 1];
        const curr = sortedObjects[j];
        
        const gap = this.calculateGap(prev, curr, axis);
        if (gap <= 0) continue;
        
        if (gaps.length === 0) {
          gaps.push(gap);
          group.push(curr);
        } else {
          const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
          if (Math.abs(gap - avgGap) <= tolerance) {
            gaps.push(gap);
            group.push(curr);
          } else {
            break;
          }
        }
      }
      
      if (this.isValidGroup(group, gaps, tolerance)) {
        groups.push(this.createSpacingGroup(group, gaps, axis));
      }
    }
    
    return groups;
  }

  private calculateGap(obj1: Rectangle, obj2: Rectangle, axis: 'x' | 'y'): number {
    if (axis === 'x') {
      return obj2.x - (obj1.x + obj1.width);
    } else {
      return obj2.y - (obj1.y + obj1.height);
    }
  }

  private isValidGroup(group: Rectangle[], gaps: number[], tolerance: number): boolean {
    if (group.length < 3 || gaps.length < 2) return false;
    
    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const maxDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)));
    const confidence = Math.max(0, 1 - maxDeviation / tolerance);
    
    return confidence > GUIDE_THRESHOLDS.EQUAL_SPACING_CONFIDENCE;
  }

  private createSpacingGroup(
    group: Rectangle[], 
    gaps: number[], 
    axis: 'x' | 'y'
  ): EqualSpacingGroup {
    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    const maxDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)));
    const tolerance = snapManager.getPrefs().equalTolerance || 2;
    const confidence = Math.max(0, 1 - maxDeviation / tolerance);
    
    return {
      objects: group,
      axis,
      gap: avgGap,
      startPos: axis === 'x' ? group[0].x : group[0].y,
      endPos: axis === 'x' 
        ? group[group.length - 1].x + group[group.length - 1].width
        : group[group.length - 1].y + group[group.length - 1].height,
      confidence
    };
  }

  /**
   * Check if target could join an equal spacing group
   */
  private couldTargetJoinGroup(targetBounds: Rectangle, group: EqualSpacingGroup): boolean {
    const threshold = snapManager.getPrefs().threshold * 2;
    
    if (group.axis === 'x') {
      const targetCenter = targetBounds.y + targetBounds.height / 2;
      const groupCenter = group.objects[0].y + group.objects[0].height / 2;
      
      if (Math.abs(targetCenter - groupCenter) > threshold) return false;
      
      return this.canFitInSequence(
        targetBounds.x, 
        targetBounds.x + targetBounds.width, 
        group, 
        'x'
      );
    } else {
      const targetCenter = targetBounds.x + targetBounds.width / 2;
      const groupCenter = group.objects[0].x + group.objects[0].width / 2;
      
      if (Math.abs(targetCenter - groupCenter) > threshold) return false;
      
      return this.canFitInSequence(
        targetBounds.y, 
        targetBounds.y + targetBounds.height, 
        group, 
        'y'
      );
    }
  }

  private canFitInSequence(
    start: number, 
    end: number, 
    group: EqualSpacingGroup, 
    axis: 'x' | 'y'
  ): boolean {
    const tolerance = snapManager.getPrefs().equalTolerance || 2;
    
    // Check beginning, end, and between positions
    const firstObj = group.objects[0];
    const lastObj = group.objects[group.objects.length - 1];
    
    const firstStart = axis === 'x' ? firstObj.x : firstObj.y;
    const lastEnd = axis === 'x' ? lastObj.x + lastObj.width : lastObj.y + lastObj.height;
    
    // Beginning
    if (Math.abs((firstStart - end) - group.gap) <= tolerance) return true;
    
    // End
    if (Math.abs((start - lastEnd) - group.gap) <= tolerance) return true;
    
    // Between objects
    for (let i = 0; i < group.objects.length - 1; i++) {
      const obj1 = group.objects[i];
      const obj2 = group.objects[i + 1];
      
      const obj1End = axis === 'x' ? obj1.x + obj1.width : obj1.y + obj1.height;
      const obj2Start = axis === 'x' ? obj2.x : obj2.y;
      
      const gap1 = start - obj1End;
      const gap2 = obj2Start - end;
      
      if (gap1 > 0 && gap2 > 0 && 
          Math.abs(gap1 - group.gap) <= tolerance && 
          Math.abs(gap2 - group.gap) <= tolerance) {
        return true;
      }
    }
    
    return false;
  }
}