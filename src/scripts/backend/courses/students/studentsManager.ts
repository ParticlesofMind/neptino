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

  private async refreshRoster(showActivity = false): Promise<void> {
    this.preview.setBusy(true);
    const { data, error } = await this.repository.fetchRoster();
    const { data: summary } = await this.repository.fetchSummary();
    this.preview.setBusy(false);

    if (error) {
      console.error("Unable to load students roster:", error);
      this.preview.showFeedback("We could not load the student roster. Try refreshing the page.", "error");
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
    document
      .querySelector<HTMLAnchorElement>(".aside__link[data-section='essentials']")
      ?.focus();
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
