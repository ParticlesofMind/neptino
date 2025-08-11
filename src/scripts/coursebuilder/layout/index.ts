/**
 * Layout System Module Exports
 * Exports the new modular layout architecture components
 */

export { CourseLayoutFactory } from './CourseLayoutFactory';
export { LayoutCalculator } from './LayoutCalculator';
export { CanvasNavigator } from './CanvasNavigator';
export { LayoutRenderer } from './LayoutRenderer';

export type { 
  LayoutBlock, 
  CanvasArea, 
  LessonDuration, 
  LayoutTemplate, 
  CourseLayout, 
  CanvasLayout,
  RenderedBlock,
  RenderedArea
} from './LayoutTypes';

export { 
  DEFAULT_BLOCKS,
  LESSON_DURATIONS 
} from './LayoutTypes';
