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
 * Default metadata for testing/demo purposes
 */
export const createDefaultMetadata = (pageNumber: number, totalPages: number): PageMetadata => ({
  pageNumber,
  totalPages,
  lessonNumber: Math.ceil(pageNumber / 3), // Assuming 3 pages per lesson
  lessonTitle: `Lesson ${Math.ceil(pageNumber / 3)}: Introduction to Topic`,
  courseName: "Advanced Coursebuilding",
  courseCode: "CB-101",
  date: new Date().toISOString(),
  method: "Lecture",
  socialForm: "Whole Class",
  duration: 50,
  instructor: "Dr. Smith",
  topic: `Topic ${pageNumber}`,
  moduleNumber: Math.ceil(pageNumber / 3),
  canvasIndex: pageNumber,
  canvasType: "default",
  copyright: `© ${new Date().getFullYear()} Neptino`,
  templateInfo: null,
  layout: null,
  moduleTitle: null,
  institutionName: null,
  teacherName: "Dr. Smith",
  structure: null,
});

/**
 * Sample course data with multiple lessons
 */
export const createSampleCourseData = (): PageMetadata[] => {
  const lessons = [
    {
      lessonNumber: 1,
      lessonTitle: "Introduction to Programming",
      method: "Lecture" as MethodType,
      socialForm: "Whole Class" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 2,
      lessonTitle: "Variables and Data Types",
      method: "Activity" as MethodType,
      socialForm: "Pairs" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 3,
      lessonTitle: "Control Flow",
      method: "Lab" as MethodType,
      socialForm: "Individual" as SocialFormType,
      pages: 4,
    },
    {
      lessonNumber: 4,
      lessonTitle: "Functions and Modules",
      method: "Discussion" as MethodType,
      socialForm: "Small Group" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 5,
      lessonTitle: "Object-Oriented Programming",
      method: "Lecture" as MethodType,
      socialForm: "Whole Class" as SocialFormType,
      pages: 4,
    },
    {
      lessonNumber: 6,
      lessonTitle: "Data Structures",
      method: "Activity" as MethodType,
      socialForm: "Pairs" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 7,
      lessonTitle: "Algorithms",
      method: "Lab" as MethodType,
      socialForm: "Individual" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 8,
      lessonTitle: "File I/O and Persistence",
      method: "Workshop" as MethodType,
      socialForm: "Small Group" as SocialFormType,
      pages: 3,
    },
    {
      lessonNumber: 9,
      lessonTitle: "Error Handling",
      method: "Discussion" as MethodType,
      socialForm: "Whole Class" as SocialFormType,
      pages: 2,
    },
    {
      lessonNumber: 10,
      lessonTitle: "Final Project",
      method: "Assessment" as MethodType,
      socialForm: "Individual" as SocialFormType,
      pages: 3,
    },
  ];

  const allPages: PageMetadata[] = [];
  let currentPage = 1;

  lessons.forEach((lesson) => {
    for (let i = 0; i < lesson.pages; i++) {
      allPages.push({
        pageNumber: currentPage,
        totalPages: 0, // Will be set after we know total
        lessonNumber: lesson.lessonNumber,
        lessonTitle: lesson.lessonTitle,
        courseName: "Introduction to Computer Science",
        courseCode: "CS-101",
        date: new Date(2025, 0, lesson.lessonNumber * 7).toISOString(), // Weekly lessons
        method: lesson.method,
        socialForm: lesson.socialForm,
        duration: 50,
        instructor: "Prof. Johnson",
        topic: `${lesson.lessonTitle} - Part ${i + 1}`,
        moduleNumber: lesson.lessonNumber,
        canvasIndex: currentPage,
        canvasType: "default",
        templateInfo: null,
        layout: null,
        moduleTitle: null,
        institutionName: "University",
        teacherName: "Prof. Johnson",
        structure: null,
        copyright: `© ${new Date().getFullYear()} Prof. Johnson`,
      });
      currentPage++;
    }
  });

  // Update totalPages for all pages
  const totalPages = allPages.length;
  allPages.forEach((page) => {
    page.totalPages = totalPages;
  });

  return allPages;
};

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
