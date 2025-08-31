/**
 * Layout System Index - Main Export File
 * 
 * Provides a clean API for importing layout system components
 */

export { LayoutManager, type GridConfig, type LayoutRegion, type LayoutTemplate, type PageMargins, type ColumnConfiguration } from './LayoutManager';
export { HeaderComponent, type HeaderConfig, type HeaderContent } from './HeaderComponent';
export { FooterComponent, type FooterConfig, type FooterContent } from './FooterComponent';
export { ProgramComponent, type ProgramConfig, type ProgramContent } from './ProgramComponent';
export { ResourcesComponent, type ResourcesConfig, type ResourcesContent } from './ResourcesComponent';
export { ContentComponent, type ContentConfig, type ContentContent, type ContentHierarchy, type Topic, type Objective, type Task, type ContentAreas } from './ContentComponent';
export { AssignmentComponent, type AssignmentConfig, type AssignmentContent, type AssignmentHierarchy, type AssignmentTopic, type AssignmentObjective, type AssignmentTask, type AssignmentAreas } from './AssignmentComponent';

// Modern Design System
export { 
  NEPTINO_COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDERS,
  BACKGROUNDS,
  COMPONENT_STYLES,
  createTextStyle,
  createBorder,
  createBackground
} from './LayoutStyles';

// Field configurations
export { 
  HEADER_FIELDS, 
  FOOTER_FIELDS, 
  PROGRAM_FIELDS, 
  RESOURCES_FIELDS, 
  CONTENT_FIELDS,
  ASSIGNMENT_FIELDS,
  getFieldLabel,
  type FieldDefinition
} from './FieldConfigurations';

// Re-export commonly used types for convenience
export type {
  GridConfig as LayoutGridConfig,
  LayoutRegion as LayoutArea,
  LayoutTemplate as Template
} from './LayoutManager';
