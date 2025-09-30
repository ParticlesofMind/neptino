/**
 * Configuration and constants for the smart guides system
 */

import { GuideColors } from './types';

export const GUIDE_COLORS: GuideColors = {
  alignment: 0x007AFF,        // Blue for alignment guides (like iOS/Figma)
  distance: 0x007AFF,         // Blue for distance labels  
  equalSpacing: 0xFF69B4,     // Pink for equal spacing
  smartSelection: 0xFF69B4,   // Pink for handles
  tooLarge: 0xFF9500          // Orange for warnings
};

export const GUIDE_LIMITS = {
  MAX_ALIGNMENT_GUIDES: 5,
  MAX_DISTANCE_LABELS: 8,
  MAX_EQUAL_SPACING_GROUPS: 2,
  HANDLE_CLICK_THRESHOLD: 10,
  SPATIAL_INDEX_UPDATE_INTERVAL: 100,
  MIN_RENDER_INTERVAL: 16 // ~60fps throttling
};

export const GUIDE_THRESHOLDS = {
  EQUAL_SPACING_CONFIDENCE: 0.7,
  HIGH_CONFIDENCE_HANDLES: 0.8,
  RELEVANCE_MULTIPLIER: 2
};

export const VISUAL_SETTINGS = {
  GUIDE_ALPHA_BASE: 0.3,
  GUIDE_ALPHA_PER_STRENGTH: 0.1,
  GUIDE_ALPHA_MAX: 0.9,
  HANDLE_RADIUS: 6,
  HANDLE_STROKE_WIDTH: 1,
  LABEL_PADDING_X: 4,
  LABEL_PADDING_Y: 2,
  DISTANCE_LABEL_OFFSET: 10
};