/**
 * Configuration and constants for the smart guides system
 */

import { GuideColors, SnapStrength } from './types';

export const GUIDE_COLORS: GuideColors = {
  alignment: 0xFF00FF,          // Magenta for high-contrast guides
  distance: 0xFF00FF,           // Measurements match guide color
  equalSpacing: 0xFF00FF,       // Equal spacing + ticks use same tone
  smartSelection: 0xFF00FF,     // Handles inherit magenta accent
  tooLarge: 0xFF9500,           // Orange warnings unchanged
  grid: 0xFF00FF,               // Grid dots/lines share magenta hue
  darkThemeAlternate: 0x00E5FF  // Cyan alternate for dark canvases
};

export const GUIDE_LIMITS = {
  MAX_ALIGNMENT_GUIDES: 4,
  MAX_DISTANCE_LABELS: 6,
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
  GUIDE_ALPHA_BASE: 0.4,
  GUIDE_ALPHA_PER_STRENGTH: 0.15,
  GUIDE_ALPHA_MAX: 1,
  HANDLE_RADIUS: 6,
  HANDLE_STROKE_WIDTH: 1,
  LABEL_PADDING_X: 6,
  LABEL_PADDING_Y: 3,
  LABEL_BACKGROUND_ALPHA: 0.85,
  DISTANCE_LABEL_OFFSET: 12,
  DASH_PHASE: 6,
  DASH_GAP: 4,
  GRID_DOT_SIZE: 1.5,
  GRID_MAJOR_INTERVAL: 5
};

export const SNAP_STRENGTH_TOLERANCE: Record<SnapStrength, number> = {
  strong: 8,
  medium: 6,
  weak: 4
};