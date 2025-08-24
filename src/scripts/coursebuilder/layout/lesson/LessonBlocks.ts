/**
 * Lesson Blocks
 * Lesson-specific block configurations and utilities
 */

import type { Block, BaseBlockConfig, BlockArea } from "../core/LayoutTypes";

/**
 * Standard lesson block types
 */
export enum LessonBlockType {
  HEADER = "header",
  PROGRAM = "program", 
  CONTENT = "content",
  RESOURCES = "resources",
  ASSESSMENT = "assessment",
  FOOTER = "footer"
}

/**
 * Standard lesson area types  
 */
export enum LessonAreaType {
  INSTRUCTION = "instruction",
  STUDENT = "student", 
  TEACHER = "teacher",
  MEDIA = "media",
  TEXT = "text"
}

/**
 * Create a header block for lessons
 */
export function createHeaderBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "header",
    name: "Header",
    type: LessonBlockType.HEADER,
    heightPercentage: 8,
    isRequired: true,
    enabled: true,
    styles: {
      backgroundColor: 0x4a90e2,
      padding: 10,
      gap: 10,
    },
    ...config,
    rows: [
      {
        id: "header-row",
        areas: [
          {
            id: "course-title",
            name: "Course Title", 
            type: LessonAreaType.INSTRUCTION,
            allowsDrawing: false,
            allowsMedia: false,
            allowsText: true,
          }
        ]
      }
    ]
  };
}

/**
 * Create a program/objectives block for lessons
 */
export function createProgramBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "program",
    name: "Learning Objectives",
    type: LessonBlockType.PROGRAM,
    heightPercentage: 15,
    isRequired: true,
    enabled: true,
    styles: {
      backgroundColor: 0x7ed321,
      padding: 12,
      gap: 5,
    },
    ...config,
    rows: [
      {
        id: "objectives-row",
        areas: [
          {
            id: "objectives-area",
            name: "Learning Objectives",
            type: LessonAreaType.INSTRUCTION,
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
          }
        ]
      }
    ]
  };
}

/**
 * Create a main content block for lessons
 */
export function createContentBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "content",
    name: "Main Content",
    type: LessonBlockType.CONTENT,
    heightPercentage: 50,
    isRequired: true,
    enabled: true,
    styles: {
      backgroundColor: 0xd0021b,
      padding: 15,
      gap: 10,
    },
    ...config,
    rows: [
      {
        id: "content-row", 
        areas: [
          {
            id: "teacher-area",
            name: "Teacher Area",
            type: LessonAreaType.TEACHER,
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
            flex: 1,
          },
          {
            id: "student-area",
            name: "Student Work Area", 
            type: LessonAreaType.STUDENT,
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
            flex: 1,
          }
        ]
      }
    ]
  };
}

/**
 * Create a resources block for lessons
 */
export function createResourcesBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "resources",
    name: "Resources",
    type: LessonBlockType.RESOURCES,
    heightPercentage: 12,
    isRequired: false,
    enabled: true,
    styles: {
      backgroundColor: 0xf5a623,
      padding: 10,
      gap: 8,
    },
    ...config,
    rows: [
      {
        id: "resources-row",
        areas: [
          {
            id: "resources-area",
            name: "Resources & Materials",
            type: LessonAreaType.TEACHER,
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
          }
        ]
      }
    ]
  };
}

/**
 * Create an assessment block for lessons
 */
export function createAssessmentBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "assessment", 
    name: "Assessment",
    type: LessonBlockType.ASSESSMENT,
    heightPercentage: 10,
    isRequired: false,
    enabled: true,
    styles: {
      backgroundColor: 0x9013fe,
      padding: 10,
      gap: 6,
    },
    ...config,
    rows: [
      {
        id: "assessment-row",
        areas: [
          {
            id: "assessment-area",
            name: "Assessment Tasks",
            type: LessonAreaType.INSTRUCTION,
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
          }
        ]
      }
    ]
  };
}

/**
 * Create a footer block for lessons
 */
export function createFooterBlock(config?: Partial<BaseBlockConfig>): Block {
  return {
    id: "footer",
    name: "Footer", 
    type: LessonBlockType.FOOTER,
    heightPercentage: 5,
    isRequired: true,
    enabled: true,
    styles: {
      backgroundColor: 0x50e3c2,
      padding: 8,
      gap: 5,
    },
    ...config,
    rows: [
      {
        id: "footer-row",
        areas: [
          {
            id: "footer-info",
            name: "Course Information",
            type: LessonAreaType.INSTRUCTION,
            allowsDrawing: false,
            allowsMedia: false,
            allowsText: true,
          }
        ]
      }
    ]
  };
}

/**
 * Create standard teaching area
 */
export function createTeachingArea(id: string, name: string): BlockArea {
  return {
    id,
    name,
    type: LessonAreaType.TEACHER,
    allowsDrawing: true,
    allowsMedia: true,
    allowsText: true,
    flex: 1,
  };
}

/**
 * Create standard student work area
 */
export function createStudentArea(id: string, name: string): BlockArea {
  return {
    id,
    name,
    type: LessonAreaType.STUDENT,
    allowsDrawing: true,
    allowsMedia: true,
    allowsText: true,
    flex: 1,
  };
}

/**
 * Create instruction area
 */
export function createInstructionArea(id: string, name: string): BlockArea {
  return {
    id,
    name,
    type: LessonAreaType.INSTRUCTION,
    allowsDrawing: true,
    allowsMedia: true,
    allowsText: true,
  };
}
