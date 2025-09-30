/**
 * Type definitions for the smart guides system
 */

import { Rectangle } from 'pixi.js';

export interface GuideColors {
  alignment: number;        // Red for alignment guides
  distance: number;         // Red for distance labels  
  equalSpacing: number;     // Pink for equal spacing
  smartSelection: number;   // Pink for reorder handles
  tooLarge: number;         // Orange for overflow warnings
}

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  alignmentType: 'edge' | 'center';
  objects: Rectangle[];
  strength: number; // How many objects align to this line
}

export interface DistanceLabel {
  x: number;
  y: number;
  distance: number;
  fromRect: Rectangle;
  toRect: Rectangle;
  direction: 'horizontal' | 'vertical';
  target?: SnapObjectBounds; // For compatibility
}

export interface EqualSpacingGroup {
  objects: Rectangle[];
  axis: 'x' | 'y';
  gap: number;
  startPos: number;
  endPos: number;
  confidence: number;
}

export interface SmartSelectionHandle {
  x: number;
  y: number;
  index: number;
  group: EqualSpacingGroup;
}

export interface SnapResult {
  x?: number;
  y?: number;
}

export interface SnapObjectBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ObjectBounds extends SnapObjectBounds {}

export interface SnapPreferences {
  enableFigmaMode: boolean;
  redAlignmentGuides: boolean;
  magneticSnapping: boolean;
  showDistanceLabels: boolean;
  equalSpacingThreshold: number;
}

export interface GuideDetectionOptions {
  alignmentThreshold: number;
  distanceThreshold: number;
  spacingTolerance: number;
  maxGuideDistance: number;
}

export interface GuideState {
  isActive: boolean;
  draggedObject: SnapObjectBounds | null;
  nearbyObjects: SnapObjectBounds[];
  lastRenderTime: number;
  showDistanceLabels: boolean;
  activeGuides: AlignmentGuide[];
}