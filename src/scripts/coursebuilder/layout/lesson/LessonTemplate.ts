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
        // Styling moved to CSS: .layout-lesson__header
        padding: 10,
        gap: 10,
      },
      rows: [
        {
          id: "header-row",
          height: 60,
          areas: [
            {
              id: "course-title",
              name: "Course Title",
              type: "instruction",
              widthPercentage: 100,
              content: { type: "text", data: "Course Title Area" },
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
      name: "Program",
      type: "program",
      heightPercentage: 15,
      isRequired: true,
      enabled: true,
      styles: {
        // Styling moved to CSS: .layout-lesson__program
        padding: 12,
        gap: 5,
      },
      rows: [
        {
          id: "objectives-row",
          height: 120,
          areas: [
            {
              id: "objectives-area",
              name: "Learning Objectives",
              type: "instruction",
              widthPercentage: 100,
              content: { type: "text", data: "Learning Objectives Area" },
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
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
        // Styling moved to CSS: .layout-lesson__resources
        padding: 10,
        gap: 8,
      },
      rows: [
        {
          id: "resources-row",
          height: 100,
          areas: [
            {
              id: "resources-area",
              name: "Resources & Materials",
              type: "teacher",
              widthPercentage: 100,
              content: { type: "container", data: {} },
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
      name: "Content", 
      type: "content",
      heightPercentage: 50,
      isRequired: true,
      enabled: true,
      styles: {
        // Styling moved to CSS: .layout-lesson__content
        padding: 15,
        gap: 10,
      },
      rows: [
        {
          id: "content-row",
          height: 400,
          areas: [
            {
              id: "teacher-area",
              name: "Teacher Area",
              type: "teacher",
              widthPercentage: 50,
              content: { type: "container", data: {} },
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
              flex: 1,
            },
            {
              id: "student-area", 
              name: "Student Work Area",
              type: "student",
              widthPercentage: 50,
              content: { type: "container", data: {} },
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
      id: "resources-duplicate",
      name: "Resources",
      type: "resources", 
      heightPercentage: 12,
      isRequired: false,
      enabled: true,
      styles: {
        // Styling moved to CSS: .layout-lesson__resources
        padding: 10,
        gap: 8,
      },
      rows: [
        {
          id: "resources-row-duplicate",
          height: 100,
          areas: [
            {
              id: "resources-area-duplicate",
              name: "Resources & Materials",
              type: "teacher",
              widthPercentage: 100,
              content: { type: "container", data: {} },
              allowsDrawing: true,
              allowsMedia: true,
              allowsText: true,
            }
          ]
        }
      ]
    },
    {
      id: "assignments",
      name: "Assignments",
      type: "assignments",
      heightPercentage: 10, 
      isRequired: false,
      enabled: true,
      styles: {
        // Styling moved to CSS: .layout-lesson__assignment
        padding: 10,
        gap: 6,
      },
      rows: [
        {
          id: "assignments-row",
          height: 80,
          areas: [
            {
              id: "assignments-area",
              name: "Assignments & Tasks",
              type: "instruction",
              widthPercentage: 100,
              content: { type: "text", data: "Assignments & Tasks" },
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
        // Styling moved to CSS: .layout-lesson__footer
        padding: 8,
        gap: 5,
      },
      rows: [
        {
          id: "footer-row",
          height: 40,
          areas: [
            {
              id: "footer-info",
              name: "Footer Information",
              type: "instruction",
              widthPercentage: 100,
              content: { type: "text", data: "Footer Area" },
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
