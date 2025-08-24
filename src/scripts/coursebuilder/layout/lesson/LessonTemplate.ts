/**
 * Lesson Template
 * Defines lesson template structure and configuration
 */

import type { Template, Block } from "../core/LayoutTypes";

export const LESSON_TEMPLATE_CONFIG: Template = {
  id: "lesson-template",
  name: "Pedagogical Lesson Template", 
  type: "lesson",
  canvasWidth: 794,
  canvasHeight: 1123,
  blocks: [
    {
      id: "header",
      name: "Header",
      type: "header",
      heightPercentage: 8,
      isRequired: true,
      enabled: true,
      styles: {
        backgroundColor: 0x4a90e2,
        padding: 10,
        gap: 10,
      },
      rows: [
        {
          id: "header-row",
          areas: [
            {
              id: "course-title",
              name: "Course Title",
              type: "instruction",
              allowsDrawing: false,
              allowsMedia: false,
              allowsText: true,
            }
          ]
        }
      ]
    },
    {
      id: "program", 
      name: "Learning Objectives",
      type: "program",
      heightPercentage: 15,
      isRequired: true,
      enabled: true,
      styles: {
        backgroundColor: 0x7ed321,
        padding: 12,
        gap: 5,
      },
      rows: [
        {
          id: "objectives-row",
          areas: [
            {
              id: "objectives-area",
              name: "Learning Objectives",
              type: "instruction",
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
            }
          ]
        }
      ]
    },
    {
      id: "content",
      name: "Main Content", 
      type: "content",
      heightPercentage: 50,
      isRequired: true,
      enabled: true,
      styles: {
        backgroundColor: 0xd0021b,
        padding: 15,
        gap: 10,
      },
      rows: [
        {
          id: "content-row",
          areas: [
            {
              id: "teacher-area",
              name: "Teacher Area",
              type: "teacher",
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
              flex: 1,
            },
            {
              id: "student-area", 
              name: "Student Work Area",
              type: "student",
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
              flex: 1,
            }
          ]
        }
      ]
    },
    {
      id: "resources",
      name: "Resources",
      type: "resources", 
      heightPercentage: 12,
      isRequired: false,
      enabled: true,
      styles: {
        backgroundColor: 0xf5a623,
        padding: 10,
        gap: 8,
      },
      rows: [
        {
          id: "resources-row",
          areas: [
            {
              id: "resources-area",
              name: "Resources & Materials",
              type: "teacher",
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
            }
          ]
        }
      ]
    },
    {
      id: "assessment",
      name: "Assessment",
      type: "assessment",
      heightPercentage: 10, 
      isRequired: false,
      enabled: true,
      styles: {
        backgroundColor: 0x9013fe,
        padding: 10,
        gap: 6,
      },
      rows: [
        {
          id: "assessment-row",
          areas: [
            {
              id: "assessment-area",
              name: "Assessment Tasks",
              type: "instruction",
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
            }
          ]
        }
      ]
    },
    {
      id: "footer",
      name: "Footer",
      type: "footer",
      heightPercentage: 5,
      isRequired: true,
      enabled: true,
      styles: {
        backgroundColor: 0x50e3c2,
        padding: 8,
        gap: 5,
      },
      rows: [
        {
          id: "footer-row", 
          areas: [
            {
              id: "footer-info",
              name: "Course Information",
              type: "instruction",
              allowsDrawing: false,
              allowsMedia: false,
              allowsText: true,
            }
          ]
        }
      ]
    }
  ]
};

/**
 * Create a new lesson template instance
 */
export function createLessonTemplate(overrides?: Partial<Template>): Template {
  return {
    ...LESSON_TEMPLATE_CONFIG,
    ...overrides,
    blocks: overrides?.blocks || LESSON_TEMPLATE_CONFIG.blocks.map(block => ({ ...block })),
  };
}

/**
 * Get default lesson block configurations
 */
export function getDefaultLessonBlocks(): Block[] {
  return LESSON_TEMPLATE_CONFIG.blocks.map(block => ({ ...block }));
}
