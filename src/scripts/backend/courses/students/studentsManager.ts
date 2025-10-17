import { StudentsManualManager } from "./studentsManualManager.js";
import { StudentsModalController } from "./studentsModalController.js";
import { StudentsPreview } from "./studentsPreview.js";
import { StudentsRepository } from "./studentsRepository.js";
import { StudentsUploadManager } from "./studentsUploadManager.js";
import type { StudentRecord } from "./studentsTypes.js";
import { dispatchProfilesIndexed } from "./studentsProfileService.js";

interface StudentsManagerOptions {
  courseId?: string | null;
}

export class StudentsManager {
  private readonly repository: StudentsRepository;
  private readonly preview: StudentsPreview;
  private readonly modalController: StudentsModalController;
  private readonly uploadManager: StudentsUploadManager;
  private readonly manualManager: StudentsManualManager;
  private initialized = false;
  private currentStudents: StudentRecord[] = [];

  constructor(options: StudentsManagerOptions = {}) {
    this.repository = new StudentsRepository(options.courseId);
    this.preview = new StudentsPreview();
    this.modalController = new StudentsModalController();

    this.uploadManager = new StudentsUploadManager({
      preview: this.preview,
      repository: this.repository,
      onCourseIdMissing: () => this.handleMissingCourseId(),
      onActivity: (message) => this.preview.appendActivity(message),
      onSuccess: () => {
        this.modalController.close("students-upload-modal");
        void this.refreshRoster();
      },
      onStatusChange: (state, message) => this.updateStatus(state, message),
    });

    this.manualManager = new StudentsManualManager({
      preview: this.preview,
      repository: this.repository,
      onActivity: (message) => this.preview.appendActivity(message),
      onSuccess: () => {
        this.modalController.close("students-manual-modal");
        void this.refreshRoster();
      },
      onCourseIdMissing: () => this.handleMissingCourseId(),
      onStatusChange: (state, message) => this.updateStatus(state, message),
    });
  }

