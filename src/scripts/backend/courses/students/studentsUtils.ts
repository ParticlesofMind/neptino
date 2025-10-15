import type { StudentRecord } from "./studentsTypes.js";

export function ensureStudentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `student_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function sanitiseValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

export function parseAssessment(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseLearningStyle(value: string): string[] | null {
  if (!value) return null;
  return value
    .split(/[,;/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function withCourseAndDefaults(
  student: StudentRecord,
  courseId: string,
  enrollmentDate: string | null,
): StudentRecord {
  return {
    ...student,
    course_id: courseId,
    enrollment_date: enrollmentDate ?? student.enrollment_date ?? null,
    student_id: student.student_id ?? ensureStudentId(),
  };
}
