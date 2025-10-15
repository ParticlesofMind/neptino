import type { RosterSummary, StudentRecord } from "./studentsTypes.js";

function formatLearningStyle(styles?: string[] | null): string {
  if (!styles?.length) return "—";
  return styles.join(", ");
}

function formatAssessment(score?: number | null): string {
  if (score === null || score === undefined) return "—";
  return Number.isFinite(score) ? score.toString() : "—";
}

export class StudentsPreview {
  private readonly previewTable: HTMLTableSectionElement | null;
  private readonly emptyRow: HTMLTableRowElement | null;
  private readonly wrapper: HTMLElement | null;
  private readonly feedback: HTMLElement | null;
  private readonly totalEl: HTMLElement | null;
  private readonly gradesEl: HTMLElement | null;
  private readonly syncedEl: HTMLElement | null;
  private readonly statusEl: HTMLElement | null;
  private readonly activityList: HTMLElement | null;

  constructor() {
    this.previewTable = document.getElementById("students-preview-body") as HTMLTableSectionElement | null;
    this.emptyRow = document.getElementById("students-preview-empty") as HTMLTableRowElement | null;
    this.wrapper = document.querySelector(".students__table-wrapper");
    this.feedback = document.getElementById("students-feedback");
    this.totalEl = document.getElementById("students-count-total");
    this.gradesEl = document.getElementById("students-count-grades");
    this.syncedEl = document.getElementById("students-count-synced");
    this.statusEl = document.getElementById("students-status-text");
    this.activityList = document.getElementById("students-activity-list");
  }

  public render(students: StudentRecord[]): void {
    if (!this.previewTable) return;

    this.setBusy(true);
    this.previewTable.innerHTML = "";

    if (!students.length) {
      if (this.emptyRow) {
        this.emptyRow.removeAttribute("hidden");
        this.previewTable.appendChild(this.emptyRow);
      }
      this.setBusy(false);
      return;
    }

    students.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${student.first_name ?? "—"}</td>
        <td>${student.last_name ?? "—"}</td>
        <td>${student.email ?? "—"}</td>
        <td>${student.student_id ?? "—"}</td>
        <td>${student.grade_level ?? "—"}</td>
        <td>${formatLearningStyle(student.learning_style)}</td>
        <td>${formatAssessment(student.assessment_score)}</td>
      `;
      this.previewTable?.appendChild(row);
    });

    if (this.emptyRow) {
      this.emptyRow.setAttribute("hidden", "true");
    }

    this.setBusy(false);
  }

  public showFeedback(message: string, tone: "success" | "error" | "warning" = "success"): void {
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.hidden = false;
    this.feedback.dataset.state = tone;
  }

  public clearFeedback(): void {
    if (!this.feedback) return;
    this.feedback.hidden = true;
    this.feedback.textContent = "";
    delete this.feedback.dataset.state;
  }

  public updateSummary(summary: RosterSummary | null): void {
    if (!summary) return;
    if (this.totalEl) {
      this.totalEl.textContent = summary.total.toString();
    }
    if (this.gradesEl) {
      this.gradesEl.textContent = summary.gradeLevels.length
        ? summary.gradeLevels.join(", ")
        : "—";
    }
    if (this.syncedEl) {
      this.syncedEl.textContent = summary.synced.toString();
    }
    if (this.statusEl) {
      this.statusEl.textContent = summary.total
        ? "Roster is ready for Albert AI personalisation."
        : "No students imported yet. Upload a roster to get started.";
    }
  }

  public appendActivity(message: string): void {
    if (!this.activityList) return;
    const li = document.createElement("li");
    li.className = "students__activity-item";
    li.textContent = `${new Date().toLocaleString()}: ${message}`;

    const emptyItem = this.activityList.querySelector(".students__activity-item--empty");
    if (emptyItem) {
      emptyItem.remove();
    }

    this.activityList.prepend(li);
    while (this.activityList.childElementCount > 5) {
      this.activityList.lastElementChild?.remove();
    }
  }

  public clearActivity(): void {
    if (!this.activityList) return;
    this.activityList.innerHTML = `
      <li class="students__activity-item students__activity-item--empty">
        Nothing yet — uploads will appear here with timestamps and status.
      </li>
    `;
  }

  public clearPreview(): void {
    if (!this.previewTable) return;
    this.previewTable.innerHTML = "";
    if (this.emptyRow) {
      this.previewTable.appendChild(this.emptyRow);
      this.emptyRow.removeAttribute("hidden");
    }
  }

  public setBusy(isBusy: boolean): void {
    this.wrapper?.setAttribute("aria-busy", isBusy ? "true" : "false");
  }
}