  public init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.modalController.init();
    this.uploadManager.init();
    this.manualManager.init();
    this.registerUiEvents();
    this.registerCourseIdListeners();
    this.preview.setOnDeleteRow((index) => this.handleDeleteStudent(index));
    this.preview.setOnUpdateRow((index, updates) => this.handleUpdateStudent(index, updates));
    void this.refreshRoster();
  }

  public setCourseId(courseId: string | null): void {
    if (!courseId) return;
    const current = this.repository.getCourseId();
    if (current === courseId) return;
    this.repository.setCourseId(courseId);
    void this.refreshRoster();
  }

  public activate(): void {
    this.init();
    void this.refreshRoster();
  }

  private registerUiEvents(): void {
    const refreshBtn = document.getElementById("students-refresh-btn");
    refreshBtn?.addEventListener("click", () => void this.refreshRoster(true));

    const exportBtn = document.getElementById("students-export-btn");
    exportBtn?.addEventListener("click", () => this.exportRoster());

    const clearBtn = document.getElementById("students-clear-preview-btn");
    clearBtn?.addEventListener("click", () => this.preview.clearPreview());

    const manualTrigger = document.getElementById("students-manual-btn");
    manualTrigger?.addEventListener("click", () => this.manualManager.prepare());
  }

  private registerCourseIdListeners(): void {
    if (typeof window === "undefined") return;

    const updateCourseId = (event: Event): void => {
      const detail = (event as CustomEvent).detail;
      const courseId = detail?.courseId ?? detail?.id;
      if (typeof courseId === "string" && courseId) {
        this.setCourseId(courseId);
      }
    };

    window.addEventListener("courseCreated", updateCourseId);
    window.addEventListener("courseIdUpdated", updateCourseId);
    window.addEventListener("courseIdResolved", updateCourseId);
  }

  private getStatusElements(): {
    container: HTMLElement | null;
    text: HTMLElement | null;
  } {
    const container = document.getElementById(
      "students-save-status",
    ) as HTMLElement | null;
    const text = container?.querySelector(
      ".save-status__text",
    ) as HTMLElement | null;
    return { container, text };
  }

  private formatSavedMessage(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `This page was last saved at ${hours}:${minutes}, on ${day}.${month}.${year}`;
  }

  private updateStatus(
    state: "empty" | "saving" | "saved" | "error",
    message?: string,
  ): void {
    const { container, text } = this.getStatusElements();
    if (!container || !text) return;

    container.dataset.status = state;

    if (!message) {
      if (state === "saved") {
        text.textContent = this.formatSavedMessage();
        return;
      }
      if (state === "saving") {
        text.textContent = "Saving changes…";
        return;
      }
      if (state === "empty") {
        text.textContent = "No data submitted yet";
        return;
      }
    }

    text.textContent = message || "";
  }

  private async refreshRoster(showActivity = false): Promise<void> {
    this.updateStatus("saving", showActivity ? "Refreshing roster…" : "Loading roster…");
    this.preview.setBusy(true);
    const { data, error } = await this.repository.fetchRoster();
    const { data: summary } = await this.repository.fetchSummary();
    this.preview.setBusy(false);

    if (error) {
      console.error("Unable to load students roster:", error);
      this.preview.showFeedback("We could not load the student roster. Try refreshing the page.", "error");
      this.updateStatus("error", "Failed to load roster");
      return;
    }

    this.currentStudents = data ?? [];
    this.preview.render(this.currentStudents);
    if (summary) {
      this.preview.updateSummary(summary);
    }

    const courseId = this.repository.getCourseId();
    if (courseId && this.currentStudents.length) {
      dispatchProfilesIndexed(courseId, this.currentStudents);
    }

    if (this.currentStudents.length > 0) {
      this.updateStatus("saved");
    } else {
      this.updateStatus("empty");
    }

    if (showActivity) {
      this.preview.appendActivity("Roster refreshed from Supabase.");
    }
  }

  private exportRoster(): void {
    if (!this.currentStudents.length) {
      this.preview.showFeedback("No roster data to export yet. Import or add students first.", "warning");
      return;
    }

    const headers = [
      "First name",
      "Last name",
      "Email",
      "Student ID",
      "Grade level",
      "Learning style",
      "Initial assessment",
      "Enrollment date",
      "Notes",
    ];

    const rows = this.currentStudents.map((student) => [
      student.first_name ?? "",
      student.last_name ?? "",
      student.email ?? "",
      student.student_id ?? "",
      student.grade_level ?? "",
      student.learning_style?.join("; ") ?? "",
      student.assessment_score ?? "",
      student.enrollment_date ?? "",
      student.notes ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((line) =>
        line
          .map((value) => {
            const text = value === null || value === undefined ? "" : String(value);
            return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `course-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.preview.appendActivity("Exported roster as CSV.");
  }

  private handleMissingCourseId(): void {
    this.preview.showFeedback("Save the course essentials first so we can link students to this course.", "warning");
    this.updateStatus("error", "Create the course before managing students.");
    document
      .querySelector<HTMLAnchorElement>(".aside__link[data-section='essentials']")
      ?.focus();
  }

  private async handleUpdateStudent(index: number, updates: Partial<StudentRecord>): Promise<void> {
    const student = this.currentStudents[index];
    if (!student || !student.id) {
      this.preview.showFeedback("Could not identify student to update.", "error");
      return;
    }

    this.updateStatus("saving", "Updating student…");
    const { error } = await this.repository.updateStudent(student.id, updates);

    if (error) {
      console.error("Failed to update student:", error);
      this.preview.showFeedback("Could not update student. Please try again.", "error");
      this.updateStatus("error", "Update failed");
      return;
    }

    this.currentStudents[index] = { ...student, ...updates };
    this.preview.showFeedback("Student updated successfully.", "success");
    this.updateStatus("saved");
    void this.refreshRoster();
  }

  private async handleDeleteStudent(index: number): Promise<void> {
    const student = this.currentStudents[index];
    if (!student || !student.id) {
      this.preview.showFeedback("Could not identify student to delete.", "error");
      return;
    }

    this.updateStatus("saving", "Deleting student…");
    const { error } = await this.repository.deleteStudent(student.id);

    if (error) {
      console.error("Failed to delete student:", error);
      this.preview.showFeedback("Could not delete student. Please try again.", "error");
      this.updateStatus("error", "Deletion failed");
      return;
    }

    this.currentStudents.splice(index, 1);
    this.preview.showFeedback("Student deleted successfully.", "success");
    this.preview.appendActivity("Student deleted.");
    this.updateStatus("saved");
    void this.refreshRoster();
  }
}

let studentsManager: StudentsManager | null = null;

export function ensureStudentsManager(courseId?: string | null): StudentsManager {
  if (!studentsManager) {
    studentsManager = new StudentsManager({ courseId });
  }
  studentsManager.init();
  if (courseId) {
    studentsManager.setCourseId(courseId);
  }
  return studentsManager;
}
