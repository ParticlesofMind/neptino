/**
 * PageMetadata - Data structure for page template metadata
 * Contains all information needed to populate header and footer
 */

export type MethodType = "Lecture" | "Discussion" | "Activity" | "Assessment" | "Lab" | "Workshop" | "Seminar";
export type SocialFormType = "Individual" | "Pairs" | "Small Group" | "Whole Class" | "Online" | "Hybrid";

export interface TemplateSummary {
  id?: string;
  slug?: string;
  type?: string;
  name?: string;
  scope?: string;
  description?: string | null;
}

export interface LayoutNode {
  id: string;
  type: string;
  role?: string;
  order?: number;
  templateBlock?: {
    id: string;
    type: string;
    order: number;
    content?: string;
    config?: Record<string, unknown>;
  };
  data?: Record<string, unknown>;
  children?: LayoutNode[];
}

export interface PageMetadata {
  // Page identification
  pageNumber: number;
  totalPages: number;
  lessonNumber: number;
  lessonTitle: string;
  canvasId?: string;
  canvasIndex?: number;
  canvasType?: string | null;

  // Course information
  courseName: string;
  courseCode: string;
  moduleNumber?: number | null;
  moduleTitle?: string | null;
  institutionName?: string | null;
  teacherName?: string | null;

  // Template data
  date: string; // ISO date string or formatted date
  method: MethodType;
  socialForm: SocialFormType;
  duration: number; // in minutes
  structure?: {
    topics: number;
    objectives: number;
    tasks: number;
  } | null;
  copyright?: string | null;
  
  // Optional metadata
  instructor?: string;
  topic?: string;
  objectives?: string[];
  materials?: string[];
  notes?: string;
  templateInfo?: TemplateSummary | null;
  layout?: LayoutNode | null;
}

/**
 * Format date for display
 */
export const formatDate = (isoDate: string): string => {
  if (!isoDate) {
    return "";
  }

  let date: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    date = new Date(`${isoDate}T12:00:00Z`);
  } else {
    date = new Date(isoDate);
  }

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Format duration for display
 */
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};
