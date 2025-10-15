import { dispatchProfilesIndexed } from "./studentsProfileService.js";
import { StudentsPreview } from "./studentsPreview.js";
import { StudentsRepository } from "./studentsRepository.js";
import type { StudentRecord } from "./studentsTypes.js";
import {
  ensureStudentId,
  parseAssessment,
  parseLearningStyle,
  sanitiseValue,
} from "./studentsUtils.js";

interface ManualManagerOptions {
  preview: StudentsPreview;
  repository: StudentsRepository;
  onActivity: (message: string) => void;
  onSuccess: () => void;
  onCourseIdMissing: () => void;
  onStatusChange?: (state: "saving" | "saved" | "error", message?: string) => void;
}

const BULK_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "student_id",
  "grade_level",
  "learning_style",
  "assessment_score",
  "enrollment_date",
  "notes",
] as const;

export class StudentsManualManager {
  private readonly form: HTMLFormElement | null;
  private readonly feedback: HTMLElement | null;
  private readonly status: HTMLElement | null;
  private readonly submitButton: HTMLButtonElement | null;
  private readonly firstNameInput: HTMLInputElement | null;
  private readonly lastNameInput: HTMLInputElement | null;
  private readonly emailInput: HTMLInputElement | null;
  private readonly studentIdInput: HTMLInputElement | null;
  private readonly gradeLevelSelect: HTMLSelectElement | null;
  private readonly enrollmentDateInput: HTMLInputElement | null;
  private readonly learningStyleInput: HTMLInputElement | null;
  private readonly assessmentInput: HTMLInputElement | null;
  private readonly notesInput: HTMLTextAreaElement | null;
  private readonly bulkInput: HTMLTextAreaElement | null;

  constructor(private readonly options: ManualManagerOptions) {
    this.form = document.getElementById("students-manual-form") as HTMLFormElement | null;
    this.feedback = document.getElementById("students-manual-feedback");
    this.status = document.getElementById("students-manual-status");
    this.submitButton = document.getElementById("students-manual-submit-btn") as HTMLButtonElement | null;
    this.firstNameInput = document.getElementById("manual-first-name") as HTMLInputElement | null;
    this.lastNameInput = document.getElementById("manual-last-name") as HTMLInputElement | null;
    this.emailInput = document.getElementById("manual-email") as HTMLInputElement | null;
    this.studentIdInput = document.getElementById("manual-student-id") as HTMLInputElement | null;
    this.gradeLevelSelect = document.getElementById("manual-grade-level") as HTMLSelectElement | null;
    this.enrollmentDateInput = document.getElementById("manual-enrollment-date") as HTMLInputElement | null;
    this.learningStyleInput = document.getElementById("manual-learning-style") as HTMLInputElement | null;
    this.assessmentInput = document.getElementById("manual-assessment-score") as HTMLInputElement | null;
    this.notesInput = document.getElementById("manual-notes") as HTMLTextAreaElement | null;
    this.bulkInput = document.getElementById("manual-bulk-input") as HTMLTextAreaElement | null;
  }

