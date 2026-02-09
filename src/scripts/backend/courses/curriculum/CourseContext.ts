import type { CourseInfo } from "../../../integration/utils/CanvasDataAccessor.js";

type LessonStructureSummary = { topics: number; objectives: number; tasks: number };

type CourseMetadata = {
  courseTitle: string | null;
  courseCode: string | null;
  institutionName: string | null;
  teacherName: string | null;
  teacherId: string | null;
  courseDescription: string | null;
  courseLanguage: string | null;
  scheduleSettings: unknown;
};

type TeacherProfile = {
  full_name?: string | null;
  username?: string | null;
};

type BuilderContextInput = {
  courseId: string | null;
  moduleTitles: Map<number, string>;
  lessonStructures: Map<number, LessonStructureSummary>;
  lessonDates: Map<number, string>;
};

export class CourseContext {
  private metadata: CourseMetadata = {
    courseTitle: null,
    courseCode: null,
    institutionName: null,
    teacherName: null,
    teacherId: null,
    courseDescription: null,
    courseLanguage: null,
    scheduleSettings: null,
  };

  constructor(private readonly courseId: string | null) {}

  public applyCourseData(courseData: any, teacherProfile?: TeacherProfile | null): void {
    this.metadata.courseTitle = courseData?.course_name || courseData?.title || "Untitled Course";
    this.metadata.courseCode = courseData?.course_code ?? courseData?.id ?? null;
    this.metadata.institutionName = courseData?.institution ?? null;
    this.metadata.teacherId = courseData?.teacher_id ?? null;
    this.metadata.courseDescription = courseData?.course_description ?? courseData?.description ?? null;
    this.metadata.courseLanguage = courseData?.course_language ?? null;
    this.metadata.scheduleSettings = courseData?.schedule_settings ?? null;
    this.metadata.teacherName = this.resolveTeacherName(teacherProfile, courseData);
  }

  public getCourseTitle(): string | null {
    return this.metadata.courseTitle;
  }

  public getTeacherName(): string | null {
    return this.metadata.teacherName;
  }

  public buildCanvasBuilderContext(input: BuilderContextInput): {
    courseId: string | null;
    courseTitle: string | null;
    courseCode: string | null;
    institutionName: string | null;
    teacherName: string | null;
    moduleTitles: Map<number, string>;
    lessonStructures: Map<number, LessonStructureSummary>;
    lessonDates: Map<number, string>;
  } {
    return {
      courseId: input.courseId,
      courseTitle: this.metadata.courseTitle,
      courseCode: this.metadata.courseCode,
      institutionName: this.metadata.institutionName,
      teacherName: this.metadata.teacherName,
      moduleTitles: input.moduleTitles,
      lessonStructures: input.lessonStructures,
      lessonDates: input.lessonDates,
    };
  }

  public buildCourseInfo(): CourseInfo | null {
    if (!this.courseId) {
      return null;
    }

    return {
      id: this.courseId,
      course_name: this.metadata.courseTitle ?? "Untitled Course",
      course_description: this.metadata.courseDescription ?? undefined,
      course_language: this.metadata.courseLanguage ?? undefined,
      schedule_settings: this.metadata.scheduleSettings ?? undefined,
      institution: this.metadata.institutionName,
      teacher_id: this.metadata.teacherId,
      teacherName: this.metadata.teacherName,
    };
  }

  private resolveTeacherName(teacherProfile?: TeacherProfile | null, courseData?: any): string | null {
    if (teacherProfile?.full_name && teacherProfile.full_name.trim().length > 0) {
      return teacherProfile.full_name.trim();
    }

    if (teacherProfile?.username) {
      return teacherProfile.username;
    }

    if (typeof courseData?.teacher_name === "string" && courseData.teacher_name.trim().length > 0) {
      return courseData.teacher_name.trim();
    }

    if (typeof courseData?.teacher === "string" && courseData.teacher.trim().length > 0) {
      return courseData.teacher.trim();
    }

    return null;
  }
}
