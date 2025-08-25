/**
 * CSS-PIXI Helper Utilities
 * Bridge between CSS styling and PIXI.js objects
 * 
 * This helper provides utilities to:
 * 1. Apply CSS class identifiers to PIXI objects for future CSS integration
 * 2. Map CSS variables to PIXI styling values
 * 3. Prevent hardcoded styling in TypeScript files
 */

import { Text, Graphics } from "pixi.js";

// CSS Variable mappings for lesson template
export const LESSON_CSS_VARS = {
  colors: {
    headerBg: 0x4a90e2,        // --lesson-header-bg
    programBg: 0x7ed321,       // --lesson-program-bg  
    resourcesBg: 0xf5a623,     // --lesson-resources-bg
    contentBg: 0xd0021b,       // --lesson-content-bg
    assignmentsBg: 0x9013fe,   // --lesson-assignments-bg
    footerBg: 0x50e3c2,        // --lesson-footer-bg
    
    tableHeaderBg: 0xe0e0e0,   // --lesson-table-header-bg
    tableRowEven: 0xf8f8f8,    // --lesson-table-row-even
    tableRowOdd: 0xffffff,     // --lesson-table-row-odd
    tableBorder: 0x666666,     // --lesson-table-border
    safeAreaBorder: 0xcccccc,  // --lesson-safe-area-border
    
    textColor: 0x000000,       // --lesson-text-color
    textColorSecondary: 0x333333, // --lesson-text-color-secondary
    textColorLight: 0x666666,  // --lesson-text-color-light
    textColorWhite: 0xffffff,  // --lesson-text-color-white
  },
  
  typography: {
    fontFamily: 'Arial',       // --lesson-font-family
    fontSizeHeader: 14,        // --lesson-font-size-header
    fontSizeTableHeader: 12,   // --lesson-font-size-table-header
    fontSizeContent: 11,       // --lesson-font-size-content
    fontSizeSmall: 10,         // --lesson-font-size-small
  },
  
  layout: {
    headerHeight: 80,          // --lesson-header-height
    footerHeight: 60,          // --lesson-footer-height
    pageMargin: 20,            // --lesson-page-margin
    contentPadding: 15,        // --lesson-content-padding
    rowHeight: 20,             // --lesson-row-height
    tableRowHeight: 25,        // --lesson-table-row-height
  }
};

/**
 * Apply CSS class identifier to a PIXI object for future styling integration
 */
export function applyCSSClass(pixiObject: any, cssClass: string): void {
  if (pixiObject) {
    pixiObject.cssClass = cssClass;
  }
}

/**
 * Create text with CSS-based styling
 */
export function createLessonText(text: string, variant: 'header' | 'table-header' | 'content' | 'small' = 'content'): Text {
  const styles = {
    header: {
      fontSize: LESSON_CSS_VARS.typography.fontSizeHeader,
      fill: LESSON_CSS_VARS.colors.textColorWhite,
      fontWeight: 'bold' as const,
    },
    'table-header': {
      fontSize: LESSON_CSS_VARS.typography.fontSizeTableHeader,
      fill: LESSON_CSS_VARS.colors.textColor,
      fontWeight: 'bold' as const,
    },
    content: {
      fontSize: LESSON_CSS_VARS.typography.fontSizeContent,
      fill: LESSON_CSS_VARS.colors.textColor,
      fontWeight: 'normal' as const,
    },
    small: {
      fontSize: LESSON_CSS_VARS.typography.fontSizeSmall,
      fill: LESSON_CSS_VARS.colors.textColorLight,
      fontWeight: 'normal' as const,
    }
  };

  const textObj = new Text({
    text,
    style: {
      fontFamily: LESSON_CSS_VARS.typography.fontFamily,
      ...styles[variant]
    }
  });
  
  applyCSSClass(textObj, `layout-lesson__text--${variant}`);
  return textObj;
}

/**
 * Create graphics with CSS-based styling
 */
export function createLessonGraphics(variant: 'header-bg' | 'table-header-bg' | 'table-row-even' | 'table-row-odd' | 'table-border'): Graphics {
  const graphics = new Graphics();
  applyCSSClass(graphics, `layout-lesson__graphics--${variant}`);
  return graphics;
}

/**
 * Get block background color from CSS mapping
 */
export function getBlockBackgroundColor(blockType: string): number {
  const colorMap: Record<string, number> = {
    header: LESSON_CSS_VARS.colors.headerBg,
    program: LESSON_CSS_VARS.colors.programBg,
    resources: LESSON_CSS_VARS.colors.resourcesBg,
    content: LESSON_CSS_VARS.colors.contentBg,
    assignments: LESSON_CSS_VARS.colors.assignmentsBg,
    footer: LESSON_CSS_VARS.colors.footerBg,
  };
  
  return colorMap[blockType] || LESSON_CSS_VARS.colors.textColorSecondary;
}

/**
 * Validate safe area boundaries to prevent header/footer bleeding
 */
export function validateSafeArea(y: number, height: number, canvasHeight: number): { isValid: boolean, adjustedY: number, adjustedHeight: number } {
  const safeTop = LESSON_CSS_VARS.layout.headerHeight + LESSON_CSS_VARS.layout.contentPadding;
  const safeBottom = canvasHeight - (LESSON_CSS_VARS.layout.footerHeight + LESSON_CSS_VARS.layout.contentPadding);
  
  const contentBottom = y + height;
  let adjustedY = y;
  let adjustedHeight = height;
  let isValid = true;
  
  // Check if content exceeds safe area
  if (y < safeTop) {
    adjustedY = safeTop;
    adjustedHeight = height - (safeTop - y);
    isValid = false;
  }
  
  if (contentBottom > safeBottom) {
    adjustedHeight = safeBottom - adjustedY;
    isValid = false;
  }
  
  return {
    isValid,
    adjustedY,
    adjustedHeight: Math.max(0, adjustedHeight) // Ensure positive height
  };
}
