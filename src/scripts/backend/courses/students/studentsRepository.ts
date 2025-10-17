import { supabase } from "../../supabase.js";
import type {
  RepositoryResult,
  RosterSummary,
  StudentRecord,
} from "./studentsTypes.js";

const DEFAULT_GRADE_LEVEL = "Unspecified";

function normalizeDate(input?: string | null): string | null {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeLearningStyle(value?: string[] | string | null): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value
    .split(/[,;/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export class StudentsRepository {
  private courseId: string | null;

  constructor(courseId?: string | null) {
    this.courseId = courseId ?? null;
  }

  public setCourseId(courseId: string | null): void {
    this.courseId = courseId ?? null;
  }

  public getCourseId(): string | null {
    return this.courseId;
  }

  public async fetchRoster(): Promise<RepositoryResult<StudentRecord[]>> {
    if (!this.courseId) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("students")
      .select(
        "id, first_name, last_name, email, student_id, grade_level, learning_style, assessment_score, enrollment_date, notes, course_id, created_by",
      )
      .eq("course_id", this.courseId)
      .order("last_name", { ascending: true });

    return { data: data ?? [], error };
  }

  public async fetchSummary(): Promise<RepositoryResult<RosterSummary>> {
    if (!this.courseId) {
      return {
        data: { total: 0, synced: 0, gradeLevels: [] },
        error: null,
      };
    }

    const { data, error } = await supabase
      .from("students")
      .select(
        "grade_level, synced_at",
        { count: "exact", head: false },
      )
      .eq("course_id", this.courseId);

    if (error) {
      return { data: null, error };
    }

    const gradeLevels = new Set<string>();
    let synced = 0;

    (data ?? []).forEach((row: { grade_level: string | null; synced_at?: string | null }) => {
      if (row.grade_level) {
        gradeLevels.add(row.grade_level);
      }
      if (row.synced_at) {
        synced += 1;
      }
    });

    return {
      data: {
        total: data?.length ?? 0,
        synced,
        gradeLevels: Array.from(gradeLevels.values()),
      },
      error: null,
    };
  }

  public async upsertStudents(
    students: StudentRecord[],
  ): Promise<RepositoryResult<StudentRecord[]>> {
    if (!students.length) {
      return { data: [], error: null };
    }

    if (!this.courseId) {
      throw new Error("Course ID is required to save students.");
    }

    const createdBy = await this.resolveCurrentUserId();

    const payload = students.map((student) => ({
      ...student,
      course_id: this.courseId,
      created_by: student.created_by ?? createdBy,
      grade_level: student.grade_level ?? DEFAULT_GRADE_LEVEL,
      learning_style: normalizeLearningStyle(student.learning_style ?? null),
      enrollment_date: normalizeDate(student.enrollment_date ?? null),
      synced_at: student.synced_at ?? null,
    }));

    const { data, error } = await supabase
      .from("students")
      .upsert(payload, {
        onConflict: "course_id, email",
        ignoreDuplicates: false,
      })
      .select();

    return { data: data ?? [], error };
  }

  public async updateStudent(studentId: string, updates: Partial<StudentRecord>): Promise<RepositoryResult<StudentRecord>> {
    if (!this.courseId || !studentId) {
      return { data: null, error: { message: "Course ID and Student ID are required" } as unknown as any };
    }

    const payload: Partial<StudentRecord> = { ...updates };

    if (payload.learning_style !== undefined) {
      payload.learning_style = normalizeLearningStyle(payload.learning_style ?? null);
    }
    if (payload.enrollment_date !== undefined) {
      payload.enrollment_date = normalizeDate(payload.enrollment_date ?? null);
    }
    if (!payload.grade_level && updates.grade_level === "") {
      payload.grade_level = DEFAULT_GRADE_LEVEL;
    }

    const { data, error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", studentId)
      .eq("course_id", this.courseId)
      .select()
      .single();

    return { data, error };
  }

  public async deleteStudent(studentId: string): Promise<RepositoryResult<null>> {
    if (!this.courseId || !studentId) {
      return { data: null, error: { message: "Course ID and Student ID are required" } as unknown as any };
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("course_id", this.courseId);

    return { data: null, error };
  }

  private async resolveCurrentUserId(): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      return user?.id ?? null;
    } catch (error) {
      console.warn("Unable to resolve current user for student inserts:", error);
      return null;
    }
  }
}
