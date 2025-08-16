/**
 * Unified Layout System Types
 * Combines the best of custom pedagogical layouts with PixiJS Layout v3 integration
 */

export interface LayoutBlock {
 id: string;
 name: string;
 heightPercentage: number;
 isRequired: boolean;
 canvasAreas?: CanvasArea[];
 // PixiJS Layout v3 compatibility
 type?: "header" | "content" | "resources" | "assignment" | "footer";
 styles?: {
 display?: "flex" | "none";
 flexDirection?: "row" | "column";
 justifyContent?:
 | "flex-start"
 | "flex-end"
 | "center"
 | "space-between"
 | "space-around";
 alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
 backgroundColor?: string;
 borderRadius?: number;
 padding?: number;
 gap?: number;
 flex?: number;
 width?: string | number;
 height?: string | number;
 };
}

export interface CanvasArea {
 id: string;
 name: string;
 type: "instruction" | "student" | "teacher";
 allowsDrawing: boolean;
 allowsMedia: boolean;
 allowsText: boolean;
}

export interface LessonDuration {
 type: "mini" | "regular" | "double" | "triple" | "longer";
 maxMinutes: number;
 canvasMultiplier: number;
}

export interface LayoutTemplate {
 id: string;
 name: string;
 blocks: LayoutBlock[];
 socialForm?: string;
 mediaTypes?: string[];
}

export interface CourseLayout {
 id: string;
 courseId: string;
 templateId: string;
 totalCanvases: number;
 scheduledSessions: number;
 lessonDuration: LessonDuration;
 canvases: CanvasLayout[];
}

export interface CanvasLayout {
 id: string;
 sessionNumber: number;
 canvasNumber: number;
 blocks: RenderedBlock[];
}

export interface RenderedBlock {
 blockId: string;
 x: number;
 y: number;
 width: number;
 height: number;
 areas: RenderedArea[];
}

export interface RenderedArea {
 areaId: string;
 x: number;
 y: number;
 width: number;
 height: number;
 content?: any; // Will hold drawings, media, text content
}

// Default layout blocks with their proportions
export const DEFAULT_BLOCKS: LayoutBlock[] = [
 {
 id: "header",
 name: "Header",
 heightPercentage: 8,
 isRequired: true,
 canvasAreas: [
 {
 id: "header-instruction-title",
 name: "Instruction Title",
 type: "instruction",
 allowsDrawing: false,
 allowsMedia: false,
 allowsText: true,
 },
 {
 id: "header-content-area",
 name: "Header Content",
 type: "teacher",
 allowsDrawing: false,
 allowsMedia: false,
 allowsText: true,
 },
 ],
 },
 {
 id: "program",
 name: "Program",
 heightPercentage: 15,
 isRequired: true,
 canvasAreas: [
 {
 id: "program-instruction-area",
 name: "Instruction Area",
 type: "instruction",
 allowsDrawing: true,
 allowsMedia: true,
 allowsText: true,
 },
 ],
 },
 {
 id: "resources",
 name: "Resources",
 heightPercentage: 12,
 isRequired: false,
 canvasAreas: [
 {
 id: "resources-student-title",
 name: "Student Title",
 type: "student",
 allowsDrawing: false,
 allowsMedia: false,
 allowsText: true,
 },
 {
 id: "resources-student-area",
 name: "Student Area",
 type: "student",
 allowsDrawing: true,
 allowsMedia: true,
 allowsText: true,
 },
 ],
 },
 {
 id: "content",
 name: "Content",
 heightPercentage: 50,
 isRequired: true,
 canvasAreas: [
 {
 id: "content-teacher-title",
 name: "Teacher Title",
 type: "teacher",
 allowsDrawing: false,
 allowsMedia: false,
 allowsText: true,
 },
 {
 id: "content-teacher-area",
 name: "Teacher Area",
 type: "teacher",
 allowsDrawing: true,
 allowsMedia: true,
 allowsText: true,
 },
 ],
 },
 {
 id: "assignment",
 name: "Assignment",
 heightPercentage: 10,
 isRequired: false,
 canvasAreas: [
 {
 id: "assignment-instruction-area",
 name: "Instruction Area",
 type: "instruction",
 allowsDrawing: true,
 allowsMedia: true,
 allowsText: true,
 },
 ],
 },
 {
 id: "footer",
 name: "Footer",
 heightPercentage: 5,
 isRequired: true,
 canvasAreas: [
 {
 id: "footer-content-area",
 name: "Footer Content",
 type: "instruction",
 allowsDrawing: false,
 allowsMedia: false,
 allowsText: true,
 },
 ],
 },
];

// Lesson duration configurations
export const LESSON_DURATIONS: LessonDuration[] = [
 { type: "mini", maxMinutes: 30, canvasMultiplier: 1 },
 { type: "regular", maxMinutes: 60, canvasMultiplier: 2 },
 { type: "double", maxMinutes: 120, canvasMultiplier: 4 },
 { type: "triple", maxMinutes: 180, canvasMultiplier: 8 },
 { type: "longer", maxMinutes: 999, canvasMultiplier: 16 },
];
