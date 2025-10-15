import type { PostgrestError } from "@supabase/supabase-js";

export type StudentField =
  | "first_name"
  | "last_name"
  | "email"
  | "student_id"
  | "grade_level"
  | "learning_style"
  | "assessment_score"
  | "enrollment_date"
  | "notes";

export type StudentFieldLabel = {
  field: StudentField;
  label: string;
  required: boolean;
};

export const STUDENT_FIELD_LABELS: StudentFieldLabel[] = [
  { field: "first_name", label: "First name", required: true },
  { field: "last_name", label: "Last name", required: true },
  { field: "email", label: "Email", required: false },
  { field: "student_id", label: "Student ID", required: false },
  { field: "grade_level", label: "Grade level", required: false },
  { field: "learning_style", label: "Learning style preferences", required: false },
  { field: "assessment_score", label: "Initial assessment score", required: false },
  { field: "enrollment_date", label: "Enrollment date", required: false },
  { field: "notes", label: "Custom notes", required: false },
];

export type StudentFieldMapping = Partial<Record<StudentField, string>>;

export interface RawStudentRow {
  [header: string]: string | number | boolean | null | undefined;
}

export interface StudentRecord {
  first_name: string;
  last_name: string;
  email?: string | null;
  student_id?: string | null;
  grade_level?: string | null;
  learning_style?: string[] | null;
  assessment_score?: number | null;
  enrollment_date?: string | null;
  notes?: string | null;
  course_id?: string;
  created_by?: string;
  synced_at?: string | null;
}

export interface StudentProfile extends StudentRecord {
  profile_id: string;
  profile_tags: string[];
  ai_notes: string;
}

export interface StudentParseResult {
  headers: string[];
  mapping: StudentFieldMapping;
  rows: RawStudentRow[];
  warnings: string[];
}

export interface StudentTransformResult {
  students: StudentRecord[];
  invalidRows: number[];
  warnings: string[];
}

export interface RepositoryResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

export interface RosterSummary {
  total: number;
  synced: number;
  gradeLevels: string[];
}
