/**
 * Layout Styles - Neptino Design System
 * 
 * Minimalist design system with clean typography and subtle blue accents.
 * Transparent backgrounds that don't interfere with canvas rendering.
 */

// NEPTINO BRAND COLORS (from SCSS)
export const NEPTINO_COLORS = {
  // Primary Brand (Main Neptino Blue)
  PRIMARY_50: 0xe6f3ff,
  PRIMARY_100: 0xb3d9ff,
  PRIMARY_200: 0x80bfff,
  PRIMARY_300: 0x4da6ff,
  PRIMARY_400: 0x1a8cff,
  PRIMARY_500: 0x0066cc,  // Main brand blue
  PRIMARY_600: 0x0052a3,
  PRIMARY_700: 0x003d7a,
  PRIMARY_800: 0x002952,
  PRIMARY_900: 0x001429,

  // Neutral Colors (Clean, professional)
  NEUTRAL_25: 0xfcfcfc,
  NEUTRAL_50: 0xfafafa,
  NEUTRAL_75: 0xf8f8f8,
  NEUTRAL_100: 0xf5f5f5,
  NEUTRAL_200: 0xe5e5e5,
  NEUTRAL_300: 0xd4d4d4,
  NEUTRAL_400: 0xa3a3a3,
  NEUTRAL_500: 0x737373,
  NEUTRAL_600: 0x525252,
  NEUTRAL_700: 0x404040,
  NEUTRAL_800: 0x262626,
  NEUTRAL_900: 0x171717,

  // Transparent (for canvas-friendly backgrounds)
  TRANSPARENT: 0x000000, // Use with alpha: 0
};

// MODERN TYPOGRAPHY SYSTEM
export const TYPOGRAPHY = {
  // Font Stack - Modern system fonts
  FONT_FAMILY: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  
  // Font Sizes (smaller, more refined)
  SIZE_XS: 8,   // Tiny labels
  SIZE_SM: 9,   // Small text
  SIZE_MD: 10,  // Regular text  
  SIZE_LG: 11,  // Headers in components
  SIZE_XL: 12,  // Main headers
  SIZE_2XL: 14, // Large headers
  
  // Font Weights
  WEIGHT_LIGHT: '300',
  WEIGHT_REGULAR: '400',
  WEIGHT_MEDIUM: '500',
  WEIGHT_SEMIBOLD: '600',
  WEIGHT_BOLD: '700',

  // Text Colors
  COLOR_PRIMARY: NEPTINO_COLORS.NEUTRAL_900,    // Main text
  COLOR_SECONDARY: NEPTINO_COLORS.NEUTRAL_600,  // Secondary text
  COLOR_TERTIARY: NEPTINO_COLORS.NEUTRAL_500,   // Tertiary text
  COLOR_ACCENT: NEPTINO_COLORS.PRIMARY_500,     // Accent text (Neptino blue)
  COLOR_MUTED: NEPTINO_COLORS.NEUTRAL_400,      // Muted text
};

// SPACING SYSTEM (tight, minimal)
export const SPACING = {
  XS: 2,   // Tight elements
  SM: 4,   // Close elements  
  MD: 8,   // Regular spacing
  LG: 12,  // Loose spacing
  XL: 16,  // Wide spacing
  XXL: 24, // Extra wide spacing
};

// BORDER SYSTEM (subtle accents)
export const BORDERS = {
  // Widths
  NONE: 0,
  THIN: 0.5,  // Ultra-thin for minimal look
  REGULAR: 1,
  
  // Colors & Styles
  COLOR_SUBTLE: NEPTINO_COLORS.PRIMARY_500, // Neptino blue
  COLOR_NEUTRAL: NEPTINO_COLORS.NEUTRAL_300,
  ALPHA_SUBTLE: 0.1,  // Very transparent
  ALPHA_LIGHT: 0.2,
  ALPHA_REGULAR: 0.3,
};

// BACKGROUND SYSTEM (transparency-focused)
export const BACKGROUNDS = {
  // Canvas-friendly (transparent or ultra-subtle)
  TRANSPARENT: { color: NEPTINO_COLORS.TRANSPARENT, alpha: 0 },
  SUBTLE: { color: NEPTINO_COLORS.NEUTRAL_50, alpha: 0.02 },
  LIGHT: { color: NEPTINO_COLORS.NEUTRAL_100, alpha: 0.05 },
  
  // Debug/development backgrounds
  DEBUG: { color: NEPTINO_COLORS.PRIMARY_500, alpha: 0.05 },
  DEBUG_BORDER: { color: NEPTINO_COLORS.PRIMARY_500, width: BORDERS.THIN, alpha: BORDERS.ALPHA_SUBTLE },
};

