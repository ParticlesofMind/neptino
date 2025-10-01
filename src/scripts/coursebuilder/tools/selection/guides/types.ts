/**
 * Type definitions for the smart guides system
 */

import { Rectangle } from 'pixi.js';

export interface GuideColors {
  alignment: number;        // Primary alignment color (magenta by default)
  distance: number;         // Color for distance/measurement labels  
  equalSpacing: number;     // Color for equal spacing lines and ticks
  smartSelection: number;   // Color for smart selection handles
  tooLarge: number;         // Orange for overflow warnings
  grid: number;             // Color for grid overlay dots/lines
  darkThemeAlternate: number; // Alternate color for dark canvas themes
}

export type AlignmentSource =
  | 'canvas-edge'
  | 'canvas-center'
  | 'canvas-quadrant'
  | 'object-edge'
  | 'object-center'
  | 'object-edge-to-center';

export type GuideVisualStyle = 'solid' | 'dashed';

export type SnapStrength = 'strong' | 'medium' | 'weak';

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  alignmentType: 'edge' | 'center';
  objects: Rectangle[];
  strength: number; // How many objects align to this line
  source: AlignmentSource;
  visualStyle: GuideVisualStyle;
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
  referenceMode?: 'canvas' | 'object' | 'grid';
  suppressed?: boolean;
}

export interface AxisCandidate {
  value: number;
  source: AlignmentSource | 'grid';
  strength: SnapStrength;
}