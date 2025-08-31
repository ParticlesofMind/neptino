/**
 * FieldConfigurations - Single Source of Truth for Layout Field Definitions
 * 
 * This file centralizes all field configuration data used across:
 * - LayoutManager (dynamic column calculations)  
 * - Component classes (HeaderComponent, FooterComponent, ResourcesComponent)
 * - createTemplate.ts (template creation UI)
 * 
 * By maintaining field definitions in one place, we eliminate redundancy
 * and ensure consistency across the entire layout system.
 */

export interface FieldDefinition {
  name: string;
  label: string;
  mandatory: boolean;
}

// =============================================================================
// FIELD DEFINITIONS - Single Source of Truth
// =============================================================================

export const HEADER_FIELDS: FieldDefinition[] = [
  { name: 'lesson_number', label: 'Lesson number (#)', mandatory: true },
  { name: 'lesson_title', label: 'Lesson title', mandatory: true },
  { name: 'module_title', label: 'Module title', mandatory: true },
  { name: 'course_title', label: 'Course title', mandatory: true },
  { name: 'institution_name', label: 'Institution name', mandatory: true },
  { name: 'teacher_name', label: 'Teacher name', mandatory: false }
];

export const FOOTER_FIELDS: FieldDefinition[] = [
  { name: 'copyright', label: 'Copyright', mandatory: true },
  { name: 'teacher_name', label: 'Teacher name', mandatory: false },
  { name: 'institution_name', label: 'Institution name', mandatory: false },
  { name: 'page_number', label: 'Page number (#)', mandatory: true }
];

export const PROGRAM_FIELDS: FieldDefinition[] = [
  { name: 'competence', label: 'Competence', mandatory: true },
  { name: 'topic', label: 'Topic', mandatory: true },
  { name: 'objective', label: 'Objective', mandatory: true },
  { name: 'task', label: 'Task', mandatory: true }
];

export const RESOURCES_FIELDS: FieldDefinition[] = [
  { name: 'task', label: 'Task', mandatory: true },
  { name: 'type', label: 'Type', mandatory: true },
  { name: 'origin', label: 'Origin', mandatory: true },
  { name: 'state', label: 'State', mandatory: false },
  { name: 'quality', label: 'Quality', mandatory: false },
  { name: 'include_glossary', label: 'Include Glossary', mandatory: false },
  { name: 'historical_figures', label: 'Historical figures', mandatory: false },
  { name: 'terminology', label: 'Terminology', mandatory: false },
  { name: 'concepts', label: 'Concepts', mandatory: false }
];

export const CONTENT_FIELDS: FieldDefinition[] = [
  { name: 'topic', label: 'Topic', mandatory: true },
  { name: 'objective', label: 'Objective', mandatory: true },
  { name: 'task', label: 'Task', mandatory: true },
  { name: 'instruction_area', label: 'Instruction Area', mandatory: true },
  { name: 'student_area', label: 'Student Area', mandatory: true },
  { name: 'teacher_area', label: 'Teacher Area', mandatory: true }
];

export const ASSIGNMENT_FIELDS: FieldDefinition[] = [
  { name: 'topic', label: 'Topic', mandatory: true },
  { name: 'objective', label: 'Objective', mandatory: true },
  { name: 'task', label: 'Task', mandatory: true },
  { name: 'instruction_area', label: 'Instruction Area', mandatory: true },
  { name: 'student_area', label: 'Student Area', mandatory: true },
  { name: 'teacher_area', label: 'Teacher Area', mandatory: true }
];

// =============================================================================
// UTILITY FUNCTION - Used by Components
// =============================================================================

/**
 * Get field label by name (used by HeaderComponent, FooterComponent, ResourcesComponent)
 */
export function getFieldLabel(fieldName: string): string {
  // Search through all field groups for the label
  const allFields = [...HEADER_FIELDS, ...FOOTER_FIELDS, ...PROGRAM_FIELDS, ...RESOURCES_FIELDS, ...CONTENT_FIELDS, ...ASSIGNMENT_FIELDS];
  const field = allFields.find(f => f.name === fieldName);
  
  if (field) {
    return field.label;
  }
  
  // Fallback: convert field name to readable label
  return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