// COMPONENT-SPECIFIC CONFIGURATIONS
export const COMPONENT_STYLES = {
  // Header Component
  HEADER: {
    padding: { top: SPACING.MD, right: SPACING.LG, bottom: SPACING.MD, left: SPACING.LG },
    typography: {
      fontSize: TYPOGRAPHY.SIZE_LG,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_MEDIUM,
      fill: TYPOGRAPHY.COLOR_PRIMARY,
    },
    background: BACKGROUNDS.TRANSPARENT,
    border: { width: BORDERS.NONE },
  },

  // Footer Component
  FOOTER: {
    padding: { top: SPACING.SM, right: SPACING.LG, bottom: SPACING.SM, left: SPACING.LG },
    typography: {
      fontSize: TYPOGRAPHY.SIZE_SM,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_SECONDARY,
    },
    background: BACKGROUNDS.TRANSPARENT,
    border: { width: BORDERS.NONE },
  },

  // Program Component  
  PROGRAM: {
    padding: { top: SPACING.MD, right: SPACING.LG, bottom: SPACING.MD, left: SPACING.LG },
    typography: {
      fontSize: TYPOGRAPHY.SIZE_MD,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_PRIMARY,
    },
    background: BACKGROUNDS.TRANSPARENT,
    border: { width: BORDERS.NONE },
  },

  // Content Component
  CONTENT: {
    padding: { top: SPACING.LG, right: SPACING.LG, bottom: SPACING.LG, left: SPACING.LG },
    typography: {
      // Title level
      title: {
        fontSize: TYPOGRAPHY.SIZE_LG,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_MEDIUM,
        fill: TYPOGRAPHY.COLOR_PRIMARY,
      },
      // Regular content level
      content: {
        fontSize: TYPOGRAPHY.SIZE_MD,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
        fill: TYPOGRAPHY.COLOR_PRIMARY,
      },
      // Label/metadata level
      label: {
        fontSize: TYPOGRAPHY.SIZE_SM,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
        fill: TYPOGRAPHY.COLOR_SECONDARY,
      }
    },
    background: BACKGROUNDS.TRANSPARENT,
    border: { width: BORDERS.NONE },
    // Visual hierarchy spacing
    hierarchy: {
      level1: SPACING.XXL, // Topic level
      level2: SPACING.XL,  // Objective level
      level3: SPACING.LG,  // Task level
      level4: SPACING.MD,  // Area level
    }
  },

  // Assignment Component
  ASSIGNMENT: {
    padding: { top: SPACING.LG, right: SPACING.LG, bottom: SPACING.LG, left: SPACING.LG },
    typography: {
      title: {
        fontSize: TYPOGRAPHY.SIZE_LG,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_MEDIUM,
        fill: TYPOGRAPHY.COLOR_PRIMARY,
      },
      content: {
        fontSize: TYPOGRAPHY.SIZE_MD,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
        fill: TYPOGRAPHY.COLOR_PRIMARY,
      },
      meta: {
        fontSize: TYPOGRAPHY.SIZE_SM,
        fontFamily: TYPOGRAPHY.FONT_FAMILY,
        fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
        fill: TYPOGRAPHY.COLOR_SECONDARY,
      }
    },
    background: BACKGROUNDS.TRANSPARENT,
    border: { width: BORDERS.NONE },
    // Assignment-specific colors
    status: {
      submitted: NEPTINO_COLORS.PRIMARY_500,
      pending: NEPTINO_COLORS.NEUTRAL_400,
      graded: NEPTINO_COLORS.NEUTRAL_700,
    }
  },

  // Debug/Development
  DEBUG: {
    border: BACKGROUNDS.DEBUG_BORDER,
    background: BACKGROUNDS.DEBUG,
    typography: {
      fontSize: TYPOGRAPHY.SIZE_XS,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_ACCENT,
    }
  }
};

// UTILITY FUNCTIONS
export const createTextStyle = (variant: 'title' | 'content' | 'label' | 'meta' = 'content') => {
  const styles = {
    title: {
      fontSize: TYPOGRAPHY.SIZE_LG,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_MEDIUM,
      fill: TYPOGRAPHY.COLOR_PRIMARY,
    },
    content: {
      fontSize: TYPOGRAPHY.SIZE_MD,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_PRIMARY,
    },
    label: {
      fontSize: TYPOGRAPHY.SIZE_SM,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_SECONDARY,
    },
    meta: {
      fontSize: TYPOGRAPHY.SIZE_SM,
      fontFamily: TYPOGRAPHY.FONT_FAMILY,
      fontWeight: TYPOGRAPHY.WEIGHT_REGULAR,
      fill: TYPOGRAPHY.COLOR_TERTIARY,
    }
  };
  
  return styles[variant];
};

export const createBorder = (style: 'none' | 'subtle' | 'regular' = 'none') => {
  const borders = {
    none: { width: BORDERS.NONE },
    subtle: { 
      color: BORDERS.COLOR_SUBTLE, 
      width: BORDERS.THIN, 
      alpha: BORDERS.ALPHA_SUBTLE 
    },
    regular: { 
      color: BORDERS.COLOR_NEUTRAL, 
      width: BORDERS.REGULAR, 
      alpha: BORDERS.ALPHA_REGULAR 
    }
  };
  
  return borders[style];
};

export const createBackground = (style: 'transparent' | 'subtle' | 'debug' = 'transparent') => {
  const backgrounds = {
    transparent: BACKGROUNDS.TRANSPARENT,
    subtle: BACKGROUNDS.SUBTLE,
    debug: BACKGROUNDS.DEBUG
  };
  
  return backgrounds[style];
};
