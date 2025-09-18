/**
 * Animation Scene Styling - Centralized styling constants following BEM principles
 * These constants mirror the CSS classes structure but for PIXI.js components
 */

// Color constants following the CSS design
export const SceneColors = {
  // Primary theme colors
  primary: 0x80bfff,           // #80bfff - main blue color
  primaryHover: 0x99ccff,      // #99ccff - lighter blue for hover
  primaryDark: 0x4a79a4,       // #4a79a4 - darker blue (legacy)
  
  // Neutral colors
  white: 0xffffff,             // #ffffff
  lightGray: 0xe8e8e8,         // #e8e8e8 - timeline background
  mediumGray: 0xd0d0d0,        // #d0d0d0 - borders
  darkGray: 0x666666,          // #666666 - text/inactive elements
  
  // Semantic colors
  border: 0x666666,            // Border color
  borderSelected: 0x80bfff,    // Selected border color
  text: 0x666666,              // Text color
} as const;

// Spacing constants following BEM principles
export const SceneSpacing = {
  // Button spacing (equivalent to CSS gap)
  buttonGap: 12,               // gap between main buttons
  buttonGroupGap: 30,          // gap between button groups
  
  // Timeline spacing
  timelineMarginBottom: 20,    // space below timeline
  timelinePadding: 8,          // padding around timeline
  
  // Container spacing  
  controlsMarginTop: 8,        // space above controls
  buttonRowMarginTop: 40,      // space between timeline and buttons
  
  // Component padding
  buttonPadding: 6,            // internal button padding
  
  // Positioning
  timeTextOffset: 60,          // time text right offset
  hideToggleOffset: 20,        // hide toggle right offset
} as const;

// Size constants following BEM size variants
export const SceneSizing = {
  // Button sizes (matching CSS --small, --medium, --large)
  button: {
    small: { width: 32, height: 32, iconSize: 20 },
    medium: { width: 36, height: 36, iconSize: 24 },  
    large: { width: 44, height: 44, iconSize: 32 },
  },
  
  // Timeline dimensions
  timeline: {
    height: 10,
    borderRadius: 5,
    handleRadius: 8,
    handleBorder: 2,
  },
  
  // Border and corner radius
  borderRadius: {
    button: 6,
    timeline: 5,
    scene: 4,
  },
  
  // Border widths
  borderWidth: {
    default: 1,
    selected: 2,
    handle: 2,
  },
} as const;

// Animation and interaction constants
export const SceneInteraction = {
  // Hover effects
  hover: {
    scale: 1.1,
    scaleAnchor: 1.25,
    buttonTranslateY: -1,
  },
  
  // Alpha/opacity values
  alpha: {
    default: 0.8,
    hover: 1.0,
    selected: 0.9,
    inactive: 0.4,
    hidden: 0.7,
    livePreview: 0.85,
  },
  
  // Transition durations (for smooth updates)
  transition: {
    fast: 100,    // 0.1s equivalent
    normal: 200,  // 0.2s equivalent
  },
} as const;

// Text styling constants
export const SceneTypography = {
  timeDisplay: {
    fontFamily: 'Arial',
    fontSize: 11,
    fontWeight: '500',
    fill: SceneColors.text,
  },
} as const;

// Path and anchor styling
export const ScenePathStyling = {
  path: {
    color: SceneColors.primary,
    width: 2,
    alpha: SceneInteraction.alpha.default,
  },
  
  pathSelected: {
    alpha: SceneInteraction.alpha.selected,
  },
  
  pathLivePreview: {
    alpha: SceneInteraction.alpha.livePreview,
    dashArray: [4, 2], // PIXI doesn't support dash arrays directly, but we can simulate
  },
  
  anchor: {
    radius: 5,
    fill: SceneColors.white,
    stroke: SceneColors.primary,
    strokeWidth: 2,
    alpha: SceneInteraction.alpha.default,
  },
  
  anchorHover: {
    scale: SceneInteraction.hover.scaleAnchor,
    alpha: SceneInteraction.alpha.hover,
  },
  
  anchorSelected: {
    alpha: SceneInteraction.alpha.hover,
  },
} as const;

// Utility functions for styling
export const SceneStyleUtils = {
  /**
   * Get button size configuration based on variant
   */
  getButtonSize(variant: 'small' | 'medium' | 'large') {
    return SceneSizing.button[variant];
  },
  
  /**
   * Get hover color for any base color
   */
  getHoverColor(baseColor: number): number {
    if (baseColor === SceneColors.primary) return SceneColors.primaryHover;
    return baseColor;
  },
  
  /**
   * Get alpha value for state
   */
  getAlpha(state: 'default' | 'hover' | 'selected' | 'inactive' | 'hidden'): number {
    return SceneInteraction.alpha[state];
  },
} as const;

// Export all constants as a single object for convenience
export const SceneTheme = {
  colors: SceneColors,
  spacing: SceneSpacing,
  sizing: SceneSizing,
  interaction: SceneInteraction,
  typography: SceneTypography,
  path: ScenePathStyling,
  utils: SceneStyleUtils,
} as const;

export default SceneTheme;