  public init(): void {
    if (!this.form) return;
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      void this.handleSubmit();
    });
    this.setDefaultEnrollmentDate();
  }

  public prepare(): void {
    this.setDefaultEnrollmentDate();
    this.clearFeedback();
  }

  private setDefaultEnrollmentDate(): void {
    if (!this.enrollmentDateInput) return;
    const today = new Date().toISOString().slice(0, 10);
    if (!this.enrollmentDateInput.value) {
      this.enrollmentDateInput.value = today;
    }
  }

  private showFeedback(message: string, tone: "success" | "error" | "warning"): void {
    if (!this.feedback) return;
    this.feedback.hidden = false;
    this.feedback.dataset.state = tone;
    this.feedback.textContent = message;
  }

  private clearFeedback(): void {
    if (!this.feedback) return;
    this.feedback.hidden = true;
    this.feedback.textContent = "";
    delete this.feedback.dataset.state;
  }

  private setBusy(isBusy: boolean): void {
    if (this.status) {
      this.status.hidden = !isBusy;
    }
    if (this.submitButton) {
      this.submitButton.disabled = isBusy;
    }
    if (this.form) {
      this.form.classList.toggle("is-loading", isBusy);
    }
  }

  private collectSingleStudent(): StudentRecord | null {
    const firstName = sanitiseValue(this.firstNameInput?.value ?? "");
    const lastName = sanitiseValue(this.lastNameInput?.value ?? "");

    if (!firstName && !lastName) {
      return null;
    }

    if (!firstName || !lastName) {
      this.showFeedback("First and last name are required for manual entry.", "warning");
      throw new Error("Missing required name fields.");
    }

    const email = sanitiseValue(this.emailInput?.value ?? "");
    const studentId = sanitiseValue(this.studentIdInput?.value ?? "");
    const gradeLevel = sanitiseValue(this.gradeLevelSelect?.value ?? "");
    const enrollmentDate = sanitiseValue(this.enrollmentDateInput?.value ?? "");
    const learningStyle = sanitiseValue(this.learningStyleInput?.value ?? "");
    const assessment = sanitiseValue(this.assessmentInput?.value ?? "");
    const notes = sanitiseValue(this.notesInput?.value ?? "");

    return {
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      student_id: studentId || ensureStudentId(),
      grade_level: gradeLevel || null,
      enrollment_date: enrollmentDate || null,
      learning_style: parseLearningStyle(learningStyle),
      assessment_score: parseAssessment(assessment),
      notes: notes || null,
    };
  }

  private parseBulkEntries(): StudentRecord[] {
    const rawText = this.bulkInput?.value ?? "";
    if (!rawText.trim()) return [];

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const students: StudentRecord[] = [];
    lines.forEach((line, index) => {
      const values = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((value) => value.replace(/^"|"$/g, "").trim());
      if (values.length < 2) {
        this.showFeedback(`Line ${index + 1} is missing required columns. Expect at least first and last name.`, "warning");
        return;
      }

      const record: Partial<StudentRecord> = {};
      BULK_HEADERS.forEach((header, headerIndex) => {
        record[header] = values[headerIndex] ?? "";
      });

      const firstName = sanitiseValue(record.first_name);
      const lastName = sanitiseValue(record.last_name);
      if (!firstName || !lastName) {
        return;
      }

      const email = sanitiseValue(record.email);
      const studentId = sanitiseValue(record.student_id);
      const gradeLevel = sanitiseValue(record.grade_level);
      const enrollmentDate = sanitiseValue(record.enrollment_date);
      const learningStyle = sanitiseValue(record.learning_style);
      const assessment = sanitiseValue(record.assessment_score);
      const notes = sanitiseValue(record.notes);

      students.push({
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        student_id: studentId || ensureStudentId(),
        grade_level: gradeLevel || null,
        enrollment_date: enrollmentDate || null,
        learning_style: parseLearningStyle(learningStyle),
        assessment_score: parseAssessment(assessment),
        notes: notes || null,
      });
    });

    return students;
  }

  private resetForm(): void {
    this.form?.reset();
    this.setDefaultEnrollmentDate();
  }

  private async handleSubmit(): Promise<void> {
    const courseId = this.options.repository.getCourseId();
    if (!courseId) {
      this.options.onCourseIdMissing();
      this.showFeedback("Create the course first. Save essentials to generate a course ID.", "warning");
      return;
    }

    this.clearFeedback();

    let singleStudent: StudentRecord | null = null;
    try {
      singleStudent = this.collectSingleStudent();
    } catch {
      return;
    }

    const bulkStudents = this.parseBulkEntries();
    if (!singleStudent && !bulkStudents.length) {
      this.showFeedback("Add at least one student using the form or bulk textarea.", "warning");
      return;
    }

    const students: StudentRecord[] = [];
    if (singleStudent) {
      students.push(singleStudent);
    }
    students.push(...bulkStudents);

    this.options.onStatusChange?.("saving", "Saving students…");
    this.setBusy(true);
    try {
      const { data, error } = await this.options.repository.upsertStudents(students);
      if (error) {
        console.error("Failed to save students:", error);
        this.showFeedback(error.message ?? "Failed to save students to Supabase.", "error");
        this.options.onStatusChange?.("error", "Failed to save students");
        return;
      }

      const stored = data ?? students;
      this.options.preview.render(stored);
      const { data: summary } = await this.options.repository.fetchSummary();
      if (summary) {
        this.options.preview.updateSummary(summary);
      }
      dispatchProfilesIndexed(courseId, stored);
      this.options.onActivity(`Added ${stored.length} student${stored.length === 1 ? "" : "s"} manually.`);
      this.showFeedback(`Saved ${stored.length} student${stored.length === 1 ? "" : "s"} successfully.`, "success");
      this.resetForm();
      this.options.onSuccess();
      this.options.onStatusChange?.("saved");
    } finally {
      this.setBusy(false);
    }
  }
}
